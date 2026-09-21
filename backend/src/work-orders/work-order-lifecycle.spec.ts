import { ConflictException } from '@nestjs/common';
import { WorkOrderStatus } from './entities/work-order.entity';
import { assertValidWorkOrderTransition } from './work-order-lifecycle';

describe('assertValidWorkOrderTransition', () => {
  const ALL_STATUSES = Object.values(WorkOrderStatus);

  const EXPECTED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    [WorkOrderStatus.OPEN]: [
      WorkOrderStatus.ASSIGNED,
      WorkOrderStatus.CANCELLED,
    ],
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

  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      const isAllowed = EXPECTED_TRANSITIONS[from].includes(to);

      if (isAllowed) {
        it(`allows ${from} -> ${to}`, () => {
          expect(() => assertValidWorkOrderTransition(from, to)).not.toThrow();
        });
      } else {
        it(`rejects ${from} -> ${to}`, () => {
          expect(() => assertValidWorkOrderTransition(from, to)).toThrow(
            ConflictException,
          );
        });
      }
    }
  }
});
