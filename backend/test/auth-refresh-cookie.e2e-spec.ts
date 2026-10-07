import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const PASSWORD = 'CorrectHorseBattery9!';
const COOKIE = 'refresh_token';

// This suite lives in its own file, with its own app instance, because the
// auth endpoints are throttled per IP (login 5/min, refresh 10/min) and the
// counters are per app instance. Budget used here: 1 register, 4 logins,
// 5 refreshes.
describe('Auth refresh-token cookie (e2e)', () => {
  let app: INestApplication<App>;
  const email = `auth-cookie-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirrors main.ts: without cookie-parser, req.cookies is never populated.
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  const login = () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

  const refreshCookieHeader = (res: request.Response): string => {
    const setCookies = (res.headers['set-cookie'] ??
      []) as unknown as string[];
    const found = setCookies.find((c) => c.startsWith(`${COOKIE}=`));
    if (!found) {
      throw new Error(`Response did not set the ${COOKIE} cookie`);
    }
    return found;
  };

  const cookieValue = (setCookie: string): string =>
    setCookie.split(';')[0].slice(COOKIE.length + 1);

  it('sets the refresh token as an httpOnly, SameSite=Strict cookie scoped to /auth on login, and still returns it in the body', async () => {
    const res = await login();
    const setCookie = refreshCookieHeader(res);

    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(cookieValue(setCookie)).toBe(res.body.refreshToken);
    expect(setCookie).toMatch(/;\s*HttpOnly/i);
    expect(setCookie).toMatch(/;\s*SameSite=Strict/i);
    expect(setCookie).toMatch(/;\s*Path=\/auth(;|$)/i);
    expect(setCookie).toMatch(/;\s*Max-Age=\d+/i);
  });

  it('rotates the token when only the cookie is sent, sets the rotated cookie, and rejects the old token', async () => {
    const first = cookieValue(refreshCookieHeader(await login()));

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `${COOKIE}=${first}`)
      .expect(200);

    expect(refreshRes.body.accessToken).toEqual(expect.any(String));
    expect(refreshRes.body.refreshToken).not.toBe(first);

    const rotated = refreshCookieHeader(refreshRes);
    expect(cookieValue(rotated)).toBe(refreshRes.body.refreshToken);
    expect(rotated).toMatch(/;\s*HttpOnly/i);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `${COOKIE}=${first}`)
      .expect(401);
  });

  it('prefers the cookie over a body token when both are sent', async () => {
    const token = cookieValue(refreshCookieHeader(await login()));

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `${COOKIE}=${token}`)
      .send({ refreshToken: 'not-a-real-token' })
      .expect(200);
  });

  it('rejects a refresh with neither a cookie nor a body token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      path: '/auth/refresh',
    });
  });

  it('revokes the cookie token on logout, clears the cookie, and rejects the token afterwards', async () => {
    const token = cookieValue(refreshCookieHeader(await login()));

    const logoutRes = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `${COOKIE}=${token}`)
      .expect(204);

    const cleared = refreshCookieHeader(logoutRes);
    expect(cleared.startsWith(`${COOKIE}=;`)).toBe(true);
    expect(cleared).toMatch(/;\s*Path=\/auth(;|$)/i);
    expect(cleared).toMatch(/;\s*Expires=Thu, 01 Jan 1970/i);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `${COOKIE}=${token}`)
      .expect(401);
  });

  it('returns 204 and still clears the cookie when logout is called with no token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(204);

    expect(refreshCookieHeader(res).startsWith(`${COOKIE}=;`)).toBe(true);
  });
});
