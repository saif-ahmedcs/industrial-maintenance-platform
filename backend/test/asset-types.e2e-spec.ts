import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('AssetTypes (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let viewerToken: string;

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
        emailPrefix: 'asset-types-e2e-admin',
      })
    ).accessToken;
    viewerToken = (
      await registerAndLogin(app, dataSource, {
        emailPrefix: 'asset-types-e2e-viewer',
      })
    ).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests and blocks VIEWER writes', async () => {
    await request(app.getHttpServer()).get('/asset-types').expect(401);

    await request(app.getHttpServer())
      .post('/asset-types')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Should be blocked' })
      .expect(403);
  });

  it('walks the full CRUD lifecycle, preserving untouched fields on partial update', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/asset-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Centrifugal Pump', category: 'Rotating equipment' })
      .expect(201);

    const id = createRes.body.id;
    expect(createRes.body.category).toBe('Rotating equipment');

    // Regression check: a name-only PATCH must not clear `category`.
    const patchRes = await request(app.getHttpServer())
      .patch(`/asset-types/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Centrifugal Pump (Renamed)' })
      .expect(200);
    expect(patchRes.body.name).toBe('Centrifugal Pump (Renamed)');
    expect(patchRes.body.category).toBe('Rotating equipment');

    await request(app.getHttpServer())
      .delete(`/asset-types/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/asset-types/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('paginates correctly: page 2 returns different records than page 1', async () => {
    const tag = `pg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `${tag}-${i}` })
        .expect(201);
    }

    const page1 = await request(app.getHttpServer())
      .get('/asset-types')
      .query({ page: 1, limit: 3, sortBy: 'assetType.name', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const page2 = await request(app.getHttpServer())
      .get('/asset-types')
      .query({ page: 2, limit: 3, sortBy: 'assetType.name', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(page1.body.data).toHaveLength(3);
    expect(page2.body.data).toHaveLength(3);
    expect(page1.body.meta.total).toBeGreaterThanOrEqual(6);

    const page1Ids = page1.body.data.map((a: { id: string }) => a.id);
    const page2Ids = page2.body.data.map((a: { id: string }) => a.id);
    expect(page1Ids.filter((id: string) => page2Ids.includes(id))).toHaveLength(
      0,
    );
  });
});
