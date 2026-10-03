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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  describe('concurrent transitions on the same work order', () => {
    async function createInProgressWorkOrder(description: string) {
      const workOrderId = (
        await request(app.getHttpServer())
          .post('/work-orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ assetId, description })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer())
        .patch(`/work-orders/${workOrderId}/assign`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({})
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/work-orders/${workOrderId}/start`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);

      return workOrderId;
    }

    async function seedPart(quantityOnHand: number) {
      const repo = dataSource.getRepository(SparePart);
      return repo.save(
        repo.create({
          sku: `RACE-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
          name: 'Race test part',
          quantityOnHand,
          reorderThreshold: 0,
          unitCost: 4,
        }),
      );
    }

    async function withSparePartLockHeld<T>(
      sparePartId: string,
      body: (release: () => Promise<void>) => Promise<T>,
    ): Promise<T> {
      const holder = dataSource.createQueryRunner();
      await holder.connect();
      await holder.startTransaction();
      await holder.query(
        `SELECT id FROM spare_parts WHERE id = $1 FOR UPDATE`,
        [sparePartId],
      );
      let released = false;
      const release = async () => {
        if (released) return;
        released = true;
        await holder.rollbackTransaction();
      };
      try {
        return await body(release);
      } finally {
        await release().catch(() => undefined);
        await holder.release();
      }
    }

    it('processes a double-submitted completion exactly once (no double inventory debit)', async () => {
      const part = await seedPart(20);
      const workOrderId = await createInProgressWorkOrder('Double submit');

      const complete = () =>
        request(app.getHttpServer())
          .patch(`/work-orders/${workOrderId}/complete`)
          .set('Authorization', `Bearer ${technicianToken}`)
          .send({ parts: [{ sparePartId: part.id, quantityUsed: 5 }] })
          .then((res) => res);

      const statuses = await withSparePartLockHeld(part.id, async (release) => {
        const first = complete();
        const second = complete();
        await sleep(750); // both requests are now in flight and stalled
        await release();
        return (await Promise.all([first, second])).map((r) => r.status);
      });

      expect([...statuses].sort()).toEqual([200, 409]);

      const partAfter = await dataSource
        .getRepository(SparePart)
        .findOneByOrFail({ id: part.id });
      expect(partAfter.quantityOnHand).toBe(15);

      const txns = await dataSource
        .getRepository(InventoryTransaction)
        .find({ where: { workOrderId } });
      expect(txns).toHaveLength(1);
      expect(txns[0].deltaQuantity).toBe(-5);

      const workOrderAfter = (
        await request(app.getHttpServer())
          .get(`/work-orders/${workOrderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      ).body;
      expect(workOrderAfter.status).toBe('COMPLETED');
      expect(workOrderAfter.parts).toHaveLength(1);
      expect(workOrderAfter.totalCost).toBe(20);
    });

    it('does not let a concurrent cancel overwrite a completion that is in flight', async () => {
      const part = await seedPart(20);
      const workOrderId = await createInProgressWorkOrder('Cancel vs complete');

      const complete = () =>
        request(app.getHttpServer())
          .patch(`/work-orders/${workOrderId}/complete`)
          .set('Authorization', `Bearer ${technicianToken}`)
          .send({ parts: [{ sparePartId: part.id, quantityUsed: 5 }] })
          .then((res) => res);
      const cancel = () =>
        request(app.getHttpServer())
          .patch(`/work-orders/${workOrderId}/cancel`)
          .set('Authorization', `Bearer ${adminToken}`)
          .then((res) => res);

      const [completeRes, cancelRes] = await withSparePartLockHeld(
        part.id,
        async (release) => {
          const c1 = complete();
          await sleep(300); // let the completion start and take its locks
          const c2 = cancel();
          await sleep(750);
          await release();
          return Promise.all([c1, c2]);
        },
      );

      expect(completeRes.status).toBe(200);
      expect(cancelRes.status).toBe(409);

      const workOrderAfter = (
        await request(app.getHttpServer())
          .get(`/work-orders/${workOrderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      ).body;
      expect(workOrderAfter.status).toBe('COMPLETED');
      expect(workOrderAfter.cancelledAt).toBeNull();

      const partAfter = await dataSource
        .getRepository(SparePart)
        .findOneByOrFail({ id: part.id });
      expect(partAfter.quantityOnHand).toBe(15);
    });
  });
});
