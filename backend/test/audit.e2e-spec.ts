import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { AuditService } from './../src/audit/audit.service';

describe('Audit (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let auditService: AuditService;

  const adminEmail = `audit-e2e-admin-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = 'CorrectHorseBattery9!';
  let adminAccessToken: string;

  const entityId = randomUUID();
  const secondEntityId = randomUUID();
  let adminUserId: string;

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
    auditService = moduleFixture.get(AuditService);
    await app.init();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password })
      .expect(201);

    await dataSource.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT u.id, r.id FROM users u, roles r
       WHERE u.email = $1 AND r.name = 'ADMIN'
       ON CONFLICT DO NOTHING`,
      [adminEmail],
    );

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminAccessToken = loginRes.body.accessToken;

    const [{ id: adminId }] = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      [adminEmail],
    );
    adminUserId = adminId;

    await dataSource.transaction((manager) =>
      auditService.record(manager, {
        actorUserId: null,
        entityType: 'Asset',
        entityId,
        action: 'CREATE',
        before: null,
        after: { status: 'ACTIVE' },
        source: 'e2e-test-setup',
      }),
    );

    await dataSource.transaction((manager) =>
      auditService.record(manager, {
        actorUserId: adminUserId,
        entityType: 'WorkOrder',
        entityId: secondEntityId,
        action: 'FILTER_TEST_ACTION',
        before: null,
        after: { status: 'COMPLETED' },
        source: 'filter-test-source',
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets an ADMIN read the audit trail, filtered by entityId', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit')
      .query({ entityId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].entityType).toBe('Asset');
    expect(res.body.data[0].source).toBe('e2e-test-setup');
  });

  it('filters by actorUserId', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit')
      .query({ actorUserId: adminUserId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].entityId).toBe(secondEntityId);
  });

  it('filters by action', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit')
      .query({ action: 'FILTER_TEST_ACTION' })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].entityId).toBe(secondEntityId);
  });

  it('filters by source', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit')
      .query({ source: 'filter-test-source' })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].entityId).toBe(secondEntityId);
  });

  it('combines filters with AND semantics', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit')
      .query({ entityId: secondEntityId, action: 'CREATE' })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.meta.total).toBe(0);
  });

  it('blocks a VIEWER (the default role on registration) from reading the audit trail', async () => {
    const viewerEmail = `audit-e2e-viewer-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: viewerEmail, password })
      .expect(201);

    const viewerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: viewerEmail, password })
      .expect(200);

    await request(app.getHttpServer())
      .get('/audit')
      .set('Authorization', `Bearer ${viewerLogin.body.accessToken}`)
      .expect(403);
  });

  it('rejects requests with no token at all', async () => {
    await request(app.getHttpServer()).get('/audit').expect(401);
  });

  it('exposes no route to update or delete an audit row', async () => {
    await request(app.getHttpServer())
      .patch('/audit')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ source: 'tampered' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/audit/${entityId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);
  });

  it('rejects a direct SQL mutation against audit_logs at the database level', async () => {
    await expect(
      dataSource.query(
        `UPDATE audit_logs SET source = 'tampered' WHERE entity_id = $1`,
        [entityId],
      ),
    ).rejects.toThrow(/append-only/);

    await expect(
      dataSource.query(`DELETE FROM audit_logs WHERE entity_id = $1`, [
        entityId,
      ]),
    ).rejects.toThrow(/append-only/);

    const rows = await dataSource.query(
      `SELECT source FROM audit_logs WHERE entity_id = $1`,
      [entityId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('e2e-test-setup');
  });
});
