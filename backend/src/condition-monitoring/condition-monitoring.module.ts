import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetHistoryModule } from '../asset-history/asset-history.module';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MaintenancePlansModule } from '../maintenance-plans/maintenance-plans.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiInsightsModule } from '../ai-insights/ai-insights.module';
import { TelemetryReading } from '../telemetry/entities/telemetry-reading.entity';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { ConditionMonitoringProcessor } from './condition-monitoring.processor';
import { ConditionMonitoringService } from './condition-monitoring.service';
import { ScheduledChecksService } from './scheduled-checks.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'telemetry-processing' }),
    TypeOrmModule.forFeature([TelemetryReading, WorkOrder]),
    AuditModule,
    AssetHistoryModule,
    NotificationsModule,
    MaintenancePlansModule,
    InventoryModule,
    AiInsightsModule,
  ],
  providers: [
    ConditionMonitoringService,
    ConditionMonitoringProcessor,
    ScheduledChecksService,
  ],
})
export class ConditionMonitoringModule {}
