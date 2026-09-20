import {
  WorkOrder,
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
} from '../entities/work-order.entity';

export class WorkOrderPartResponseDto {
  sparePartId: string;
  quantityUsed: number;
  unitCostAtCompletion: number;
}

export class WorkOrderResponseDto {
  id: string;
  assetId: string;
  maintenancePlanId: string | null;
  status: WorkOrderStatus;
  source: WorkOrderSource;
  priority: WorkOrderPriority;
  assignedToUserId: string | null;
  description: string;
  openedAt: Date;
  assignedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  totalCost: number | null;
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
    dto.parts = (workOrder.workOrderParts ?? []).map((part) => ({
      sparePartId: part.sparePartId,
      quantityUsed: part.quantityUsed,
      unitCostAtCompletion: part.unitCostAtCompletion,
    }));
    return dto;
  }
}
