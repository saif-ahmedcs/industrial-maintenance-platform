import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Error handling — status code + consistent error shape (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let technicianToken: string;
  let plantId: string;
  let locationId: string;
  let assetTypeId: string;
  let assetId: string;
  let assetTag: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  function expectStandardErrorShape(
    res: request.Response,
    statusCode: number,
    path: string,
  ): void {
    expect(res.status).toBe(statusCode);
    expect(res.body).toEqual({
      statusCode,
      error: expect.any(String),
      message: expect.anything(),
      path,
      timestamp: expect.any(String),
      requestId: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  }

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
        emailPrefix: 'errors-e2e-admin',
      })
    ).accessToken;
    technicianToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.TECHNICIAN,
        emailPrefix: 'errors-e2e-tech',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set(auth(adminToken))
        .send({ name: `Errors-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set(auth(adminToken))
        .send({ plantId, name: `Errors-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set(auth(adminToken))
        .send({ name: `Errors-e2e Pump ${tag}` })
        .expect(201)
    ).body.id;

    assetTag = `ERR-${tag}`;
    assetId = (
      await request(app.getHttpServer())
        .post('/assets')
        .set(auth(adminToken))
        .send({ assetTypeId, locationId, tag: assetTag })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('400 — a body that fails DTO validation returns the standard shape with a message array', async () => {
    const res = await request(app.getHttpServer())
      .post('/plants')
      .set(auth(adminToken))
      .send({});

    expectStandardErrorShape(res, 400, '/plants');
    expect(Array.isArray(res.body.message)).toBe(true);
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('400 — an unknown body field is rejected (forbidNonWhitelisted)', async () => {
    const res = await request(app.getHttpServer())
      .post('/plants')
      .set(auth(adminToken))
      .send({ name: 'Valid name', notARealField: true });

    expectStandardErrorShape(res, 400, '/plants');
  });

  it('400 — a malformed UUID path parameter returns the standard shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/work-orders/not-a-uuid')
      .set(auth(adminToken));

    expectStandardErrorShape(res, 400, '/work-orders/not-a-uuid');
  });

  it('401 — a protected route without a token returns the standard shape', async () => {
    const res = await request(app.getHttpServer()).get('/plants');

    expectStandardErrorShape(res, 401, '/plants');
  });

  it('401 — a protected route with an invalid token returns the standard shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/plants')
      .set(auth('this.is.not-a-valid-jwt'));

    expectStandardErrorShape(res, 401, '/plants');
  });

  it('403 — a TECHNICIAN calling an ADMIN/SUPERVISOR-only route returns the standard shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/plants')
      .set(auth(technicianToken))
      .send({ name: 'Should not be created' });

    expectStandardErrorShape(res, 403, '/plants');
  });

  it('404 — a well-formed but nonexistent id returns the standard shape', async () => {
    const missingId = randomUUID();
    const res = await request(app.getHttpServer())
      .get(`/work-orders/${missingId}`)
      .set(auth(adminToken));

    expectStandardErrorShape(res, 404, `/work-orders/${missingId}`);
  });

  it('409 — an illegal work-order transition returns the standard shape', async () => {
    const workOrderId = (
      await request(app.getHttpServer())
        .post('/work-orders')
        .set(auth(adminToken))
        .send({
          assetId,
          description: 'Illegal transition: complete from OPEN',
        })
        .expect(201)
    ).body.id;

    const res = await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/complete`)
      .set(auth(adminToken))
      .send({});

    expectStandardErrorShape(res, 409, `/work-orders/${workOrderId}/complete`);
    expect(res.body.message).toContain('Cannot transition');
  });

  it('409 — insufficient stock on completion returns the standard shape', async () => {
    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const sparePartId = (
      await request(app.getHttpServer())
        .post('/spare-parts')
        .set(auth(adminToken))
        .send({
          sku: `ERR-SKU-${tag}`,
          name: 'Errors-e2e Bearing',
          initialQuantity: 1,
          reorderThreshold: 0,
          unitCost: 5,
        })
        .expect(201)
    ).body.id;

    const workOrderId = (
      await request(app.getHttpServer())
        .post('/work-orders')
        .set(auth(adminToken))
        .send({ assetId, description: 'Insufficient stock error shape' })
        .expect(201)
    ).body.id;

    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/assign`)
      .set(auth(adminToken))
      .send({})
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/start`)
      .set(auth(adminToken))
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/complete`)
      .set(auth(adminToken))
      .send({ parts: [{ sparePartId, quantityUsed: 5 }] });

    expectStandardErrorShape(res, 409, `/work-orders/${workOrderId}/complete`);
    expect(res.body.message).toContain('Insufficient stock');
  });

  it('409 — a unique-constraint violation (duplicate asset tag) is mapped to the standard shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/assets')
      .set(auth(adminToken))
      .send({ assetTypeId, locationId, tag: assetTag });

    expectStandardErrorShape(res, 409, '/assets');
    expect(res.body.message).toBe('A record with these details already exists');
  });

  it('409 — a foreign-key violation (deleting a plant that still has locations) is mapped to the standard shape', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/plants/${plantId}`)
      .set(auth(adminToken));

    expectStandardErrorShape(res, 409, `/plants/${plantId}`);
  });
});
