import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

// POST /auth/login is throttled to 5 requests/minute per IP, and the whole
// file shares one IP. The three fixture sessions below are therefore minted
// directly (mintToken) so that only the tests that genuinely exercise login
// with a temporary password spend that budget.
describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let viewerToken: string;

  const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const uniqueEmail = (prefix: string) => `${prefix}-${tag}@example.com`;

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
        emailPrefix: `users-e2e-admin-${tag}`,
        mintToken: true,
      })
    ).accessToken;
    viewerToken = (
      await registerAndLogin(app, dataSource, {
        emailPrefix: `users-e2e-viewer-${tag}`,
        mintToken: true,
      })
    ).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authorization', () => {
    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('blocks a non-admin (VIEWER) from every endpoint', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          email: uniqueEmail('blocked'),
          name: 'Should be blocked',
          roles: [RoleName.VIEWER],
        })
        .expect(403);
    });
  });

  describe('POST /users', () => {
    it('creates a user, returns a temporary password once, and the user can log in with it', async () => {
      const email = uniqueEmail('created');

      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, name: 'Jordan Reyes', roles: [RoleName.SUPERVISOR] })
        .expect(201);

      expect(createRes.body.email).toBe(email);
      expect(createRes.body.name).toBe('Jordan Reyes');
      expect(createRes.body.roles).toEqual([RoleName.SUPERVISOR]);
      expect(createRes.body.isActive).toBe(true);
      const temporaryPassword: string = createRes.body.temporaryPassword;
      expect(temporaryPassword).toHaveLength(16);

      const [row] = await dataSource.query(
        `SELECT password_hash FROM users WHERE email = $1`,
        [email],
      );
      expect(row.password_hash).not.toBe(temporaryPassword);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: temporaryPassword })
        .expect(200);
    });

    it('rejects a duplicate email with 409', async () => {
      const email = uniqueEmail('dup');
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, name: 'First', roles: [RoleName.VIEWER] })
        .expect(201);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, name: 'Second', roles: [RoleName.VIEWER] })
        .expect(409);
    });

    it('rejects a missing name or an empty roles array with 400', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: uniqueEmail('no-name'), roles: [RoleName.VIEWER] })
        .expect(400);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: uniqueEmail('no-roles'), name: 'No Roles', roles: [] })
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('filters by role and by active state', async () => {
      const email = uniqueEmail('filter-target');
      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, name: 'Filter Target', roles: [RoleName.TECHNICIAN] })
        .expect(201);
      const id = createRes.body.id;

      const byRole = await request(app.getHttpServer())
        .get('/users')
        .query({ role: RoleName.TECHNICIAN, limit: 100 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(byRole.body.data.some((u: { id: string }) => u.id === id)).toBe(
        true,
      );
      expect(
        byRole.body.data.every((u: { roles: string[] }) =>
          u.roles.includes(RoleName.TECHNICIAN),
        ),
      ).toBe(true);

      await request(app.getHttpServer())
        .patch(`/users/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(200);

      const byActiveFalse = await request(app.getHttpServer())
        .get('/users')
        .query({ active: false, limit: 100 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        byActiveFalse.body.data.some((u: { id: string }) => u.id === id),
      ).toBe(true);

      const byActiveTrue = await request(app.getHttpServer())
        .get('/users')
        .query({ active: true, limit: 100 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        byActiveTrue.body.data.some((u: { id: string }) => u.id === id),
      ).toBe(false);
    });
  });

  describe('PATCH /users/:id', () => {
    it('updates the name', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail('rename'),
          name: 'Before',
          roles: [RoleName.VIEWER],
        })
        .expect(201);

      const patchRes = await request(app.getHttpServer())
        .patch(`/users/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'After' })
        .expect(200);

      expect(patchRes.body.name).toBe('After');
    });

    it('returns 404 for an unknown user', async () => {
      await request(app.getHttpServer())
        .patch('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nobody' })
        .expect(404);
    });

    it('deactivating a user revokes all of their refresh tokens, and they can no longer log in', async () => {
      const email = uniqueEmail('deactivate-me');
      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, name: 'Deactivate Me', roles: [RoleName.VIEWER] })
        .expect(201);
      const temporaryPassword = createRes.body.temporaryPassword;

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: temporaryPassword })
        .expect(200);
      const { refreshToken } = loginRes.body;

      await request(app.getHttpServer())
        .patch(`/users/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: temporaryPassword })
        .expect(401);
    });
  });

  describe('PUT /users/:id/roles', () => {
    it('replaces the role set', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail('reroles'),
          name: 'Re Roles',
          roles: [RoleName.VIEWER],
        })
        .expect(201);

      const putRes = await request(app.getHttpServer())
        .put(`/users/${createRes.body.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: [RoleName.SUPERVISOR, RoleName.TECHNICIAN] })
        .expect(200);

      expect([...putRes.body.roles].sort()).toEqual(
        [RoleName.SUPERVISOR, RoleName.TECHNICIAN].sort(),
      );
    });

    it('returns 404 for an unknown user and 400 for an invalid role name', async () => {
      await request(app.getHttpServer())
        .put('/users/00000000-0000-0000-0000-000000000000/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: [RoleName.VIEWER] })
        .expect(404);

      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail('bad-role'),
          name: 'Bad Role',
          roles: [RoleName.VIEWER],
        })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/users/${createRes.body.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['NOT_A_REAL_ROLE'] })
        .expect(400);
    });
  });

  describe('last-active-admin guard (B2.5)', () => {
    it('blocks the sole active admin from deactivating or de-roling themselves, and allows it once another admin is active', async () => {
      const loneAdminToken = (
        await registerAndLogin(app, dataSource, {
          role: RoleName.ADMIN,
          emailPrefix: `users-e2e-lone-admin-${tag}`,
          mintToken: true,
        })
      ).accessToken;
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loneAdminToken}`)
        .expect(200);
      const loneAdminId = meRes.body.id;

      const others: { id: string }[] = await dataSource.query(
        `SELECT u.id FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.name = 'ADMIN' AND u.is_active = true AND u.id != $1`,
        [loneAdminId],
      );
      const otherIds = others.map((row) => row.id);
      if (otherIds.length > 0) {
        await dataSource.query(
          `UPDATE users SET is_active = false WHERE id = ANY($1)`,
          [otherIds],
        );
      }

      try {
        const deactivateRes = await request(app.getHttpServer())
          .patch(`/users/${loneAdminId}`)
          .set('Authorization', `Bearer ${loneAdminToken}`)
          .send({ active: false })
          .expect(409);
        expect(deactivateRes.body.message).toMatch(
          /at least one active admin is required/i,
        );

        await request(app.getHttpServer())
          .put(`/users/${loneAdminId}/roles`)
          .set('Authorization', `Bearer ${loneAdminToken}`)
          .send({ roles: [RoleName.VIEWER] })
          .expect(409);

        const [row] = await dataSource.query(
          `SELECT is_active FROM users WHERE id = $1`,
          [loneAdminId],
        );
        expect(row.is_active).toBe(true);
      } finally {
        if (otherIds.length > 0) {
          await dataSource.query(
            `UPDATE users SET is_active = true WHERE id = ANY($1)`,
            [otherIds],
          );
        }
      }

      // Positive control: with another admin active again, the same
      // deactivation succeeds.
      await request(app.getHttpServer())
        .patch(`/users/${loneAdminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(200);
    });
  });

  describe('audit trail (B2.7)', () => {
    it('writes a CREATE audit entry for a newly created user', async () => {
      const email = uniqueEmail('audited');
      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, name: 'Audited User', roles: [RoleName.VIEWER] })
        .expect(201);

      const rows = await dataSource.query(
        `SELECT action, after FROM audit_logs
         WHERE entity_type = 'User' AND entity_id = $1`,
        [createRes.body.id],
      );
      expect(rows.some((r: { action: string }) => r.action === 'CREATE')).toBe(
        true,
      );
      const createdRow = rows.find(
        (r: { action: string }) => r.action === 'CREATE',
      );
      expect(JSON.stringify(createdRow.after)).not.toMatch(/password/i);
    });
  });
});
