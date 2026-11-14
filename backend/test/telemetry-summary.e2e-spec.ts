import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Telemetry Summary (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let assetOneId: string;
  let assetTwoId: string;
  let assetThreeId: string;

  const since = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const afterSince = [
    since,
    new Date(Date.parse(since) + 5 * 60 * 1000).toISOString(),
  ];
  const beforeSince = new Date(Date.parse(since) - 60 * 1000).toISOString();

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
    dataSource = moduleFixture.get(DataSource);
    await app.init();

    adminToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.ADMIN,
        emailPrefix: 'telemetry-summary-e2e-admin',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Telemetry-summary-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    const locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `Telemetry-summary-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    const assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Telemetry-summary-e2e Sensor ${tag}` })
        .expect(201)
    ).body.id;

    const createAsset = async (suffix: string): Promise<string> =>
      (
        await request(app.getHttpServer())
          .post('/assets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ assetTypeId, locationId, tag: `PUMP-${tag}-${suffix}` })
          .expect(201)
      ).body.id;

    assetOneId = await createAsset('1');
    assetTwoId = await createAsset('2');
    assetThreeId = await createAsset('3');

    const insertReading = (assetId: string, recordedAt: string) =>
      dataSource.query(
        `INSERT INTO telemetry_readings (asset_id, temperature, vibration, pressure, recorded_at)
         VALUES ($1, 50, 2, 6, $2)`,
        [assetId, recordedAt],
      );

    await insertReading(assetOneId, afterSince[0]);
    await insertReading(assetOneId, afterSince[1]);
    await insertReading(assetTwoId, afterSince[0]);
    await insertReading(assetTwoId, afterSince[1]);
    await insertReading(assetTwoId, afterSince[1]);
    await insertReading(assetOneId, beforeSince);
    await insertReading(assetThreeId, beforeSince);
  });

  afterAll(async () => {
    await app.close();
  });

  const getSummary = (query: Record<string, string>) =>
    request(app.getHttpServer())
      .get('/telemetry/summary')
      .query(query)
      .set('Authorization', `Bearer ${adminToken}`);

  it('counts readings and distinct assets at/after since, matching the known fixture', async () => {
    const res = await getSummary({ since }).expect(200);

    expect(res.body).toEqual({
      readingCount: 5,
      assetCount: 2,
      since,
    });
  });

  it('excludes readings strictly before since (boundary is inclusive)', async () => {
    const justAfterFixture = new Date(
      Date.parse(afterSince[1]) + 1000,
    ).toISOString();

    const res = await getSummary({ since: justAfterFixture }).expect(200);

    expect(res.body.readingCount).toBe(0);
    expect(res.body.assetCount).toBe(0);
  });

  it('returns 400 when since is missing', async () => {
    await getSummary({}).expect(400);
  });

  it.each(['not-a-date', '2026-13-40', ''])(
    'returns 400 when since is invalid (%p)',
    async (invalidSince) => {
      await getSummary({ since: invalidSince }).expect(400);
    },
  );

  it('returns 401 without a bearer token', async () => {
    await request(app.getHttpServer())
      .get('/telemetry/summary')
      .query({ since })
      .expect(401);
  });
});
