import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { WorkOrder } from './entities/work-order.entity';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkOrder, WorkOrderPart]),
    AuditModule,
    InventoryModule,
  ],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
