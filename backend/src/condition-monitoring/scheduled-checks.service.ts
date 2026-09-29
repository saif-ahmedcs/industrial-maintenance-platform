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
import { AiInsightsService } from '../ai-insights/ai-insights.service';
import { Asset } from '../assets/entities/asset.entity';

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
    private readonly aiInsightsService: AiInsightsService,
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

      const asset = await this.dataSource.manager.findOne(Asset, {
        where: { id: plan.assetId },
        relations: { assetType: true },
      });

      const aiNote = await this.aiInsightsService.generate({
        kind: 'OVERDUE_MAINTENANCE',
        asset: asset
          ? {
              tag: asset.tag,
              typeName: asset.assetType?.name ?? null,
              criticality: asset.criticality,
            }
          : null,
        planName: plan.name,
        intervalDays: plan.intervalDays,
        dueAt: plan.nextDueAt,
      });

      await this.notificationsService.record(this.dataSource.manager, {
        type: NotificationType.OVERDUE_MAINTENANCE,
        relatedEntityType: 'MaintenancePlan',
        relatedEntityId: plan.id,
        message: `Maintenance plan "${plan.name}" is overdue (was due ${plan.nextDueAt?.toISOString()}).`,
        aiNote,
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

      const aiNote = await this.aiInsightsService.generate({
        kind: 'LOW_STOCK',
        partName: part.name,
        sku: part.sku,
        quantityOnHand: part.quantityOnHand,
        reorderThreshold: part.reorderThreshold,
      });

      await this.notificationsService.record(this.dataSource.manager, {
        type: NotificationType.LOW_STOCK,
        relatedEntityType: 'SparePart',
        relatedEntityId: part.id,
        message: `Spare part ${part.sku} (${part.name}) is at or below its reorder threshold: ${part.quantityOnHand}/${part.reorderThreshold}.`,
        aiNote,
      });
    }

    if (lowStockParts.length > 0) {
      this.logger.log(
        `Low-stock check: ${lowStockParts.length} part(s) at/below threshold, notifications reconciled.`,
      );
    }
  }
}
