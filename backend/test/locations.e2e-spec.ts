import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Locations (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let viewerToken: string;
  let plantAId: string;
  let plantBId: string;

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
        emailPrefix: 'locations-e2e-admin',
      })
    ).accessToken;
    viewerToken = (
      await registerAndLogin(app, dataSource, {
        emailPrefix: 'locations-e2e-viewer',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    plantAId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Locations-e2e Plant A ${tag}` })
        .expect(201)
    ).body.id;

    plantBId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Locations-e2e Plant B ${tag}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests and blocks VIEWER writes', async () => {
    await request(app.getHttpServer()).get('/locations').expect(401);

    await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ plantId: plantAId, name: 'Should be blocked' })
      .expect(403);
  });

  it('rejects creating a location under a plant that does not exist', async () => {
    await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plantId: '00000000-0000-0000-0000-000000000000',
        name: 'Orphan',
      })
      .expect(404);
  });

  it('rejects a parent location that belongs to a different plant', async () => {
    const parentRes = await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plantId: plantAId, name: 'Parent in A' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plantId: plantBId,
        name: 'Child claiming a parent in A',
        parentLocationId: parentRes.body.id,
      })
      .expect(400);
  });

  it('walks the full CRUD lifecycle, preserving untouched fields on partial update', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plantId: plantAId, name: 'Area 1' })
      .expect(201);
    const id = createRes.body.id;
    expect(createRes.body.plantId).toBe(plantAId);
    expect(createRes.body.parentLocationId).toBeNull();

    const childRes = await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plantId: plantAId,
        name: 'Area 1 - Sub Zone',
        parentLocationId: id,
      })
      .expect(201);
    expect(childRes.body.parentLocationId).toBe(id);

    const patchRes = await request(app.getHttpServer())
      .patch(`/locations/${childRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Area 1 - Sub Zone (Renamed)' })
      .expect(200);
    expect(patchRes.body.name).toBe('Area 1 - Sub Zone (Renamed)');
    expect(patchRes.body.parentLocationId).toBe(id);

    await request(app.getHttpServer())
      .delete(`/locations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/locations/${childRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/locations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('rejects a location being set as its own parent', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plantId: plantAId, name: 'Self-parent test' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/locations/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentLocationId: createRes.body.id })
      .expect(400);
  });

  it('allows detaching a location from its parent via parentLocationId: null', async () => {
    const parentRes = await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plantId: plantAId, name: 'Detach-parent test parent' })
      .expect(201);

    const childRes = await request(app.getHttpServer())
      .post('/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plantId: plantAId,
        name: 'Detach-parent test child',
        parentLocationId: parentRes.body.id,
      })
      .expect(201);

    const detachRes = await request(app.getHttpServer())
      .patch(`/locations/${childRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentLocationId: null })
      .expect(200);

    expect(detachRes.body.parentLocationId).toBeNull();
  });

  it('paginates correctly: page 2 returns different records than page 1', async () => {
    const tag = `pg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId: plantAId, name: `${tag}-${i}` })
        .expect(201);
    }

    const page1 = await request(app.getHttpServer())
      .get('/locations')
      .query({ page: 1, limit: 3, sortBy: 'location.name', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const page2 = await request(app.getHttpServer())
      .get('/locations')
      .query({ page: 2, limit: 3, sortBy: 'location.name', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(page1.body.data).toHaveLength(3);
    expect(page2.body.data).toHaveLength(3);
    expect(page1.body.meta.total).toBeGreaterThanOrEqual(6);

    const page1Ids = page1.body.data.map((l: { id: string }) => l.id);
    const page2Ids = page2.body.data.map((l: { id: string }) => l.id);
    expect(page1Ids.filter((id: string) => page2Ids.includes(id))).toHaveLength(
      0,
    );
  });
});
