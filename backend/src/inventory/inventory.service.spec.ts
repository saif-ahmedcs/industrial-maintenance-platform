import { ConflictException, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { RoleName } from '../users/entities/role.entity';
import {
  InventoryTransaction,
  InventoryTransactionReason,
} from './entities/inventory-transaction.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let sparePartRepo: { findOneBy: jest.Mock; createQueryBuilder: jest.Mock };
  let queryBuilder: {
    setLock: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let manager: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let auditService: { record: jest.Mock };

  const actor: RequestUser = {
    id: 'user-1',
    email: 'admin@example.com',
    roles: [RoleName.ADMIN],
  };

  function makePart(overrides: Record<string, unknown> = {}) {
    return {
      id: 'part-1',
      sku: 'SKU-1',
      name: 'Test part',
      quantityOnHand: 5,
      reorderThreshold: 2,
      unitCost: 10,
      ...overrides,
    };
  }

  beforeEach(() => {
    queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    sparePartRepo = { findOneBy: jest.fn(), createQueryBuilder: jest.fn() };
    manager = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      create: jest.fn((_entity, plain) => plain),
      save: jest.fn(async (entity) => entity),
      remove: jest.fn(async (entity) => entity),
    };
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };
    auditService = { record: jest.fn(async () => ({})) };

    service = new InventoryService(
      sparePartRepo as any,
      dataSource as any,
      auditService as any,
    );
  });

  describe('create', () => {
    it('creates a part with no ledger row when initial quantity is zero', async () => {
      const result = await service.create(
        { sku: 'SKU-1', name: 'Bearing', unitCost: 10 } as any,
        actor,
      );

      expect(manager.save).toHaveBeenCalledTimes(1); // just the part
      expect(result.quantityOnHand).toBe(0);
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ entityType: 'SparePart', action: 'CREATE' }),
      );
    });

    it('writes a RESTOCK ledger row when an initial quantity is given', async () => {
      await service.create(
        {
          sku: 'SKU-1',
          name: 'Bearing',
          unitCost: 10,
          initialQuantity: 5,
        } as any,
        actor,
      );

      expect(manager.save).toHaveBeenCalledTimes(2); // part + transaction
      expect(manager.create).toHaveBeenCalledWith(
        InventoryTransaction,
        expect.objectContaining({
          deltaQuantity: 5,
          reason: InventoryTransactionReason.RESTOCK,
        }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the part does not exist', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'X' } as any, actor),
      ).rejects.toThrow(NotFoundException);
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('updates only the provided fields and records an audit entry', async () => {
      queryBuilder.getOne.mockResolvedValue(makePart());

      const result = await service.update(
        'part-1',
        { unitCost: 15 } as any,
        actor,
      );

      expect(result.unitCost).toBe(15);
      expect(result.name).toBe('Test part'); // untouched
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ action: 'UPDATE' }),
      );
    });
  });

  describe('consume', () => {
    it('throws ConflictException and leaves the part untouched when stock is insufficient', async () => {
      const part = makePart({ quantityOnHand: 1 });
      queryBuilder.getOne.mockResolvedValue(part);

      await expect(
        service.consume(manager as any, 'part-1', 2, {
          createdByUserId: 'user-1',
        }),
      ).rejects.toThrow(ConflictException);

      expect(manager.save).not.toHaveBeenCalled();
      expect(part.quantityOnHand).toBe(1);
    });

    it('decrements quantity and writes a matching CONSUMED transaction on success', async () => {
      queryBuilder.getOne.mockResolvedValue(makePart({ quantityOnHand: 5 }));

      const { sparePart, transaction } = await service.consume(
        manager as any,
        'part-1',
        2,
        { workOrderId: 'wo-1', createdByUserId: 'user-1' },
      );

      expect(sparePart.quantityOnHand).toBe(3);
      expect(transaction.deltaQuantity).toBe(-2);
      expect(manager.create).toHaveBeenCalledWith(
        InventoryTransaction,
        expect.objectContaining({
          deltaQuantity: -2,
          reason: InventoryTransactionReason.CONSUMED,
          resultingQuantity: 3,
          workOrderId: 'wo-1',
        }),
      );
    });

    it('allows consuming exactly the remaining stock down to zero', async () => {
      queryBuilder.getOne.mockResolvedValue(makePart({ quantityOnHand: 1 }));

      const { sparePart } = await service.consume(manager as any, 'part-1', 1, {
        createdByUserId: 'user-1',
      });

      expect(sparePart.quantityOnHand).toBe(0);
    });
  });

  describe('restock', () => {
    it('increases quantity and records a before/after audit entry', async () => {
      queryBuilder.getOne.mockResolvedValue(makePart({ quantityOnHand: 5 }));

      const { sparePart } = await service.restock(
        'part-1',
        { quantity: 3 } as any,
        actor,
      );

      expect(sparePart.quantityOnHand).toBe(8);
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: 'RESTOCK',
          before: { quantityOnHand: 5 },
          after: expect.objectContaining({ quantityOnHand: 8 }),
        }),
      );
    });
  });

  describe('adjust', () => {
    it('applies a negative delta and includes the reason in the audit entry', async () => {
      queryBuilder.getOne.mockResolvedValue(makePart({ quantityOnHand: 5 }));

      const { sparePart } = await service.adjust(
        'part-1',
        { delta: -2, reason: 'Damaged in transit' } as any,
        actor,
      );

      expect(sparePart.quantityOnHand).toBe(3);
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: 'ADJUST',
          after: expect.objectContaining({
            delta: -2,
            reason: 'Damaged in transit',
          }),
        }),
      );
    });

    it('throws ConflictException when the adjustment would drive stock negative', async () => {
      queryBuilder.getOne.mockResolvedValue(makePart({ quantityOnHand: 1 }));

      await expect(
        service.adjust(
          'part-1',
          { delta: -5, reason: 'Too many written off' } as any,
          actor,
        ),
      ).rejects.toThrow(ConflictException);
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the part does not exist', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove('missing-id', actor)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.remove).not.toHaveBeenCalled();
    });

    it('removes the part and records a DELETE audit entry', async () => {
      queryBuilder.getOne.mockResolvedValue(makePart());

      await service.remove('part-1', actor);

      expect(manager.remove).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ entityType: 'SparePart', action: 'DELETE' }),
      );
    });
  });
});
