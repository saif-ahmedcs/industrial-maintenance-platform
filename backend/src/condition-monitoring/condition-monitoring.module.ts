import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetHistoryModule } from '../asset-history/asset-history.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelemetryReading } from '../telemetry/entities/telemetry-reading.entity';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { ConditionMonitoringProcessor } from './condition-monitoring.processor';
import { ConditionMonitoringService } from './condition-monitoring.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'telemetry-processing' }),
    TypeOrmModule.forFeature([TelemetryReading, WorkOrder]),
    AuditModule,
    AssetHistoryModule,
    NotificationsModule,
  ],
  providers: [ConditionMonitoringService, ConditionMonitoringProcessor],
})
export class ConditionMonitoringModule {}
