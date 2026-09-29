import { In } from 'typeorm';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ACTIVE_WORK_ORDER_STATUSES } from './condition-monitoring.service';
import { ScheduledChecksService } from './scheduled-checks.service';
import { Logger } from '@nestjs/common';

describe('ScheduledChecksService', () => {
  let service: ScheduledChecksService;
  let maintenancePlansService: { findAllDue: jest.Mock };
  let inventoryService: { findAllLowStock: jest.Mock };
  let notificationsService: {
    hasActiveNotification: jest.Mock;
    record: jest.Mock;
  };
  let dataSource: { manager: { findOne: jest.Mock } };
  let workOrderRepo: { exists: jest.Mock };
  let aiInsightsService: { generate: jest.Mock };

  const plan = {
    id: 'plan-1',
    assetId: 'asset-1',
    name: 'Quarterly lubrication',
    intervalDays: 90,
    nextDueAt: new Date('2026-09-20T00:00:00.000Z'),
  };

  const part = {
    id: 'part-1',
    sku: 'BRG-6205',
    name: 'Bearing 6205',
    quantityOnHand: 2,
    reorderThreshold: 5,
  };

  beforeEach(() => {
    maintenancePlansService = { findAllDue: jest.fn() };
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    inventoryService = { findAllLowStock: jest.fn() };
    notificationsService = {
      hasActiveNotification: jest.fn(),
      record: jest.fn(async () => ({})),
    };
    dataSource = { manager: { findOne: jest.fn().mockResolvedValue(null) } };
    workOrderRepo = { exists: jest.fn() };
    aiInsightsService = { generate: jest.fn().mockResolvedValue(null) };

    service = new ScheduledChecksService(
      maintenancePlansService as any,
      inventoryService as any,
      notificationsService as any,
      dataSource as any,
      workOrderRepo as any,
      aiInsightsService as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkOverdueMaintenance', () => {
    it('does nothing when no plans are due', async () => {
      maintenancePlansService.findAllDue.mockResolvedValue([]);

      await service.checkOverdueMaintenance();

      expect(workOrderRepo.exists).not.toHaveBeenCalled();
      expect(notificationsService.hasActiveNotification).not.toHaveBeenCalled();
      expect(notificationsService.record).not.toHaveBeenCalled();
    });

    it('creates an OVERDUE_MAINTENANCE notification for a due plan with no open work order and no existing notification', async () => {
      maintenancePlansService.findAllDue.mockResolvedValue([plan]);
      workOrderRepo.exists.mockResolvedValue(false);
      notificationsService.hasActiveNotification.mockResolvedValue(false);

      await service.checkOverdueMaintenance();

      expect(workOrderRepo.exists).toHaveBeenCalledWith({
        where: {
          maintenancePlanId: plan.id,
          status: In(ACTIVE_WORK_ORDER_STATUSES),
        },
      });
      expect(notificationsService.hasActiveNotification).toHaveBeenCalledWith(
        NotificationType.OVERDUE_MAINTENANCE,
        'MaintenancePlan',
        plan.id,
      );
      expect(notificationsService.record).toHaveBeenCalledWith(
        dataSource.manager,
        expect.objectContaining({
          type: NotificationType.OVERDUE_MAINTENANCE,
          relatedEntityType: 'MaintenancePlan',
          relatedEntityId: plan.id,
          message: expect.stringContaining(plan.name),
        }),
      );
    });

    it('skips a due plan that already has an open work order, without checking notifications', async () => {
      maintenancePlansService.findAllDue.mockResolvedValue([plan]);
      workOrderRepo.exists.mockResolvedValue(true);

      await service.checkOverdueMaintenance();

      expect(notificationsService.hasActiveNotification).not.toHaveBeenCalled();
      expect(notificationsService.record).not.toHaveBeenCalled();
    });

    it('skips a due plan that already has an active notification (no re-notify every hour)', async () => {
      maintenancePlansService.findAllDue.mockResolvedValue([plan]);
      workOrderRepo.exists.mockResolvedValue(false);
      notificationsService.hasActiveNotification.mockResolvedValue(true);

      await service.checkOverdueMaintenance();

      expect(notificationsService.record).not.toHaveBeenCalled();
    });
    it('attaches the AI note to the notification, building context from the plan and its asset', async () => {
      maintenancePlansService.findAllDue.mockResolvedValue([plan]);
      workOrderRepo.exists.mockResolvedValue(false);
      notificationsService.hasActiveNotification.mockResolvedValue(false);
      dataSource.manager.findOne.mockResolvedValue({
        tag: 'PUMP-01',
        criticality: 'HIGH',
        assetType: { name: 'Pump' },
      });
      aiInsightsService.generate.mockResolvedValue(
        'Possibly worn lubricant. Check the oil level first.',
      );

      await service.checkOverdueMaintenance();

      expect(aiInsightsService.generate).toHaveBeenCalledWith({
        kind: 'OVERDUE_MAINTENANCE',
        asset: { tag: 'PUMP-01', typeName: 'Pump', criticality: 'HIGH' },
        planName: plan.name,
        intervalDays: plan.intervalDays,
        dueAt: plan.nextDueAt,
      });
      expect(notificationsService.record).toHaveBeenCalledWith(
        dataSource.manager,
        expect.objectContaining({
          aiNote: 'Possibly worn lubricant. Check the oil level first.',
        }),
      );
    });

    it('still creates the notification with aiNote null when the AI returns nothing and the asset is missing', async () => {
      maintenancePlansService.findAllDue.mockResolvedValue([plan]);
      workOrderRepo.exists.mockResolvedValue(false);
      notificationsService.hasActiveNotification.mockResolvedValue(false);
      dataSource.manager.findOne.mockResolvedValue(null);
      aiInsightsService.generate.mockResolvedValue(null);

      await service.checkOverdueMaintenance();

      expect(aiInsightsService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'OVERDUE_MAINTENANCE', asset: null }),
      );
      expect(notificationsService.record).toHaveBeenCalledWith(
        dataSource.manager,
        expect.objectContaining({
          type: NotificationType.OVERDUE_MAINTENANCE,
          aiNote: null,
        }),
      );
    });

    it('does not call the AI for a plan that is skipped', async () => {
      maintenancePlansService.findAllDue.mockResolvedValue([plan]);
      workOrderRepo.exists.mockResolvedValue(false);
      notificationsService.hasActiveNotification.mockResolvedValue(true);

      await service.checkOverdueMaintenance();

      expect(aiInsightsService.generate).not.toHaveBeenCalled();
    });
  });

  describe('checkLowStock', () => {
    it('does nothing when no parts are low on stock', async () => {
      inventoryService.findAllLowStock.mockResolvedValue([]);

      await service.checkLowStock();

      expect(notificationsService.hasActiveNotification).not.toHaveBeenCalled();
      expect(notificationsService.record).not.toHaveBeenCalled();
    });

    it('creates a LOW_STOCK notification for a part at/below threshold with no existing notification', async () => {
      inventoryService.findAllLowStock.mockResolvedValue([part]);
      notificationsService.hasActiveNotification.mockResolvedValue(false);

      await service.checkLowStock();

      expect(notificationsService.hasActiveNotification).toHaveBeenCalledWith(
        NotificationType.LOW_STOCK,
        'SparePart',
        part.id,
      );
      expect(notificationsService.record).toHaveBeenCalledWith(
        dataSource.manager,
        expect.objectContaining({
          type: NotificationType.LOW_STOCK,
          relatedEntityType: 'SparePart',
          relatedEntityId: part.id,
          message: expect.stringContaining(part.sku),
        }),
      );
    });

    it('skips a part that already has an active LOW_STOCK notification (transition-only dedup)', async () => {
      inventoryService.findAllLowStock.mockResolvedValue([part]);
      notificationsService.hasActiveNotification.mockResolvedValue(true);

      await service.checkLowStock();

      expect(notificationsService.record).not.toHaveBeenCalled();
    });

    it('reconciles multiple low-stock parts independently in one run', async () => {
      const partTwo = {
        ...part,
        id: 'part-2',
        sku: 'SEAL-40',
        quantityOnHand: 0,
        reorderThreshold: 3,
      };
      inventoryService.findAllLowStock.mockResolvedValue([part, partTwo]);
      notificationsService.hasActiveNotification
        .mockResolvedValueOnce(false) // part -> not yet notified, create one
        .mockResolvedValueOnce(true); // partTwo -> already notified, skip

      await service.checkLowStock();

      expect(notificationsService.record).toHaveBeenCalledTimes(1);
      expect(notificationsService.record).toHaveBeenCalledWith(
        dataSource.manager,
        expect.objectContaining({ relatedEntityId: part.id }),
      );
    });

    it('attaches the AI note to the LOW_STOCK notification', async () => {
      inventoryService.findAllLowStock.mockResolvedValue([part]);
      notificationsService.hasActiveNotification.mockResolvedValue(false);
      aiInsightsService.generate.mockResolvedValue(
        'Possibly heavy recent usage. Check open work orders consuming this part.',
      );

      await service.checkLowStock();

      expect(aiInsightsService.generate).toHaveBeenCalledWith({
        kind: 'LOW_STOCK',
        partName: part.name,
        sku: part.sku,
        quantityOnHand: part.quantityOnHand,
        reorderThreshold: part.reorderThreshold,
      });
      expect(notificationsService.record).toHaveBeenCalledWith(
        dataSource.manager,
        expect.objectContaining({
          aiNote:
            'Possibly heavy recent usage. Check open work orders consuming this part.',
        }),
      );
    });

    it('still creates the notification with aiNote null when the AI returns nothing', async () => {
      inventoryService.findAllLowStock.mockResolvedValue([part]);
      notificationsService.hasActiveNotification.mockResolvedValue(false);
      aiInsightsService.generate.mockResolvedValue(null);

      await service.checkLowStock();

      expect(notificationsService.record).toHaveBeenCalledWith(
        dataSource.manager,
        expect.objectContaining({
          type: NotificationType.LOW_STOCK,
          aiNote: null,
        }),
      );
    });

    it('does not call the AI for a part that already has an active notification', async () => {
      inventoryService.findAllLowStock.mockResolvedValue([part]);
      notificationsService.hasActiveNotification.mockResolvedValue(true);

      await service.checkLowStock();

      expect(aiInsightsService.generate).not.toHaveBeenCalled();
    });
  });
});
