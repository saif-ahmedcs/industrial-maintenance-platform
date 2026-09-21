import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('MaintenancePlans (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let technicianToken: string;
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
    dataSource = moduleFixture.get(DataSource);
    await app.init();

    adminToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.ADMIN,
        emailPrefix: 'mp-e2e-admin',
      })
    ).accessToken;
    technicianToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.TECHNICIAN,
        emailPrefix: 'mp-e2e-tech',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `MP-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    const locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `MP-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    const assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `MP-e2e Pump ${tag}` })
        .expect(201)
    ).body.id;

    assetId = (
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetTypeId, locationId, tag: `MP-e2e-${tag}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests and blocks TECHNICIAN writes', async () => {
    await request(app.getHttpServer()).get('/maintenance-plans').expect(401);

    await request(app.getHttpServer())
      .post('/maintenance-plans')
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ assetId, name: 'Should be blocked', intervalDays: 30 })
      .expect(403);
  });

  it('walks the full CRUD lifecycle, preserving untouched fields on partial update', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/maintenance-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assetId, name: 'Quarterly Lubrication', intervalDays: 90 })
      .expect(201);

    const id = createRes.body.id;
    expect(createRes.body.assetId).toBe(assetId);
    expect(createRes.body.intervalDays).toBe(90);
    expect(createRes.body.active).toBe(true);
    // No explicit nextDueAt was sent, so the service must derive one instead
    // of leaving it null.
    expect(createRes.body.nextDueAt).not.toBeNull();

    // Regression check: an intervalDays-only PATCH must not clear `name`.
    const patchRes = await request(app.getHttpServer())
      .patch(`/maintenance-plans/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ intervalDays: 120 })
      .expect(200);
    expect(patchRes.body.intervalDays).toBe(120);
    expect(patchRes.body.name).toBe('Quarterly Lubrication');

    await request(app.getHttpServer())
      .delete(`/maintenance-plans/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/maintenance-plans/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('rejects a plan for a nonexistent asset', async () => {
    await request(app.getHttpServer())
      .post('/maintenance-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assetId: '00000000-0000-0000-0000-000000000000',
        name: 'Orphan plan',
        intervalDays: 30,
      })
      .expect(404);
  });

  it('paginates correctly: page 2 returns different records than page 1', async () => {
    const tag = `pg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post('/maintenance-plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetId, name: `${tag}-${i}`, intervalDays: 30 })
        .expect(201);
    }

    const page1 = await request(app.getHttpServer())
      .get('/maintenance-plans')
      .query({ page: 1, limit: 3, sortBy: 'plan.name', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const page2 = await request(app.getHttpServer())
      .get('/maintenance-plans')
      .query({ page: 2, limit: 3, sortBy: 'plan.name', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(page1.body.data).toHaveLength(3);
    expect(page2.body.data).toHaveLength(3);
    expect(page1.body.meta.total).toBeGreaterThanOrEqual(6);

    const page1Ids = page1.body.data.map((p: { id: string }) => p.id);
    const page2Ids = page2.body.data.map((p: { id: string }) => p.id);
    expect(page1Ids.filter((id: string) => page2Ids.includes(id))).toHaveLength(
      0,
    );
  });

  it('GET /maintenance-plans/due returns only active plans whose next_due_at has passed', async () => {
    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const nextYear = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const overdueId = (
      await request(app.getHttpServer())
        .post('/maintenance-plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assetId,
          name: `Overdue-${tag}`,
          intervalDays: 30,
          nextDueAt: yesterday,
        })
        .expect(201)
    ).body.id;

    const notYetDueId = (
      await request(app.getHttpServer())
        .post('/maintenance-plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assetId,
          name: `NotYetDue-${tag}`,
          intervalDays: 30,
          nextDueAt: nextYear,
        })
        .expect(201)
    ).body.id;

    const overdueButInactiveId = (
      await request(app.getHttpServer())
        .post('/maintenance-plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assetId,
          name: `OverdueInactive-${tag}`,
          intervalDays: 30,
          nextDueAt: yesterday,
          active: false,
        })
        .expect(201)
    ).body.id;

    const dueRes = await request(app.getHttpServer())
      .get('/maintenance-plans/due')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const dueIds = dueRes.body.data.map((p: { id: string }) => p.id);
    expect(dueIds).toContain(overdueId);
    expect(dueIds).not.toContain(notYetDueId);
    expect(dueIds).not.toContain(overdueButInactiveId);
  });
});
