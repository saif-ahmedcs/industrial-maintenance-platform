import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
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
});
