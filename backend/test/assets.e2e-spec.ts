import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Assets (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let viewerToken: string;
  let locationId: string;
  let assetTypeId: string;

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
        emailPrefix: 'assets-e2e-admin',
      })
    ).accessToken;
    viewerToken = (
      await registerAndLogin(app, dataSource, {
        emailPrefix: 'assets-e2e-viewer',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Assets-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `Assets-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Assets-e2e Pump ${tag}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const newTag = () => `TAG-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  it('rejects unauthenticated requests and blocks VIEWER writes', async () => {
    await request(app.getHttpServer()).get('/assets').expect(401);

    await request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ assetTypeId, locationId, tag: newTag() })
      .expect(403);
  });

  it('rejects creating an asset under a nonexistent asset type or location', async () => {
    await request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assetTypeId: '00000000-0000-0000-0000-000000000000',
        locationId,
        tag: newTag(),
      })
      .expect(404);

    await request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assetTypeId,
        locationId: '00000000-0000-0000-0000-000000000000',
        tag: newTag(),
      })
      .expect(404);
  });

  it('rejects a duplicate tag', async () => {
    const tag = newTag();
    await request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assetTypeId, locationId, tag })
      .expect(201);

    await request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assetTypeId, locationId, tag })
      .expect(409);
  });

  it('walks the full CRUD lifecycle, defaulting status/criticality and preserving untouched fields on partial update', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assetTypeId,
        locationId,
        tag: newTag(),
        manufacturer: 'Acme Pumps',
        model: 'AP-100',
      })
      .expect(201);

    const id = createRes.body.id;
    expect(createRes.body.status).toBe('OPERATIONAL');
    expect(createRes.body.criticality).toBe('MEDIUM');
    expect(createRes.body.manufacturer).toBe('Acme Pumps');

    const patchRes = await request(app.getHttpServer())
      .patch(`/assets/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ model: 'AP-200' })
      .expect(200);
    expect(patchRes.body.model).toBe('AP-200');
    expect(patchRes.body.manufacturer).toBe('Acme Pumps');

    await request(app.getHttpServer())
      .delete(`/assets/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/assets/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('changes status through the dedicated endpoint and leaves exactly one correctly-valued audit row', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assetTypeId, locationId, tag: newTag() })
      .expect(201);
    const id = createRes.body.id;
    expect(createRes.body.status).toBe('OPERATIONAL');

    // A regular PATCH /assets/:id must not be able to change status.
    await request(app.getHttpServer())
      .patch(`/assets/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CRITICAL' })
      .expect(400);

    const statusRes = await request(app.getHttpServer())
      .patch(`/assets/${id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CRITICAL' })
      .expect(200);
    expect(statusRes.body.status).toBe('CRITICAL');

    // VIEWER cannot change status either.
    await request(app.getHttpServer())
      .patch(`/assets/${id}/status`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'OPERATIONAL' })
      .expect(403);

    const auditRes = await request(app.getHttpServer())
      .get('/audit')
      .query({ entityId: id })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const statusChangeRows = auditRes.body.data.filter(
      (row: { action: string }) => row.action === 'STATUS_CHANGE',
    );
    expect(statusChangeRows).toHaveLength(1);
    expect(statusChangeRows[0]).toMatchObject({
      entityType: 'Asset',
      entityId: id,
      action: 'STATUS_CHANGE',
      before: { status: 'OPERATIONAL' },
      after: { status: 'CRITICAL' },
    });
  });

  it('paginates correctly: page 2 returns different records than page 1', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetTypeId, locationId, tag: newTag() })
        .expect(201);
    }

    const page1 = await request(app.getHttpServer())
      .get('/assets')
      .query({ page: 1, limit: 3, sortBy: 'asset.tag', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const page2 = await request(app.getHttpServer())
      .get('/assets')
      .query({ page: 2, limit: 3, sortBy: 'asset.tag', sortDir: 'ASC' })
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
