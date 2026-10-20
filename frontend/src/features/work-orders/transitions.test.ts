import { describe, expect, it } from 'vitest';
import type { WorkOrderStatus } from './api';
import { actionTargetStatus, nextActions } from './transitions';

const BACKEND_ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> =
  {
    OPEN: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'BLOCKED', 'CANCELLED'],
    BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

const ALL_STATUSES = Object.keys(
  BACKEND_ALLOWED_TRANSITIONS,
) as WorkOrderStatus[];

describe('nextActions', () => {
  it.each(ALL_STATUSES)(
    'every action offered for %s targets a status the backend allows',
    (status) => {
      for (const action of nextActions[status]) {
        const target = actionTargetStatus[action];
        expect(BACKEND_ALLOWED_TRANSITIONS[status]).toContain(target);
      }
    },
  );

  it('offers no action for a terminal status', () => {
    expect(nextActions.COMPLETED).toEqual([]);
    expect(nextActions.CANCELLED).toEqual([]);
  });

  it('does not expose a block action, even though the backend lifecycle allows it', () => {
    // IN_PROGRESS -> BLOCKED is a real backend transition, but there is no
    // PATCH /work-orders/:id/block endpoint yet. If the backend ships one,
    // update nextActions.IN_PROGRESS and delete this assertion.
    expect(BACKEND_ALLOWED_TRANSITIONS.IN_PROGRESS).toContain('BLOCKED');
    for (const status of ALL_STATUSES) {
      expect(nextActions[status]).not.toContain('block');
    }
  });
});
