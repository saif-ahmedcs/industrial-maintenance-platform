import { ApiProperty } from '@nestjs/swagger';
import {
  WorkOrder,
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
} from '../entities/work-order.entity';

export class WorkOrderPartResponseDto {
  @ApiProperty()
  sparePartId: string;

  @ApiProperty()
  quantityUsed: number;

  @ApiProperty({
    description: 'Unit cost captured at the moment of completion',
  })
  unitCostAtCompletion: number;
}

export class WorkOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  assetId: string;

  @ApiProperty({ nullable: true, description: 'Null when source=AUTO' })
  maintenancePlanId: string | null;

  @ApiProperty({ enum: WorkOrderStatus })
  status: WorkOrderStatus;

  @ApiProperty({ enum: WorkOrderSource })
  source: WorkOrderSource;

  @ApiProperty({ enum: WorkOrderPriority })
  priority: WorkOrderPriority;

  @ApiProperty({ nullable: true })
  assignedToUserId: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty()
  openedAt: Date;

  @ApiProperty({ nullable: true })
  assignedAt: Date | null;

  @ApiProperty({ nullable: true })
  startedAt: Date | null;

  @ApiProperty({ nullable: true })
  completedAt: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({ nullable: true })
  totalCost: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'AI-generated diagnostic note, present only when enabled and successful',
  })
  aiNote: string | null;

  @ApiProperty({ type: () => WorkOrderPartResponseDto, isArray: true })
  parts: WorkOrderPartResponseDto[];

  static fromEntity(workOrder: WorkOrder): WorkOrderResponseDto {
    const dto = new WorkOrderResponseDto();
    dto.id = workOrder.id;
    dto.assetId = workOrder.assetId;
    dto.maintenancePlanId = workOrder.maintenancePlanId;
    dto.status = workOrder.status;
    dto.source = workOrder.source;
    dto.priority = workOrder.priority;
    dto.assignedToUserId = workOrder.assignedToUserId;
    dto.description = workOrder.description;
    dto.openedAt = workOrder.openedAt;
    dto.assignedAt = workOrder.assignedAt;
    dto.startedAt = workOrder.startedAt;
    dto.completedAt = workOrder.completedAt;
    dto.cancelledAt = workOrder.cancelledAt;
    dto.totalCost = workOrder.totalCost;
    dto.aiNote = workOrder.aiNote ?? null;
    dto.parts = (workOrder.workOrderParts ?? []).map((part) => ({
      sparePartId: part.sparePartId,
      quantityUsed: part.quantityUsed,
      unitCostAtCompletion: part.unitCostAtCompletion,
    }));
    return dto;
  }
}
