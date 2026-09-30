import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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
});
