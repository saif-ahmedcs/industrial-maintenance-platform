import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AssetHistoryService } from '../asset-history/asset-history.service';
import { AuditService } from '../audit/audit.service';
import { Asset, AssetStatus } from '../assets/entities/asset.entity';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AiInsightsService } from '../ai-insights/ai-insights.service';
import { TelemetryReading } from '../telemetry/entities/telemetry-reading.entity';
import {
  WorkOrder,
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
} from '../work-orders/entities/work-order.entity';
import {
  CONSECUTIVE_HOT_READINGS_REQUIRED,
  HOT_TEMPERATURE_THRESHOLD_C,
  tripsHotTemperatureRule,
} from './hot-temperature.rule';

export const ACTIVE_WORK_ORDER_STATUSES = [
  WorkOrderStatus.OPEN,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.BLOCKED,
];

const AUTO_SOURCE = 'auto:condition-monitoring';

@Injectable()
export class ConditionMonitoringService {
  private readonly logger = new Logger(ConditionMonitoringService.name);

  constructor(
    @InjectRepository(TelemetryReading)
    private readonly readingRepo: Repository<TelemetryReading>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly assetHistoryService: AssetHistoryService,
    private readonly notificationsService: NotificationsService,
    private readonly aiInsightsService: AiInsightsService,
  ) {}

  async evaluateAsset(assetId: string): Promise<void> {
    const recent = await this.readingRepo.find({
      where: { assetId },
      order: { ingestedAt: 'DESC' },
      take: CONSECUTIVE_HOT_READINGS_REQUIRED,
    });

    if (!tripsHotTemperatureRule(recent)) {
      return;
    }

    const hasActiveAutoWorkOrder = await this.workOrderRepo.exists({
      where: {
        assetId,
        source: WorkOrderSource.AUTO,
        status: In(ACTIVE_WORK_ORDER_STATUSES),
      },
    });
    if (hasActiveAutoWorkOrder) {
      return;
    }

    const assetForContext = await this.dataSource.manager.findOne(Asset, {
      where: { id: assetId },
      relations: { assetType: true },
    });

    const aiNote = assetForContext
      ? await this.aiInsightsService.generate({
          kind: 'HOT_TEMPERATURE',
          asset: {
            tag: assetForContext.tag,
            typeName: assetForContext.assetType?.name ?? null,
            criticality: assetForContext.criticality,
          },
          thresholdC: HOT_TEMPERATURE_THRESHOLD_C,
          readings: recent.map((reading) => ({
            temperature: reading.temperature,
            vibration: reading.vibration,
            pressure: reading.pressure,
            recordedAt: reading.recordedAt,
          })),
        })
      : null;

    await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOneBy(Asset, { id: assetId });
      if (!asset) {
        this.logger.warn(
          `Condition monitoring: asset ${assetId} no longer exists, skipping`,
        );
        return;
      }

      const statusBefore = asset.status;
      asset.status = AssetStatus.CRITICAL;
      const savedAsset = await manager.save(asset);

      await this.auditService.record(manager, {
        actorUserId: null,
        entityType: 'Asset',
        entityId: savedAsset.id,
        action: 'STATUS_CHANGE',
        before: { status: statusBefore },
        after: { status: savedAsset.status },
        source: AUTO_SOURCE,
      });

      await this.assetHistoryService.record(manager, {
        assetId: savedAsset.id,
        previousStatus: statusBefore,
        newStatus: savedAsset.status,
        changedByUserId: null,
        source: AUTO_SOURCE,
      });

      const description = `Auto-generated: asset ${savedAsset.tag} recorded ${CONSECUTIVE_HOT_READINGS_REQUIRED} consecutive readings above ${HOT_TEMPERATURE_THRESHOLD_C}°C.`;

      const workOrder = manager.create(WorkOrder, {
        assetId: savedAsset.id,
        maintenancePlanId: null,
        status: WorkOrderStatus.OPEN,
        source: WorkOrderSource.AUTO,
        priority: WorkOrderPriority.CRITICAL,
        description,
        aiNote,
      });
      const savedWorkOrder = await manager.save(workOrder);

      await this.auditService.record(manager, {
        actorUserId: null,
        entityType: 'WorkOrder',
        entityId: savedWorkOrder.id,
        action: 'AUTO_CREATE',
        before: null,
        after: {
          assetId: savedWorkOrder.assetId,
          status: savedWorkOrder.status,
          source: savedWorkOrder.source,
          priority: savedWorkOrder.priority,
        },
        source: AUTO_SOURCE,
      });

      await this.notificationsService.record(manager, {
        type: NotificationType.CRITICAL_ASSET,
        relatedEntityType: 'Asset',
        relatedEntityId: savedAsset.id,
        message: `Asset ${savedAsset.tag} is CRITICAL: ${CONSECUTIVE_HOT_READINGS_REQUIRED} consecutive readings above ${HOT_TEMPERATURE_THRESHOLD_C}°C.`,
        aiNote,
      });

      this.logger.warn(
        `Condition monitoring: asset ${savedAsset.tag} (${savedAsset.id}) marked CRITICAL, work order ${savedWorkOrder.id} opened`,
      );
    });
  }
}
