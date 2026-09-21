import { ConflictException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import {
  InventoryTransaction,
  InventoryTransactionReason,
} from './../src/inventory/entities/inventory-transaction.entity';
import { SparePart } from './../src/inventory/entities/spare-part.entity';
import { InventoryService } from './../src/inventory/inventory.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Inventory — concurrency-safe stock consumption (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let inventoryService: InventoryService;
  const createdPartIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);
    inventoryService = moduleFixture.get(InventoryService);
    await app.init();
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

  async function seedPart(quantityOnHand: number): Promise<SparePart> {
    const repo = dataSource.getRepository(SparePart);
    const part = await repo.save(
      repo.create({
        sku: `CONC-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
        name: 'Concurrency test part',
        quantityOnHand,
        reorderThreshold: 0,
        unitCost: 1,
      }),
    );
    createdPartIds.push(part.id);
    return part;
  }

  /** Each call opens its own transaction on its own pooled connection. */
  function consumeOneInOwnTransaction(partId: string) {
    return dataSource.transaction((manager) =>
      inventoryService.consume(manager, partId, 1, { createdByUserId: null }),
    );
  }

  function loadPart(partId: string) {
    return dataSource.getRepository(SparePart).findOneByOrFail({ id: partId });
  }

  function loadTransactions(partId: string) {
    return dataSource.getRepository(InventoryTransaction).find({
      where: { sparePartId: partId },
      order: { resultingQuantity: 'ASC' },
    });
  }

  it('makes a second consumer wait for the first one’s row lock, then fail cleanly (stock = 1)', async () => {
    const part = await seedPart(1);

    const firstRunner = dataSource.createQueryRunner();
    await firstRunner.connect();
    await firstRunner.startTransaction();

    try {
      // First consumer takes the last unit but has NOT committed yet.
      await inventoryService.consume(firstRunner.manager, part.id, 1, {
        createdByUserId: null,
      });

      // Second consumer, on a different connection, must block on the row lock.
      let secondSettled = false;
      const secondOutcome = consumeOneInOwnTransaction(part.id).then(
        (value) => {
          secondSettled = true;
          return { ok: true as const, value };
        },
        (error: unknown) => {
          secondSettled = true;
          return { ok: false as const, error };
        },
      );

      await sleep(500);
      expect(secondSettled).toBe(false);

      await firstRunner.commitTransaction();

      const outcome = await secondOutcome;
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.error).toBeInstanceOf(ConflictException);
      }
    } finally {
      if (firstRunner.isTransactionActive) {
        await firstRunner.rollbackTransaction();
      }
      await firstRunner.release();
    }

    const after = await loadPart(part.id);
    expect(after.quantityOnHand).toBe(0);

    const transactions = await loadTransactions(part.id);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].deltaQuantity).toBe(-1);
    expect(transactions[0].resultingQuantity).toBe(0);
  });

  it('never lets both of two parallel consumers succeed when stock = 1 (repeated 20 times)', async () => {
    for (let round = 0; round < 20; round++) {
      const part = await seedPart(1);

      const results = await Promise.allSettled([
        consumeOneInOwnTransaction(part.id),
        consumeOneInOwnTransaction(part.id),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);

      const after = await loadPart(part.id);
      expect(after.quantityOnHand).toBe(0);

      const transactions = await loadTransactions(part.id);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].deltaQuantity).toBe(-1);
    }
  }, 60_000);

  it('lets exactly 10 of 15 parallel consumers succeed when stock = 10', async () => {
    const part = await seedPart(10);

    const results = await Promise.allSettled(
      Array.from({ length: 15 }, () => consumeOneInOwnTransaction(part.id)),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(10);
    expect(rejected).toHaveLength(5);
    for (const failure of rejected) {
      expect(failure.reason).toBeInstanceOf(ConflictException);
    }

    const after = await loadPart(part.id);
    expect(after.quantityOnHand).toBe(0);

    const transactions = await loadTransactions(part.id);
    expect(transactions).toHaveLength(10);
    for (const tx of transactions) {
      expect(tx.reason).toBe(InventoryTransactionReason.CONSUMED);
      expect(tx.deltaQuantity).toBe(-1);
    }
    // No gaps, no duplicates: every unit was handed out exactly once.
    expect(transactions.map((tx) => tx.resultingQuantity)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);

    // Starting stock (10) plus the sum of all deltas equals what's on hand.
    const deltaSum = transactions.reduce(
      (sum, tx) => sum + tx.deltaQuantity,
      0,
    );
    expect(10 + deltaSum).toBe(after.quantityOnHand);
  }, 30_000);
});
