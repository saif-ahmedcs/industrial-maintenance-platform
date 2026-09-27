import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import mqtt, { MqttClient } from 'mqtt';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';
import { poll } from './utils/poll';

const MQTT_URL = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`;

describe('Condition Monitoring — hot-temperature rule (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let mqttClient: MqttClient;
  let adminToken: string;
  let plantId: string;
  let assetId: string;

  // Shared between the two tests below: the second test's readings continue
  // straight on from the first test's, on the same already-CRITICAL asset.
  let baseTime: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Same real MQTT hybrid transport main.ts runs in production, and the
    // same real BullMQ worker registered by ConditionMonitoringModule — no
    // mocked-out stand-ins for either.
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
        emailPrefix: 'condition-monitoring-e2e-admin',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Condition-monitoring-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    const locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `Condition-monitoring-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    const assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Condition-monitoring-e2e Sensor ${tag}` })
        .expect(201)
    ).body.id;

    assetId = (
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetTypeId, locationId, tag: `PUMP-${tag}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await mqttClient.endAsync(true);
    await app.close();
  });

  const topic = () => `factory/${plantId}/asset/${assetId}/telemetry`;

  const getLatest = () =>
    request(app.getHttpServer())
      .get(`/assets/${assetId}/telemetry/latest`)
      .set('Authorization', `Bearer ${adminToken}`);

  const getAsset = () =>
    request(app.getHttpServer())
      .get(`/assets/${assetId}`)
      .set('Authorization', `Bearer ${adminToken}`);

  const getAutoWorkOrders = () =>
    request(app.getHttpServer())
      .get(`/work-orders?assetId=${assetId}&source=AUTO`)
      .set('Authorization', `Bearer ${adminToken}`);

  const getCriticalNotifications = () =>
    request(app.getHttpServer())
      .get(`/notifications?type=CRITICAL_ASSET&relatedEntityId=${assetId}`)
      .set('Authorization', `Bearer ${adminToken}`);

  it('marks the asset CRITICAL, opens an AUTO work order, and raises a CRITICAL_ASSET notification after 3 consecutive hot readings over real MQTT', async () => {
    baseTime = Date.now();
    const hotReadings = [0, 1, 2].map((n) => ({
      assetId,
      temperature: 82 + n,
      vibration: 2.2,
      pressure: 6.0,
      recordedAt: new Date(baseTime + n * 1000).toISOString(),
    }));

    for (const reading of hotReadings) {
      mqttClient.publish(topic(), JSON.stringify(reading), { qos: 1 });
    }

    const asset = await poll(async () => {
      const res = await getAsset();
      return res.status === 200 && res.body.status === 'CRITICAL'
        ? res.body
        : null;
    });
    expect(asset.status).toBe('CRITICAL');

    const workOrder = await poll(async () => {
      const res = await getAutoWorkOrders();
      return res.status === 200 && res.body.data.length > 0
        ? res.body.data[0]
        : null;
    });
    expect(workOrder.status).toBe('OPEN');
    expect(workOrder.priority).toBe('CRITICAL');
    expect(workOrder.assetId).toBe(assetId);

    const notification = await poll(async () => {
      const res = await getCriticalNotifications();
      return res.status === 200 && res.body.data.length > 0
        ? res.body.data[0]
        : null;
    });
    expect(notification.status).toBe('UNREAD');
    expect(notification.relatedEntityId).toBe(assetId);

    // Confirm the asset really flipped in Postgres, not just in the API
    // response — same durability check telemetry.e2e-spec.ts does.
    const rows = await dataSource.query(
      `SELECT status FROM assets WHERE id = $1`,
      [assetId],
    );
    expect(rows[0].status).toBe('CRITICAL');
  }, 20000);

  it('does not open a second AUTO work order or a second notification for further hot readings once one already exists', async () => {
    // Continues straight on from the previous test: same asset, already
    // CRITICAL with one open AUTO work order. Readings #4 and #5 are still
    // hot — the "unless an active auto work order already exists" check
    // should short-circuit both, exactly the scenario Phase 10 calls out.
    const moreHotReadings = [3, 4].map((n) => ({
      assetId,
      temperature: 85,
      vibration: 2.4,
      pressure: 6.1,
      recordedAt: new Date(baseTime + n * 1000).toISOString(),
    }));

    for (const reading of moreHotReadings) {
      mqttClient.publish(topic(), JSON.stringify(reading), { qos: 1 });
    }

    // Wait for the last reading to actually land, then give the queue
    // consumer a moment to process it, before asserting nothing new appeared.
    await poll(async () => {
      const res = await getLatest();
      return res.status === 200 &&
        res.body.recordedAt === moreHotReadings[1].recordedAt
        ? res.body
        : null;
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const workOrders = await getAutoWorkOrders().expect(200);
    expect(workOrders.body.data).toHaveLength(1);

    const notifications = await getCriticalNotifications().expect(200);
    expect(notifications.body.data).toHaveLength(1);
  }, 20000);
});
