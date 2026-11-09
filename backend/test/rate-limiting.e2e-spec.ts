import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { registerAndLogin } from './utils/register-and-login';

const PASSWORD = 'CorrectHorseBattery9!';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
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
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 with the standard error shape once /auth/register is called past its per-minute limit', async () => {
    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const attempt = (i: number) =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `rl-register-${tag}-${i}@example.com`,
          password: PASSWORD,
        });

    for (let i = 0; i < 5; i++) {
      await attempt(i).expect(201);
    }

    const blocked = await attempt(5);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      statusCode: 429,
      path: '/auth/register',
    });
    expect(blocked.body.timestamp).toEqual(expect.any(String));
    expect(blocked.headers['x-request-id']).toBeDefined();
  });

  it('returns 429 once /auth/login is called past its per-minute limit', async () => {
    const email = `rl-login-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    const attemptLogin = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD });

    for (let i = 0; i < 5; i++) {
      await attemptLogin().expect(200);
    }

    const blocked = await attemptLogin();
    expect(blocked.status).toBe(429);
    expect(blocked.body.statusCode).toBe(429);
  });

  it('keys authenticated requests by user, so one user exhausting the limit does not block another user on the same IP', async () => {
    const dataSource = app.get(DataSource);
    const userA = await registerAndLogin(app, dataSource, {
      emailPrefix: 'rl-user-a',
    });
    const userB = await registerAndLogin(app, dataSource, {
      emailPrefix: 'rl-user-b',
    });
    const me = (accessToken: string) =>
      request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

    for (let i = 0; i < 60; i++) {
      await me(userA.accessToken).expect(200);
    }
    const blocked = await me(userA.accessToken);
    expect(blocked.status).toBe(429);
    expect(blocked.body.statusCode).toBe(429);

    await me(userB.accessToken).expect(200);
  });

  it('shares the bucket across several sessions of the same user — e.g. the e2e admin session pool (frontend/e2e/storage-state.ts), which logs the one seeded admin account in multiple times', async () => {
    const dataSource = app.get(DataSource);
    const pooledUser = await registerAndLogin(app, dataSource, {
      emailPrefix: 'rl-pooled-user',
    });
    const secondSession = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: pooledUser.email, password: PASSWORD })
      .expect(200);
    const secondSessionToken = secondSession.body.accessToken as string;

    const me = (accessToken: string) =>
      request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

    for (let i = 0; i < 60; i++) {
      await me(pooledUser.accessToken).expect(200);
    }

    // The session that made the 60 calls is blocked, same as the single
    // -session case above...
    const blockedFirstSession = await me(pooledUser.accessToken);
    expect(blockedFirstSession.status).toBe(429);

    // ...and so is the second session, even though it never made a call
    // itself: it's a login of the same account, so it shares the bucket.
    const blockedSecondSession = await me(secondSessionToken);
    expect(blockedSecondSession.status).toBe(429);
  });

  it('DEFAULT_RATE_LIMIT raises that shared bucket, the way frontend/playwright.config.ts sets it for the e2e run', async () => {
    const dataSource = app.get(DataSource);
    const pooledUser = await registerAndLogin(app, dataSource, {
      emailPrefix: 'rl-pooled-user-override',
    });
    const secondSession = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: pooledUser.email, password: PASSWORD })
      .expect(200);
    const secondSessionToken = secondSession.body.accessToken as string;

    const me = (accessToken: string) =>
      request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

    process.env.DEFAULT_RATE_LIMIT = '1000';
    try {
      for (let i = 0; i < 60; i++) {
        await me(pooledUser.accessToken).expect(200);
      }

      // Past what the production default (60) would allow, but both
      // sessions of this one pooled user keep working.
      await me(pooledUser.accessToken).expect(200);
      await me(secondSessionToken).expect(200);
    } finally {
      delete process.env.DEFAULT_RATE_LIMIT;
    }
  });
});
