import { INestApplication } from '@nestjs/common';
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
  options: { role?: RoleName; emailPrefix?: string } = {},
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

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);

  return { email, accessToken: loginRes.body.accessToken };
}
