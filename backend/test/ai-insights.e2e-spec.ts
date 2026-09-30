import {
  ConsoleLogger,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import mqtt, { MqttClient } from 'mqtt';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';
import { poll } from './utils/poll';
import './utils/enable-ai-env';
import { AppModule } from './../src/app.module';

const MQTT_URL = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`;

describe('AI-Assisted Diagnostic Notes (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let mqttClient: MqttClient;
  let adminToken: string;
  let plantId: string;
  let locationId: string;
  let assetTypeId: string;
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(new ConsoleLogger({ logLevels: ['warn', 'error'] }));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: MQTT_URL,
        subscribeOptions: { qos: 1 },
      },
    });

    dataSource = moduleFixture.get(DataSource);

    await app.init();
    await app.startAllMicroservices();

    mqttClient = mqtt.connect(MQTT_URL);
    await new Promise<void>((resolve, reject) => {
      mqttClient.once('connect', () => resolve());
      mqttClient.once('error', reject);
    });

    adminToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.ADMIN,
        emailPrefix: 'ai-insights-e2e-admin',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `AI-insights-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `AI-insights-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `AI-insights-e2e Sensor ${tag}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await mqttClient.endAsync(true);
    await app.close();
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const createAsset = async (tagSuffix: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assetTypeId, locationId, tag: `PUMP-${tagSuffix}` })
      .expect(201);
    return res.body.id;
  };

  const publishHotReadings = (assetId: string, baseTime: number) => {
    const hotReadings = [0, 1, 2].map((n) => ({
      assetId,
      temperature: 82 + n,
      vibration: 2.2,
      pressure: 6.0,
      recordedAt: new Date(baseTime + n * 1000).toISOString(),
    }));
    for (const reading of hotReadings) {
      mqttClient.publish(
        `factory/${plantId}/asset/${assetId}/telemetry`,
        JSON.stringify(reading),
        { qos: 1 },
      );
    }
  };
  const getAutoWorkOrder = (assetId: string) =>
    poll(async () => {
      const res = await request(app.getHttpServer())
        .get(`/work-orders?assetId=${assetId}&source=AUTO`)
        .set('Authorization', `Bearer ${adminToken}`);
      return res.status === 200 && res.body.data.length > 0
        ? res.body.data[0]
        : null;
    });

  const getCriticalNotification = (assetId: string) =>
    poll(async () => {
      const res = await request(app.getHttpServer())
        .get(`/notifications?type=CRITICAL_ASSET&relatedEntityId=${assetId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      return res.status === 200 && res.body.data.length > 0
        ? res.body.data[0]
        : null;
    });

  it('attaches the mocked Groq note to the auto work order and the notification', async () => {
    const mockedNote = 'Possible bearing wear — check the pump seal first.';
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: mockedNote } }] }),
        { status: 200 },
      ),
    );

    const assetId = await createAsset(`ai-ok-${Date.now()}`);
    publishHotReadings(assetId, Date.now());

    console.log('ENV enabled =', process.env.AI_INSIGHTS_ENABLED);
    const workOrder = await getAutoWorkOrder(assetId);
    console.log('fetch calls =', fetchSpy.mock.calls.length);
    expect(workOrder.aiNote).toBe(mockedNote);

    const notification = await getCriticalNotification(assetId);
    expect(notification.aiNote).toBe(mockedNote);
  }, 20000);

  it('still creates the work order and notification, unchanged, when Groq fails — aiNote stays null', async () => {
    fetchSpy.mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const assetId = await createAsset(`ai-fail-${Date.now()}`);
    publishHotReadings(assetId, Date.now());

    const workOrder = await getAutoWorkOrder(assetId);
    expect(workOrder.status).toBe('OPEN');
    expect(workOrder.priority).toBe('CRITICAL');
    expect(workOrder.description).toContain('consecutive readings above');
    expect(workOrder.aiNote).toBeNull();

    const notification = await getCriticalNotification(assetId);
    expect(notification.status).toBe('UNREAD');
    expect(notification.message).toContain('consecutive readings above');
    expect(notification.aiNote).toBeNull();

    const rows = await dataSource.query(
      `SELECT status FROM assets WHERE id = $1`,
      [assetId],
    );
    expect(rows[0].status).toBe('CRITICAL');
  }, 20000);
});
