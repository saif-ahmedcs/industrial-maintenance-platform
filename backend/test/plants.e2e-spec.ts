import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Plants (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let viewerToken: string;

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
        emailPrefix: 'plants-e2e-admin',
      })
    ).accessToken;
    viewerToken = (
      await registerAndLogin(app, dataSource, {
        emailPrefix: 'plants-e2e-viewer',
      })
    ).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/plants').expect(401);
    await request(app.getHttpServer())
      .post('/plants')
      .send({ name: 'X' })
      .expect(401);
  });

  it('lets a VIEWER read the list but blocks writes', async () => {
    await request(app.getHttpServer())
      .get('/plants')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/plants')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Viewer Plant' })
      .expect(403);
  });

  it('walks the full CRUD lifecycle as an ADMIN, preserving untouched fields on partial update', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/plants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Riverside Plant', address: '100 River Rd' })
      .expect(201);

    const id = createRes.body.id;
    expect(createRes.body.name).toBe('Riverside Plant');
    expect(createRes.body.address).toBe('100 River Rd');

    await request(app.getHttpServer())
      .get(`/plants/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('Riverside Plant');
      });

    const patchRes = await request(app.getHttpServer())
      .patch(`/plants/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Riverside Plant (Renamed)' })
      .expect(200);
    expect(patchRes.body.name).toBe('Riverside Plant (Renamed)');
    expect(patchRes.body.address).toBe('100 River Rd');

    await request(app.getHttpServer())
      .delete(`/plants/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/plants/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('returns 404 for an unknown plant id and 400 for a malformed one', async () => {
    await request(app.getHttpServer())
      .get('/plants/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get('/plants/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('paginates correctly: page 2 returns different records than page 1', async () => {
    const tag = `pg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `${tag}-${i}` })
        .expect(201);
    }

    const page1 = await request(app.getHttpServer())
      .get('/plants')
      .query({ page: 1, limit: 3, sortBy: 'plant.name', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const page2 = await request(app.getHttpServer())
      .get('/plants')
      .query({ page: 2, limit: 3, sortBy: 'plant.name', sortDir: 'ASC' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(page1.body.data).toHaveLength(3);
    expect(page2.body.data).toHaveLength(3);
    expect(page1.body.meta.total).toBeGreaterThanOrEqual(6);
    expect(page1.body.meta.totalPages).toBe(
      Math.ceil(page1.body.meta.total / 3),
    );

    const page1Ids = page1.body.data.map((p: { id: string }) => p.id);
    const page2Ids = page2.body.data.map((p: { id: string }) => p.id);
    const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });
});
