import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import mqtt, { MqttClient } from 'mqtt';
import Redis from 'ioredis';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { REDIS_CLIENT } from './../src/redis/redis.module';
import { registerAndLogin } from './utils/register-and-login';

const MQTT_URL = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`;

/**
 * Polls `fn` until it returns a truthy value or `timeoutMs` elapses.
 * Used throughout this file because MQTT ingestion is asynchronous:
 * a publish returns immediately, well before the message has been
 * validated, cached and persisted on the consumer side.
 */
async function poll<T>(
  fn: () => Promise<T | null>,
  {
    timeoutMs = 8000,
    intervalMs = 200,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await fn();
    if (result) {
      return result;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

describe('Telemetry MQTT Pipeline (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let redis: Redis;
  let mqttClient: MqttClient;
  let adminToken: string;
  let plantId: string;
  let assetId: string;

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

    // Attach the same MQTT hybrid transport main.ts runs in production, so
    // this test proves the real @EventPattern handler works end to end —
    // not a mocked stand-in for it.
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: MQTT_URL,
        subscribeOptions: { qos: 1 },
      },
    });

    dataSource = moduleFixture.get(DataSource);
    redis = moduleFixture.get(REDIS_CLIENT);

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
        emailPrefix: 'telemetry-e2e-admin',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Telemetry-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    const locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `Telemetry-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    const assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Telemetry-e2e Sensor ${tag}` })
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

  it('ingests a reading published over real MQTT into both Redis and Postgres', async () => {
    const reading = {
      assetId,
      temperature: 61.4,
      vibration: 2.1,
      pressure: 5.9,
      recordedAt: new Date().toISOString(),
    };

    mqttClient.publish(topic(), JSON.stringify(reading), { qos: 1 });

    const latest = await poll(async () => {
      const res = await getLatest();
      return res.status === 200 && res.body.temperature === reading.temperature
        ? res.body
        : null;
    });

    expect(latest.assetId).toBe(assetId);
    expect(latest.temperature).toBe(reading.temperature);

    // Confirm it's really sitting in Redis — not just served via the
    // Postgres fallback path exercised by the third test below.
    const cached = await redis.get(`telemetry:latest:${assetId}`);
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached as string).temperature).toBe(reading.temperature);

    // Confirm it's really durably persisted in Postgres, not just cached.
    const rows = await dataSource.query(
      `SELECT temperature FROM telemetry_readings WHERE asset_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [assetId],
    );
    expect(Number(rows[0].temperature)).toBe(reading.temperature);
  }, 20000);

  it('drops a malformed payload without crashing the handler, and still processes the next valid reading', async () => {
    const malformed = {
      assetId: 'not-a-real-uuid',
      temperature: 'hot',
      vibration: -999,
      pressure: 999999,
    };

    mqttClient.publish(topic(), JSON.stringify(malformed), { qos: 1 });

    // Give the rejected message a moment to be handled by the (still-alive)
    // consumer before proving it's still alive with a valid reading.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const validReading = {
      assetId,
      temperature: 63.2,
      vibration: 2.3,
      pressure: 6.0,
      recordedAt: new Date().toISOString(),
    };
    mqttClient.publish(topic(), JSON.stringify(validReading), { qos: 1 });

    const latest = await poll(async () => {
      const res = await getLatest();
      return res.status === 200 &&
        res.body.temperature === validReading.temperature
        ? res.body
        : null;
    });

    expect(latest.temperature).toBe(validReading.temperature);
  }, 20000);

  it('falls back to Postgres for GET /latest when the Redis cache is empty', async () => {
    const reading = {
      assetId,
      temperature: 58.7,
      vibration: 2.0,
      pressure: 5.8,
      recordedAt: new Date().toISOString(),
    };

    mqttClient.publish(topic(), JSON.stringify(reading), { qos: 1 });

    // Wait for the durable side-effect (Postgres), not just the cache.
    await poll(async () => {
      const rows = await dataSource.query(
        `SELECT 1 FROM telemetry_readings WHERE asset_id = $1 AND temperature = $2`,
        [assetId, reading.temperature],
      );
      return rows.length > 0 ? rows : null;
    });

    // Simulate a cold cache for this asset — proves flushing Redis loses
    // only read speed, never the data itself.
    await redis.del(`telemetry:latest:${assetId}`);

    const res = await getLatest().expect(200);
    expect(res.body.temperature).toBe(reading.temperature);
  }, 20000);
});
