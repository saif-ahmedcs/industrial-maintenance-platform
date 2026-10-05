import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MicroserviceOptions } from '@nestjs/microservices';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { MqttClient } from 'mqtt';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { CorrelatedLogger } from './../src/common/logger/correlated-logger';
import { registerAndLogin } from './utils/register-and-login';
import { poll } from './utils/poll';
import {
  backendMqttMicroserviceOptions,
  connectAsSimulator,
} from './utils/mqtt';

describe('Observability — correlation id threading (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let mqttClient: MqttClient;
  let adminToken: string;
  let plantId: string;
  let assetId: string;

  const capturedLogs: string[] = [];
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(new CorrelatedLogger());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.connectMicroservice<MicroserviceOptions>(
      backendMqttMicroserviceOptions(),
    );

    dataSource = moduleFixture.get(DataSource);

    await app.init();
    await app.startAllMicroservices();

    const rawStdoutWrite = process.stdout.write.bind(process.stdout);
    const rawStderrWrite = process.stderr.write.bind(process.stderr);
    stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: any, ...args: any[]) => {
        capturedLogs.push(chunk.toString());
        return (rawStdoutWrite as any)(chunk, ...args);
      });
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: any, ...args: any[]) => {
        capturedLogs.push(chunk.toString());
        return (rawStderrWrite as any)(chunk, ...args);
      });

    mqttClient = await connectAsSimulator();

    adminToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.ADMIN,
        emailPrefix: 'observability-e2e-admin',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Observability-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    const locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `Observability-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    const assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Observability-e2e Sensor ${tag}` })
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
    stdoutSpy?.mockRestore();
    stderrSpy?.mockRestore();
    await mqttClient.endAsync(true);
    await app.close();
  });

  const topic = () => `factory/${plantId}/asset/${assetId}/telemetry`;

  const getAutoWorkOrders = () =>
    request(app.getHttpServer())
      .get(`/work-orders?assetId=${assetId}&source=AUTO`)
      .set('Authorization', `Bearer ${adminToken}`);

  it('threads a single correlation id through ingest -> queue -> worker -> work order', async () => {
    const baseTime = Date.now();
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

    const workOrder = await poll(async () => {
      const res = await getAutoWorkOrders();
      return res.status === 200 && res.body.data.length > 0
        ? res.body.data[0]
        : null;
    });
    expect(workOrder.assetId).toBe(assetId);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const logText = capturedLogs.join('');
    const id = '[0-9a-f-]{36}';

    const ingestIds = [
      ...logText.matchAll(
        new RegExp(
          `\\[(${id})\\] Ingesting telemetry reading for asset ${assetId}`,
          'g',
        ),
      ),
    ].map((m) => m[1]);

    const workerIds = [
      ...logText.matchAll(
        new RegExp(
          `\\[(${id})\\] Picked up telemetry job \\S+ for asset ${assetId}`,
          'g',
        ),
      ),
    ].map((m) => m[1]);

    const criticalLine = logText.match(
      new RegExp(
        `\\[(${id})\\] Condition monitoring: asset \\S+ \\(${assetId}\\) marked CRITICAL, work order (${id}) opened`,
      ),
    );

    expect(ingestIds).toHaveLength(3);
    expect(new Set(ingestIds).size).toBe(3);
    expect(workerIds.length).toBeGreaterThanOrEqual(3);
    expect(criticalLine).not.toBeNull();
    const triggeringId = criticalLine![1];
    expect(criticalLine![2]).toBe(workOrder.id);
    expect(ingestIds).toContain(triggeringId);
    expect(workerIds).toContain(triggeringId);
  }, 20000);
});
