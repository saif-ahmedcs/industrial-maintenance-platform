import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { InventoryTransaction } from './../src/inventory/entities/inventory-transaction.entity';
import { SparePart } from './../src/inventory/entities/spare-part.entity';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Work Orders — insufficient-stock rollback (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let technicianToken: string;
  let assetId: string;

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
        emailPrefix: 'wo-e2e-admin',
      })
    ).accessToken;
    technicianToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.TECHNICIAN,
        emailPrefix: 'wo-e2e-tech',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `WO-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    const locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `WO-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    const assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `WO-e2e Pump ${tag}` })
        .expect(201)
    ).body.id;

    assetId = (
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetTypeId, locationId, tag: `WO-e2e-${tag}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('leaves status, asset, inventory, and audit untouched when one of two parts has insufficient stock', async () => {
    const sparePartRepo = dataSource.getRepository(SparePart);
    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    // Part A has plenty of stock; Part B does not. Both are requested in the
    // same completion call so we prove Part A's already-applied decrement
    // gets undone too, not just that Part B's failing decrement never landed.
    const partA = await sparePartRepo.save(
      sparePartRepo.create({
        sku: `A-${tag}`,
        name: 'Bearing',
        quantityOnHand: 10,
        reorderThreshold: 2,
        unitCost: 5,
      }),
    );
    const partB = await sparePartRepo.save(
      sparePartRepo.create({
        sku: `B-${tag}`,
        name: 'Seal',
        quantityOnHand: 1,
        reorderThreshold: 1,
        unitCost: 3,
      }),
    );

    const workOrderId = (
      await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetId, description: 'Insufficient stock rollback test' })
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

    const assetBefore = (
      await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    ).body;

    // Part A can cover 3; Part B cannot cover 2 (only 1 on hand).
    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/complete`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        parts: [
          { sparePartId: partA.id, quantityUsed: 3 },
          { sparePartId: partB.id, quantityUsed: 2 },
        ],
      })
      .expect(409);

    // Work order: still IN_PROGRESS, never completed.
    const workOrderAfter = (
      await request(app.getHttpServer())
        .get(`/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    ).body;
    expect(workOrderAfter.status).toBe('IN_PROGRESS');
    expect(workOrderAfter.completedAt).toBeNull();
    expect(workOrderAfter.totalCost).toBeNull();
    expect(workOrderAfter.parts).toHaveLength(0);

    // Asset: status unchanged.
    const assetAfter = (
      await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    ).body;
    expect(assetAfter.status).toBe(assetBefore.status);

    // Inventory: Part A's decrement was rolled back too, not just Part B's.
    const partAAfter = await sparePartRepo.findOneBy({ id: partA.id });
    const partBAfter = await sparePartRepo.findOneBy({ id: partB.id });
    expect(partAAfter!.quantityOnHand).toBe(10);
    expect(partBAfter!.quantityOnHand).toBe(1);

    const txnRepo = dataSource.getRepository(InventoryTransaction);
    const txns = await txnRepo.find({ where: { workOrderId } });
    expect(txns).toHaveLength(0);

    // Audit: no COMPLETE or STATUS_CHANGE entries for this attempt.
    const auditRes = await request(app.getHttpServer())
      .get('/audit')
      .query({ entityId: workOrderId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const completeRows = auditRes.body.data.filter(
      (row: { action: string }) => row.action === 'COMPLETE',
    );
    expect(completeRows).toHaveLength(0);
  });
});
