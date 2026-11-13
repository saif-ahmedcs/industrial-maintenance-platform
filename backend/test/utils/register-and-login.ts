import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { RoleName } from './../../src/users/entities/role.entity';

const PASSWORD = 'CorrectHorseBattery9!';

export interface RegisteredUser {
  email: string;
  accessToken: string;
}

export async function registerAndLogin(
  app: INestApplication<App>,
  dataSource: DataSource,
  options: {
    role?: RoleName;
    emailPrefix?: string;
    /**
     * Sign the access token directly with the app's JwtService instead of
     * calling POST /auth/login. /auth/login is a public route throttled per
     * IP (5/min by default), and every e2e request comes from the same IP,
     * so a spec that needs more than a handful of sessions would otherwise
     * hit 429. Use this for sessions that are just a means to an end; keep
     * the real login for tests that exercise authentication itself.
     */
    mintToken?: boolean;
  } = {},
): Promise<RegisteredUser> {
  const email = `${options.emailPrefix ?? 'e2e'}-${Date.now()}-${Math.floor(
    Math.random() * 1e6,
  )}@example.com`;

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: PASSWORD })
    .expect(201);

  if (options.role) {
    await dataSource.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT u.id, r.id FROM users u, roles r
       WHERE u.email = $1 AND r.name = $2
       ON CONFLICT DO NOTHING`,
      [email, options.role],
    );
  }

  if (options.mintToken) {
    const [row]: { id: string }[] = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );
    const jwtService = app.get(JwtService, { strict: false });
    const accessToken = jwtService.sign(
      { sub: row.id, email, roles: options.role ? [options.role] : [] },
      { expiresIn: '15m' },
    );
    return { email, accessToken };
  }

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);

  return { email, accessToken: loginRes.body.accessToken };
}
