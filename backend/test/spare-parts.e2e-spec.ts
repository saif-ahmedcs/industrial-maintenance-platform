import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import {
  InventoryTransaction,
  InventoryTransactionReason,
} from './../src/inventory/entities/inventory-transaction.entity';
import { RoleName } from './../src/users/entities/role.entity';
import { registerAndLogin } from './utils/register-and-login';

interface PartBody {
  id: string;
  sku: string;
  name: string;
  quantityOnHand: number;
  reorderThreshold: number;
  unitCost: number;
  isLowStock: boolean;
}

interface AuditEntryBody {
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

describe('Spare parts API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let technicianToken: string;
  let adminUserId: string;
  const createdPartIds: string[] = [];

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
      emailPrefix: 'sp-e2e-admin',
    });
    adminToken = admin.accessToken;
    technicianToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.TECHNICIAN,
        emailPrefix: 'sp-e2e-tech',
      })
    ).accessToken;

    const rows: { id: string }[] = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      [admin.email],
    );
    adminUserId = rows[0].id;
  });

  afterAll(async () => {
    if (createdPartIds.length > 0) {
      await dataSource.query(
        `DELETE FROM inventory_transactions WHERE spare_part_id = ANY($1)`,
        [createdPartIds],
      );
      await dataSource.query(`DELETE FROM spare_parts WHERE id = ANY($1)`, [
        createdPartIds,
      ]);
    }
    await app.close();
  });

  const bearer = (token: string) => `Bearer ${token}`;

  function uniqueSku(prefix = 'SP'): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  async function createPart(
    overrides: Record<string, unknown> = {},
  ): Promise<PartBody> {
    const res = await request(app.getHttpServer())
      .post('/spare-parts')
      .set('Authorization', bearer(adminToken))
      .send({
        sku: uniqueSku(),
        name: 'E2E part',
        unitCost: 4.5,
        ...overrides,
      })
      .expect(201);
    createdPartIds.push(res.body.id);
    return res.body as PartBody;
  }

  async function getPart(id: string, token = adminToken): Promise<PartBody> {
    const res = await request(app.getHttpServer())
      .get(`/spare-parts/${id}`)
      .set('Authorization', bearer(token))
      .expect(200);
    return res.body as PartBody;
  }

  function loadTransactions(partId: string) {
    return dataSource.getRepository(InventoryTransaction).find({
      where: { sparePartId: partId },
      order: { createdAt: 'ASC' },
    });
  }

  async function auditEntries(partId: string): Promise<AuditEntryBody[]> {
    const res = await request(app.getHttpServer())
      .get('/audit')
      .query({
        entityType: 'SparePart',
        entityId: partId,
        sortBy: 'audit.createdAt',
        sortDir: 'ASC',
        limit: 100,
      })
      .set('Authorization', bearer(adminToken))
      .expect(200);
    return res.body.data as AuditEntryBody[];
  }

  describe('access control', () => {
    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/spare-parts').expect(401);
    });

    it('lets a technician list and read parts', async () => {
      const part = await createPart();

      const list = await request(app.getHttpServer())
        .get('/spare-parts')
        .set('Authorization', bearer(technicianToken))
        .expect(200);
      expect(Array.isArray(list.body.data)).toBe(true);

      const one = await getPart(part.id, technicianToken);
      expect(one.sku).toBe(part.sku);
    });

    it('forbids a technician from creating, updating, restocking or adjusting', async () => {
      const part = await createPart({ initialQuantity: 5 });
      const asTech = bearer(technicianToken);

      await request(app.getHttpServer())
        .post('/spare-parts')
        .set('Authorization', asTech)
        .send({ sku: uniqueSku(), name: 'Nope', unitCost: 1 })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/spare-parts/${part.id}`)
        .set('Authorization', asTech)
        .send({ name: 'Nope' })
        .expect(403);
      await request(app.getHttpServer())
        .post(`/spare-parts/${part.id}/restock`)
        .set('Authorization', asTech)
        .send({ quantity: 5 })
        .expect(403);
      await request(app.getHttpServer())
        .post(`/spare-parts/${part.id}/adjust`)
        .set('Authorization', asTech)
        .send({ delta: -1, reason: 'Should be refused' })
        .expect(403);

      expect((await getPart(part.id)).quantityOnHand).toBe(5);
      expect(await loadTransactions(part.id)).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates a part with initial stock, a RESTOCK ledger row and an audit entry', async () => {
      const sku = uniqueSku('BRG');
      const res = await request(app.getHttpServer())
        .post('/spare-parts')
        .set('Authorization', bearer(adminToken))
        .send({
          sku,
          name: 'Bearing 6204',
          initialQuantity: 5,
          reorderThreshold: 2,
          unitCost: 12.5,
        })
        .expect(201);
      createdPartIds.push(res.body.id);

      expect(res.body).toMatchObject({
        sku,
        name: 'Bearing 6204',
        quantityOnHand: 5,
        reorderThreshold: 2,
        unitCost: 12.5,
        isLowStock: false,
      });

      const transactions = await loadTransactions(res.body.id);
      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({
        reason: InventoryTransactionReason.RESTOCK,
        deltaQuantity: 5,
        resultingQuantity: 5,
        workOrderId: null,
        createdByUserId: adminUserId,
      });

      const audit = await auditEntries(res.body.id);
      expect(audit.map((e) => e.action)).toEqual(['CREATE']);
    });

    it('creates a part with zero stock and writes no ledger rows', async () => {
      const part = await createPart();

      expect(part.quantityOnHand).toBe(0);
      expect(part.reorderThreshold).toBe(0);
      expect(part.isLowStock).toBe(true); // 0 <= 0
      expect(await loadTransactions(part.id)).toHaveLength(0);
    });

    it('rejects a duplicate SKU with 409', async () => {
      const part = await createPart();

      await request(app.getHttpServer())
        .post('/spare-parts')
        .set('Authorization', bearer(adminToken))
        .send({ sku: part.sku, name: 'Duplicate', unitCost: 1 })
        .expect(409);
    });

    it('rejects invalid input with 400', async () => {
      const base = { sku: uniqueSku(), name: 'Valid name', unitCost: 1 };
      const badBodies: Record<string, unknown>[] = [
        { ...base, unitCost: -1 },
        { ...base, unitCost: 1.234 },
        { ...base, initialQuantity: -1 },
        { ...base, initialQuantity: 1.5 },
        { ...base, reorderThreshold: -1 },
        { ...base, quantityOnHand: 5 }, // not a writable field
        { ...base, sku: '' },
        { ...base, sku: undefined },
        { ...base, name: undefined },
        { ...base, unitCost: undefined },
      ];

      for (const body of badBodies) {
        await request(app.getHttpServer())
          .post('/spare-parts')
          .set('Authorization', bearer(adminToken))
          .send(body)
          .expect(400);
      }
    });
  });

  describe('update', () => {
    it('updates name, reorder threshold and unit cost without touching stock', async () => {
      const part = await createPart({
        initialQuantity: 5,
        reorderThreshold: 2,
      });

      const res = await request(app.getHttpServer())
        .patch(`/spare-parts/${part.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ name: 'Renamed part', reorderThreshold: 7, unitCost: 9.99 })
        .expect(200);

      expect(res.body).toMatchObject({
        id: part.id,
        sku: part.sku,
        name: 'Renamed part',
        reorderThreshold: 7,
        unitCost: 9.99,
        quantityOnHand: 5,
        isLowStock: true, // 5 <= 7
      });

      const audit = await auditEntries(part.id);
      expect(audit.map((e) => e.action)).toEqual(['CREATE', 'UPDATE']);
    });

    it('refuses to change stock or SKU through PATCH', async () => {
      const part = await createPart({ initialQuantity: 5 });

      await request(app.getHttpServer())
        .patch(`/spare-parts/${part.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ quantityOnHand: 99 })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/spare-parts/${part.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ sku: uniqueSku() })
        .expect(400);

      const after = await getPart(part.id);
      expect(after.quantityOnHand).toBe(5);
      expect(after.sku).toBe(part.sku);
    });

    it('returns 404 when updating an unknown part', async () => {
      await request(app.getHttpServer())
        .patch(`/spare-parts/${randomUUID()}`)
        .set('Authorization', bearer(adminToken))
        .send({ name: 'Ghost' })
        .expect(404);
    });
  });

  describe('restock', () => {
    it('adds stock and records a RESTOCK ledger row and an audit entry', async () => {
      const part = await createPart({ initialQuantity: 5 });

      const res = await request(app.getHttpServer())
        .post(`/spare-parts/${part.id}/restock`)
        .set('Authorization', bearer(adminToken))
        .send({ quantity: 5 })
        .expect(201);

      expect(res.body.sparePart.quantityOnHand).toBe(10);
      expect(res.body.transaction).toMatchObject({
        sparePartId: part.id,
        reason: InventoryTransactionReason.RESTOCK,
        deltaQuantity: 5,
        resultingQuantity: 10,
        createdByUserId: adminUserId,
      });

      const audit = await auditEntries(part.id);
      expect(audit.map((e) => e.action)).toEqual(['CREATE', 'RESTOCK']);
      expect(audit[1].before).toMatchObject({ quantityOnHand: 5 });
      expect(audit[1].after).toMatchObject({ quantityOnHand: 10 });
    });

    it('rejects invalid restock quantities (400) and unknown parts (404)', async () => {
      const part = await createPart({ initialQuantity: 5 });

      for (const body of [
        { quantity: 0 },
        { quantity: -1 },
        { quantity: 1.5 },
        {},
      ]) {
        await request(app.getHttpServer())
          .post(`/spare-parts/${part.id}/restock`)
          .set('Authorization', bearer(adminToken))
          .send(body)
          .expect(400);
      }

      await request(app.getHttpServer())
        .post(`/spare-parts/${randomUUID()}/restock`)
        .set('Authorization', bearer(adminToken))
        .send({ quantity: 5 })
        .expect(404);

      expect((await getPart(part.id)).quantityOnHand).toBe(5);
      expect(await loadTransactions(part.id)).toHaveLength(1);
    });
  });

  describe('adjust', () => {
    it('applies signed adjustments and keeps the reason in the audit entry', async () => {
      const part = await createPart({ initialQuantity: 5 });

      const down = await request(app.getHttpServer())
        .post(`/spare-parts/${part.id}/adjust`)
        .set('Authorization', bearer(adminToken))
        .send({ delta: -3, reason: 'Damaged in transit' })
        .expect(201);
      expect(down.body.sparePart.quantityOnHand).toBe(2);
      expect(down.body.transaction).toMatchObject({
        reason: InventoryTransactionReason.ADJUSTMENT,
        deltaQuantity: -3,
        resultingQuantity: 2,
      });

      const up = await request(app.getHttpServer())
        .post(`/spare-parts/${part.id}/adjust`)
        .set('Authorization', bearer(adminToken))
        .send({ delta: 4, reason: 'Found in recount' })
        .expect(201);
      expect(up.body.sparePart.quantityOnHand).toBe(6);

      const audit = await auditEntries(part.id);
      expect(audit.map((e) => e.action)).toEqual([
        'CREATE',
        'ADJUST',
        'ADJUST',
      ]);
      expect(audit[1].after).toMatchObject({
        quantityOnHand: 2,
        delta: -3,
        reason: 'Damaged in transit',
      });
    });

    it('refuses an adjustment that would drive stock below zero and changes nothing', async () => {
      const part = await createPart({ initialQuantity: 2 });

      await request(app.getHttpServer())
        .post(`/spare-parts/${part.id}/adjust`)
        .set('Authorization', bearer(adminToken))
        .send({ delta: -3, reason: 'Too many written off' })
        .expect(409);

      expect((await getPart(part.id)).quantityOnHand).toBe(2);
      expect(await loadTransactions(part.id)).toHaveLength(1);
      const audit = await auditEntries(part.id);
      expect(audit.map((e) => e.action)).toEqual(['CREATE']);
    });

    it('rejects invalid adjustments with 400', async () => {
      const part = await createPart({ initialQuantity: 5 });

      const badBodies = [
        { delta: 0, reason: 'No-op adjustment' },
        { delta: 1.5, reason: 'Fractional units' },
        { delta: -1 }, // reason is required
        { delta: -1, reason: 'ab' }, // reason too short
        { reason: 'Missing delta' },
      ];
      for (const body of badBodies) {
        await request(app.getHttpServer())
          .post(`/spare-parts/${part.id}/adjust`)
          .set('Authorization', bearer(adminToken))
          .send(body)
          .expect(400);
      }

      expect((await getPart(part.id)).quantityOnHand).toBe(5);
    });
  });

  describe('low-stock filter', () => {
    const countByLowStock = async (lowStock: boolean): Promise<number> => {
      const res = await request(app.getHttpServer())
        .get('/spare-parts')
        .query({ lowStock, limit: 1 })
        .set('Authorization', bearer(technicianToken))
        .expect(200);
      return res.body.meta.total as number;
    };

    it('counts parts at or below their reorder threshold as low stock', async () => {
      // Other test files leave parts behind, so compare counts, not contents.
      const lowBefore = await countByLowStock(true);
      const okBefore = await countByLowStock(false);

      const below = await createPart({
        initialQuantity: 1,
        reorderThreshold: 2,
      });
      const atThreshold = await createPart({
        initialQuantity: 2,
        reorderThreshold: 2,
      });
      const healthy = await createPart({
        initialQuantity: 10,
        reorderThreshold: 2,
      });

      expect(below.isLowStock).toBe(true);
      expect(atThreshold.isLowStock).toBe(true);
      expect(healthy.isLowStock).toBe(false);
      expect(await countByLowStock(true)).toBe(lowBefore + 2);
      expect(await countByLowStock(false)).toBe(okBefore + 1);

      // Restocking lifts a part out of the low-stock list.
      await request(app.getHttpServer())
        .post(`/spare-parts/${below.id}/restock`)
        .set('Authorization', bearer(adminToken))
        .send({ quantity: 5 })
        .expect(201);

      expect((await getPart(below.id)).isLowStock).toBe(false);
      expect(await countByLowStock(true)).toBe(lowBefore + 1);
      expect(await countByLowStock(false)).toBe(okBefore + 2);
    });

    it('rejects a non-boolean lowStock value with 400', async () => {
      await request(app.getHttpServer())
        .get('/spare-parts')
        .query({ lowStock: 'maybe' })
        .set('Authorization', bearer(technicianToken))
        .expect(400);
    });
  });

  describe('read', () => {
    it('returns 404 for an unknown id and 400 for a malformed id', async () => {
      await request(app.getHttpServer())
        .get(`/spare-parts/${randomUUID()}`)
        .set('Authorization', bearer(adminToken))
        .expect(404);
      await request(app.getHttpServer())
        .get('/spare-parts/not-a-uuid')
        .set('Authorization', bearer(adminToken))
        .expect(400);
    });

    it('paginates the list and returns pagination meta', async () => {
      await createPart();
      await createPart();

      const res = await request(app.getHttpServer())
        .get('/spare-parts')
        .query({ page: 1, limit: 1 })
        .set('Authorization', bearer(adminToken))
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('isLowStock');
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ledger reconciliation', () => {
    it('keeps quantity_on_hand equal to the sum of its ledger rows', async () => {
      const part = await createPart({ initialQuantity: 5 });

      await request(app.getHttpServer())
        .post(`/spare-parts/${part.id}/restock`)
        .set('Authorization', bearer(adminToken))
        .send({ quantity: 5 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/spare-parts/${part.id}/adjust`)
        .set('Authorization', bearer(adminToken))
        .send({ delta: -3, reason: 'Damaged in transit' })
        .expect(201);

      const transactions = await loadTransactions(part.id);
      expect(transactions.map((t) => t.deltaQuantity)).toEqual([5, 5, -3]);
      expect(transactions.map((t) => t.resultingQuantity)).toEqual([5, 10, 7]);

      const ledgerSum = transactions.reduce(
        (sum, t) => sum + t.deltaQuantity,
        0,
      );
      expect((await getPart(part.id)).quantityOnHand).toBe(ledgerSum);

      const audit = await auditEntries(part.id);
      expect(audit.map((e) => e.action)).toEqual([
        'CREATE',
        'RESTOCK',
        'ADJUST',
      ]);
    });
  });
});
