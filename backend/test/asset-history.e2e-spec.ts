import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { SparePart } from './../src/inventory/entities/spare-part.entity';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Asset state history (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let technicianToken: string;
  let adminUserId: string;
  let technicianUserId: string;
  let assetTypeId: string;
  let locationId: string;

  const newTag = () =>
    `AH-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

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

    const admin = await registerAndLogin(app, dataSource, {
      role: RoleName.ADMIN,
      emailPrefix: 'ah-e2e-admin',
    });
    adminToken = admin.accessToken;
    const technician = await registerAndLogin(app, dataSource, {
      role: RoleName.TECHNICIAN,
      emailPrefix: 'ah-e2e-tech',
    });
    technicianToken = technician.accessToken;

    const [adminRow] = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      [admin.email],
    );
    adminUserId = adminRow.id;
    const [techRow] = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      [technician.email],
    );
    technicianUserId = techRow.id;

    const plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `AH-e2e Plant ${newTag()}` })
        .expect(201)
    ).body.id;

    locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `AH-e2e Location ${newTag()}` })
        .expect(201)
    ).body.id;

    assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `AH-e2e Pump ${newTag()}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAsset(): Promise<string> {
    return (
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetTypeId, locationId, tag: newTag() })
        .expect(201)
    ).body.id;
  }

  it('writes a matching history row and audit entry for a manual status change', async () => {
    const assetId = await createAsset();

    await request(app.getHttpServer())
      .patch(`/assets/${assetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CRITICAL' })
      .expect(200);

    const historyRes = await request(app.getHttpServer())
      .get(`/assets/${assetId}/history`)
      .set('Authorization', `Bearer ${technicianToken}`) // any authenticated role can read
      .expect(200);

    expect(historyRes.body.meta.total).toBe(1);
    expect(historyRes.body.data[0]).toMatchObject({
      assetId,
      previousStatus: 'OPERATIONAL',
      newStatus: 'CRITICAL',
      changedByUserId: adminUserId,
      source: 'manual',
    });

    const auditRes = await request(app.getHttpServer())
      .get('/audit')
      .query({ entityId: assetId, action: 'STATUS_CHANGE' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(auditRes.body.meta.total).toBe(1);
  });

  it('does not add a row when the status is set to what it already is', async () => {
    const assetId = await createAsset();

    await request(app.getHttpServer())
      .patch(`/assets/${assetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'OPERATIONAL' }) // already OPERATIONAL by default
      .expect(200);

    const historyRes = await request(app.getHttpServer())
      .get(`/assets/${assetId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(historyRes.body.meta.total).toBe(0);
  });

  it('returns 404 for a nonexistent asset', async () => {
    await request(app.getHttpServer())
      .get('/assets/00000000-0000-0000-0000-000000000000/history')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('writes a work-order-completion row when completion reverts a CRITICAL asset to OPERATIONAL', async () => {
    const assetId = await createAsset();

    await request(app.getHttpServer())
      .patch(`/assets/${assetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CRITICAL' })
      .expect(200);

    const workOrderId = (
      await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetId, description: 'Asset history e2e' })
        .expect(201)
    ).body.id;

    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/assign`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({})
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/start`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/complete`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({})
      .expect(200);

    const historyRes = await request(app.getHttpServer())
      .get(`/assets/${assetId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // newest first: the completion's row, then the earlier manual one
    expect(historyRes.body.meta.total).toBe(2);
    expect(historyRes.body.data[0]).toMatchObject({
      previousStatus: 'CRITICAL',
      newStatus: 'OPERATIONAL',
      changedByUserId: technicianUserId,
      source: 'work-order-completion',
    });
    expect(historyRes.body.data[1]).toMatchObject({
      previousStatus: 'OPERATIONAL',
      newStatus: 'CRITICAL',
      source: 'manual',
    });
  });

  it('leaves no history row when completion fails due to insufficient stock', async () => {
    const assetId = await createAsset();

    // Put the asset in CRITICAL first, so a *successful* completion would
    // genuinely write a CRITICAL -> OPERATIONAL row. That's what makes
    // "nothing got written" below a real proof of rollback, not a trivial
    // no-op (an asset that was already OPERATIONAL wouldn't prove anything).
    await request(app.getHttpServer())
      .patch(`/assets/${assetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CRITICAL' })
      .expect(200);

    const sparePartRepo = dataSource.getRepository(SparePart);
    const shortPart = await sparePartRepo.save(
      sparePartRepo.create({
        sku: `AH-short-${newTag()}`,
        name: 'Gasket',
        quantityOnHand: 1,
        reorderThreshold: 1,
        unitCost: 4,
      }),
    );

    const workOrderId = (
      await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assetId,
          description: 'Insufficient stock + history rollback',
        })
        .expect(201)
    ).body.id;

    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/assign`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({})
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/start`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(200);

    const historyBefore = await request(app.getHttpServer())
      .get(`/assets/${assetId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(historyBefore.body.meta.total).toBe(1); // just the manual CRITICAL change

    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/complete`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ parts: [{ sparePartId: shortPart.id, quantityUsed: 5 }] })
      .expect(409);

    const historyAfter = await request(app.getHttpServer())
      .get(`/assets/${assetId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(historyAfter.body.meta.total).toBe(1); // unchanged: no stray row

    const assetAfter = await request(app.getHttpServer())
      .get(`/assets/${assetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(assetAfter.body.status).toBe('CRITICAL'); // untouched
  });
});
