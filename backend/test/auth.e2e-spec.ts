import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const email = `auth-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = 'CorrectHorseBattery9!';

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('walks the full lifecycle: register -> login -> protected route -> refresh -> protected route -> logout -> old refresh token rejected', async () => {
    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const firstAccessToken = loginRes.body.accessToken;
    const firstRefreshToken = loginRes.body.refreshToken;
    expect(firstAccessToken).toBeDefined();
    expect(firstRefreshToken).toBeDefined();

    // Protected route with the access token
    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${firstAccessToken}`)
      .expect(200);
    expect(meRes.body.email).toBe(email);

    // No token at all -> 401
    await request(app.getHttpServer()).get('/auth/me').expect(401);

    // Refresh
    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(200);

    const secondAccessToken = refreshRes.body.accessToken;
    const secondRefreshToken = refreshRes.body.refreshToken;
    expect(secondAccessToken).toBeDefined();
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // Protected route again with the new access token
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${secondAccessToken}`)
      .expect(200);

    // The old (rotated-out) refresh token must now be rejected
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);

    // Logout with the current refresh token
    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: secondRefreshToken })
      .expect(204);

    // The logged-out refresh token can no longer be used
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: secondRefreshToken })
      .expect(401);
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('treats two concurrent refreshes of the same token as reuse: one wins, the other is rejected, and the family is revoked', async () => {
    const raceEmail = `auth-race-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: raceEmail, password })
      .expect(201);
    const { refreshToken } = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: raceEmail, password })
        .expect(200)
    ).body as { refreshToken: string };

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const holder = dataSource.createQueryRunner();
    await holder.connect();
    await holder.startTransaction();
    await holder.query(
      `SELECT id FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash],
    );

    const refresh = () =>
      request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .then((res) => res);

    let responses: request.Response[];
    try {
      const first = refresh();
      const second = refresh();
      await new Promise((resolve) => setTimeout(resolve, 750));
      await holder.rollbackTransaction();
      responses = await Promise.all([first, second]);
    } finally {
      if (holder.isTransactionActive) await holder.rollbackTransaction();
      await holder.release();
    }

    expect(responses.map((r) => r.status).sort()).toEqual([200, 401]);

    const winner = responses.find((r) => r.status === 200)!;
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: winner.body.refreshToken })
      .expect(401);
  });
});
