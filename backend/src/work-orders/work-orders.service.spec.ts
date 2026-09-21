import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Asset, AssetStatus } from '../assets/entities/asset.entity';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { MaintenancePlan } from '../maintenance-plans/entities/maintenance-plan.entity';
import { RoleName } from '../users/entities/role.entity';
import { WorkOrder, WorkOrderStatus } from './entities/work-order.entity';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { WorkOrdersService } from './work-orders.service';

describe('WorkOrdersService.complete', () => {
  let service: WorkOrdersService;
  let workOrderRepo: { findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let manager: { findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let auditService: { record: jest.Mock };
  let inventoryService: { consume: jest.Mock };

  const technician: RequestUser = {
    id: 'tech-1',
    email: 'tech@example.com',
    roles: [RoleName.TECHNICIAN],
  };
  const supervisor: RequestUser = {
    id: 'super-1',
    email: 'super@example.com',
    roles: [RoleName.SUPERVISOR],
  };

  let workOrder: WorkOrder;
  let asset: Asset;
  let plan: MaintenancePlan;

  beforeEach(() => {
    workOrder = {
      id: 'wo-1',
      assetId: 'asset-1',
      maintenancePlanId: 'plan-1',
      status: WorkOrderStatus.IN_PROGRESS,
      assignedToUserId: 'tech-1',
    } as WorkOrder;

    asset = { id: 'asset-1', status: AssetStatus.CRITICAL } as Asset;

    plan = {
      id: 'plan-1',
      intervalDays: 30,
      lastCompletedAt: null,
      nextDueAt: new Date('2020-01-01'),
    } as MaintenancePlan;

    workOrderRepo = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
    manager = {
      findOneBy: jest.fn(async (entity: unknown) => {
        if (entity === WorkOrder) return workOrder;
        if (entity === Asset) return asset;
        if (entity === MaintenancePlan) return plan;
        return null;
      }),
      create: jest.fn((_entity, plain) => plain),
      save: jest.fn(async (entity) => entity),
    };
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };
    auditService = { record: jest.fn(async () => ({})) };
    inventoryService = { consume: jest.fn() };

    service = new WorkOrdersService(
      workOrderRepo as any,
      dataSource as any,
      auditService as any,
      inventoryService as any,
    );
  });

  it('throws NotFoundException when the work order does not exist', async () => {
    manager.findOneBy.mockResolvedValue(null);

    await expect(
      service.complete('missing-id', {}, technician),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException for a technician who is not the assignee', async () => {
    const otherTech: RequestUser = {
      id: 'tech-2',
      email: 'other@example.com',
      roles: [RoleName.TECHNICIAN],
    };

    await expect(service.complete('wo-1', {}, otherTech)).rejects.toThrow(
      ForbiddenException,
    );
    expect(inventoryService.consume).not.toHaveBeenCalled();
  });

  it('throws ConflictException and consumes nothing when the work order is not IN_PROGRESS', async () => {
    workOrder.status = WorkOrderStatus.OPEN;

    await expect(
      service.complete(
        'wo-1',
        { parts: [{ sparePartId: 'part-1', quantityUsed: 1 }] },
        technician,
      ),
    ).rejects.toThrow(ConflictException);
    expect(inventoryService.consume).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('completes with sufficient stock and produces all six side effects', async () => {
    inventoryService.consume.mockResolvedValue({
      sparePart: { id: 'part-1', sku: 'SKU-1', unitCost: 12.5 },
      transaction: { id: 'txn-1' },
    });

    const result = await service.complete(
      'wo-1',
      { parts: [{ sparePartId: 'part-1', quantityUsed: 2 }] },
      technician,
    );

    // (b)+(c) part locked/consumed via the shared InventoryService, one row per part
    expect(inventoryService.consume).toHaveBeenCalledWith(
      manager,
      'part-1',
      2,
      { workOrderId: 'wo-1', createdByUserId: technician.id },
    );
    expect(result.workOrderParts).toEqual([
      expect.objectContaining({
        workOrderId: 'wo-1',
        sparePartId: 'part-1',
        quantityUsed: 2,
        unitCostAtCompletion: 12.5,
      } as Partial<WorkOrderPart>),
    ]);

    // (d) work order completed, cost totalled
    expect(result.status).toBe(WorkOrderStatus.COMPLETED);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.totalCost).toBe(25);

    // (e) asset reverted to OPERATIONAL
    expect(asset.status).toBe(AssetStatus.OPERATIONAL);

    // (f) originating plan rolled forward
    expect(plan.lastCompletedAt).toBeInstanceOf(Date);
    expect(plan.nextDueAt).toBeInstanceOf(Date);
    expect(plan.nextDueAt!.getTime()).toBeGreaterThan(Date.now());

    // (g) both audit entries, same manager, correct before/after
    expect(auditService.record).toHaveBeenCalledTimes(2);
    expect(auditService.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        entityType: 'WorkOrder',
        entityId: 'wo-1',
        action: 'COMPLETE',
        after: expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        entityType: 'Asset',
        entityId: 'asset-1',
        action: 'STATUS_CHANGE',
        before: { status: AssetStatus.CRITICAL },
        after: { status: AssetStatus.OPERATIONAL },
        source: 'work-order-completion',
      }),
    );
  });

  it('completes with no parts: skips inventory entirely and totals cost to 0', async () => {
    const result = await service.complete('wo-1', {}, technician);

    expect(inventoryService.consume).not.toHaveBeenCalled();
    expect(result.totalCost).toBe(0);
    expect(result.workOrderParts).toEqual([]);
  });

  it('does not touch a maintenance plan when the work order has none', async () => {
    workOrder.maintenancePlanId = null;

    await service.complete('wo-1', {}, technician);

    expect(manager.findOneBy).not.toHaveBeenCalledWith(
      MaintenancePlan,
      expect.anything(),
    );
  });

  it('allows a supervisor who is not the assignee to complete it', async () => {
    workOrder.assignedToUserId = 'someone-else';

    await expect(
      service.complete('wo-1', {}, supervisor),
    ).resolves.toBeDefined();
  });
});
