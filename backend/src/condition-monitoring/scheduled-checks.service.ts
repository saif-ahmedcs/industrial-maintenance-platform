import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { MaintenancePlansService } from '../maintenance-plans/maintenance-plans.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { ACTIVE_WORK_ORDER_STATUSES } from './condition-monitoring.service';

@Injectable()
export class ScheduledChecksService {
  private readonly logger = new Logger(ScheduledChecksService.name);

  constructor(
    private readonly maintenancePlansService: MaintenancePlansService,
    private readonly inventoryService: InventoryService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueMaintenance(): Promise<void> {
    const duePlans = await this.maintenancePlansService.findAllDue();

    for (const plan of duePlans) {
      const hasOpenWorkOrder = await this.workOrderRepo.exists({
        where: {
          maintenancePlanId: plan.id,
          status: In(ACTIVE_WORK_ORDER_STATUSES),
        },
      });
      if (hasOpenWorkOrder) {
        continue;
      }

      const alreadyNotified =
        await this.notificationsService.hasActiveNotification(
          NotificationType.OVERDUE_MAINTENANCE,
          'MaintenancePlan',
          plan.id,
        );
      if (alreadyNotified) {
        continue;
      }

      await this.notificationsService.record(this.dataSource.manager, {
        type: NotificationType.OVERDUE_MAINTENANCE,
        relatedEntityType: 'MaintenancePlan',
        relatedEntityId: plan.id,
        message: `Maintenance plan "${plan.name}" is overdue (was due ${plan.nextDueAt?.toISOString()}).`,
      });
    }

    if (duePlans.length > 0) {
      this.logger.log(
        `Overdue maintenance check: ${duePlans.length} plan(s) due, notifications reconciled.`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStock(): Promise<void> {
    const lowStockParts = await this.inventoryService.findAllLowStock();

    for (const part of lowStockParts) {
      const alreadyNotified =
        await this.notificationsService.hasActiveNotification(
          NotificationType.LOW_STOCK,
          'SparePart',
          part.id,
        );
      if (alreadyNotified) {
        continue;
      }

      await this.notificationsService.record(this.dataSource.manager, {
        type: NotificationType.LOW_STOCK,
        relatedEntityType: 'SparePart',
        relatedEntityId: part.id,
        message: `Spare part ${part.sku} (${part.name}) is at or below its reorder threshold: ${part.quantityOnHand}/${part.reorderThreshold}.`,
      });
    }

    if (lowStockParts.length > 0) {
      this.logger.log(
        `Low-stock check: ${lowStockParts.length} part(s) at/below threshold, notifications reconciled.`,
      );
    }
  }
}
