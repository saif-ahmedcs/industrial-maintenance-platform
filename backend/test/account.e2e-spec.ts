import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Account and password (e2e, B3)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let viewerToken: string;

  const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const uniqueEmail = (prefix: string) => `${prefix}-${tag}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    dataSource = moduleFixture.get(DataSource);
    jwtService = moduleFixture.get(JwtService, { strict: false });
    await app.init();

    adminToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.ADMIN,
        emailPrefix: `account-e2e-admin-${tag}`,
        mintToken: true,
      })
    ).accessToken;
    viewerToken = (
      await registerAndLogin(app, dataSource, {
        emailPrefix: `account-e2e-viewer-${tag}`,
        mintToken: true,
      })
    ).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createUser(
    prefix: string,
    role: RoleName = RoleName.VIEWER,
  ): Promise<{ id: string; email: string; temporaryPassword: string }> {
    const email = uniqueEmail(prefix);
    const res = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, name: prefix, roles: [role] })
      .expect(201);
    return {
      id: res.body.id,
      email,
      temporaryPassword: res.body.temporaryPassword,
    };
  }

  function mintAccessToken(user: {
    id: string;
    email: string;
    role?: RoleName;
  }): string {
    return jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.role ? [user.role] : [RoleName.VIEWER],
      },
      { expiresIn: '15m' },
    );
  }

  async function login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    cookie: string;
    mustChangePassword: boolean;
  }> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const setCookie = (res.headers['set-cookie'] ?? []) as unknown as
      string[] | undefined;
    const cookie = setCookie?.find((c) => c.startsWith('refresh_token='));
    if (!cookie) {
      throw new Error('Login response did not set a refresh_token cookie');
    }

    return {
      accessToken: res.body.accessToken,
      refreshToken: res.body.refreshToken,
      cookie: cookie.split(';')[0],
      mustChangePassword: res.body.mustChangePassword,
    };
  }

  async function seedLiveRefreshToken(userId: string): Promise<void> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    await dataSource.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '7 days')`,
      [userId, tokenHash],
    );
  }

  describe('PATCH /auth/password', () => {
    it('rejects an unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .send({
          currentPassword: 'whatever',
          newPassword: 'BrandNewPassword123!',
        })
        .expect(401);
    });

    it('rejects a new password under 12 characters with 400', async () => {
      const user = await createUser('shortpw');
      const token = mintAccessToken(user);

      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'irrelevant', newPassword: 'short1!' })
        .expect(400);
    });

    it('rejects the wrong current password with 401 and makes no changes', async () => {
      const user = await createUser('self-change-wrong');
      const token = mintAccessToken(user);

      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'TotallyWrongPassword1!',
          newPassword: 'BrandNewPassword123!',
        })
        .expect(401);

      const [row] = await dataSource.query(
        `SELECT must_change_password FROM users WHERE id = $1`,
        [user.id],
      );
      expect(row.must_change_password).toBe(true);
    });

    it('on success keeps the presenting session and revokes every other one, clearing mustChangePassword', async () => {
      const user = await createUser('self-change-ok');

      const sessionA = await login(user.email, user.temporaryPassword);
      expect(sessionA.mustChangePassword).toBe(true);
      const sessionB = await login(user.email, user.temporaryPassword);

      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', `Bearer ${sessionA.accessToken}`)
        .set('Cookie', sessionA.cookie)
        .send({
          currentPassword: user.temporaryPassword,
          newPassword: 'BrandNewPassword123!',
        })
        .expect(204);

      const sessionBHash = createHash('sha256')
        .update(sessionB.refreshToken)
        .digest('hex');
      const [sessionBRow] = await dataSource.query(
        `SELECT revoked_at FROM refresh_tokens WHERE token_hash = $1`,
        [sessionBHash],
      );
      expect(sessionBRow.revoked_at).not.toBeNull();

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: sessionA.refreshToken })
        .expect(200);

      const [row] = await dataSource.query(
        `SELECT must_change_password FROM users WHERE id = $1`,
        [user.id],
      );
      expect(row.must_change_password).toBe(false);
    });

    it('revokes every refresh token when no refresh_token cookie is presented', async () => {
      const user = await createUser('self-change-no-cookie');
      const session = await login(user.email, user.temporaryPassword);
      await seedLiveRefreshToken(user.id);

      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          currentPassword: user.temporaryPassword,
          newPassword: 'AnotherNewPassword123!',
        })
        .expect(204);

      const rows = await dataSource.query(
        `SELECT revoked_at FROM refresh_tokens WHERE user_id = $1`,
        [user.id],
      );
      expect(rows.length).toBeGreaterThanOrEqual(2);
      for (const r of rows) {
        expect(r.revoked_at).not.toBeNull();
      }
    });
  });

  describe('POST /users/:id/reset-password', () => {
    it('is ADMIN only', async () => {
      const target = await createUser('reset-authz');

      await request(app.getHttpServer())
        .post(`/users/${target.id}/reset-password`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/users/${target.id}/reset-password`)
        .expect(401);
    });

    it('a newly created user already has mustChangePassword set (B2 correction)', async () => {
      const user = await createUser('create-must-change');

      const [row] = await dataSource.query(
        `SELECT must_change_password FROM users WHERE id = $1`,
        [user.id],
      );
      expect(row.must_change_password).toBe(true);
    });

    it('generates a one-time temporary password, forces a change, and atomically revokes existing sessions', async () => {
      const target = await createUser('reset-target');
      await seedLiveRefreshToken(target.id);

      const resetRes = await request(app.getHttpServer())
        .post(`/users/${target.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const temporaryPassword = resetRes.body.temporaryPassword as string;
      expect(temporaryPassword).toHaveLength(16);
      expect(temporaryPassword).not.toBe(target.temporaryPassword);

      const [row] = await dataSource.query(
        `SELECT password_hash, must_change_password FROM users WHERE id = $1`,
        [target.id],
      );
      expect(row.password_hash).not.toBe(temporaryPassword);
      expect(row.must_change_password).toBe(true);

      const sessions = await dataSource.query(
        `SELECT revoked_at FROM refresh_tokens WHERE user_id = $1`,
        [target.id],
      );
      expect(sessions.length).toBeGreaterThan(0);
      for (const s of sessions) {
        expect(s.revoked_at).not.toBeNull();
      }
      const afterReset = await login(target.email, temporaryPassword);
      expect(afterReset.mustChangePassword).toBe(true);
    });
  });
});
