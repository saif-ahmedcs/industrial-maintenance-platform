import { ConflictException } from '@nestjs/common';
import { WorkOrderStatus } from './entities/work-order.entity';

const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.OPEN]: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.ASSIGNED]: [
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.IN_PROGRESS]: [
    WorkOrderStatus.COMPLETED,
    WorkOrderStatus.BLOCKED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.BLOCKED]: [
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.COMPLETED]: [],
  [WorkOrderStatus.CANCELLED]: [],
};

export function assertValidWorkOrderTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ConflictException(
      `Cannot transition work order from ${from} to ${to}`,
    );
  }
}
