import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { EmptyState } from '../../design/EmptyState';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Panel } from '../../design/Panel';
import { Skeleton } from '../../design/Skeleton';
import { StatusTag } from '../../design/StatusTag';
import { Surface } from '../../design/Surface';
import { Table, type TableColumn } from '../../design/Table';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { can, type Role } from '../../lib/auth/roles';
import { useSession } from '../../lib/auth/session';
import { formatDateTime } from '../../lib/format';
import { getAsset } from '../assets/api';
import { getSparePart } from '../spare-parts/api';
import {
  assignWorkOrder,
  cancelWorkOrder,
  completeWorkOrder,
  getWorkOrder,
  startWorkOrder,
  type WorkOrderPart,
} from './api';
import { actionLabel, nextActions, type WorkOrderAction } from './transitions';

function workOrderReference(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function toTitleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load this right now.';
}

function canPerform(action: WorkOrderAction, roles: Role[]): boolean {
  if (action === 'cancel') return can.cancelWorkOrder(roles);
  return can.transitionWorkOrder(roles);
}

const TIMELINE_FIELDS: {
  key: 'openedAt' | 'assignedAt' | 'startedAt' | 'completedAt' | 'cancelledAt';
  label: string;
}[] = [
  { key: 'openedAt', label: 'Opened' },
  { key: 'assignedAt', label: 'Assigned' },
  { key: 'startedAt', label: 'Started' },
  { key: 'completedAt', label: 'Completed' },
  { key: 'cancelledAt', label: 'Cancelled' },
];

function SparePartNameCell({ sparePartId }: { sparePartId: string }) {
  const { data, isPending } = useQuery({
    queryKey: ['spare-parts', 'detail', sparePartId],
    queryFn: () => getSparePart(sparePartId),
    staleTime: 5 * 60_000,
  });

  if (isPending) {
    return (
      <span
        className="inline-block h-4 w-20 animate-pulse rounded-small bg-surface-abyss"
        aria-hidden="true"
      />
    );
  }

  return <>{data?.name ?? '—'}</>;
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const roles = user?.roles ?? [];

  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const showCreatedBanner = Boolean(
    (location.state as { created?: boolean } | null)?.created,
  );

  const workOrderQuery = useQuery({
    queryKey: ['work-orders', 'detail', id],
    queryFn: () => getWorkOrder(id as string),
    enabled: Boolean(id),
  });

  const workOrder = workOrderQuery.data;

  const assetQuery = useQuery({
    queryKey: ['assets', 'detail', workOrder?.assetId],
    queryFn: () => getAsset(workOrder?.assetId as string),
    enabled: Boolean(workOrder),
  });

  function invalidateAfterTransition() {
    void queryClient.invalidateQueries({
      queryKey: ['work-orders', 'detail', id],
    });
    void queryClient.invalidateQueries({ queryKey: ['work-orders', 'list'] });
    if (workOrder) {
      void queryClient.invalidateQueries({
        queryKey: ['assets', 'detail', workOrder.assetId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['assets', 'history', workOrder.assetId],
      });
    }
  }

  function handleTransitionError(error: unknown) {
    if (error instanceof ApiError && error.status === 409) {
      // Someone else changed this work order. Show the server's message,
      // then refetch so the action buttons rebuild from the real status
      // instead of the one we thought we had.
      setActionError(toUserMessage(error).message);
      void queryClient.invalidateQueries({
        queryKey: ['work-orders', 'detail', id],
      });
      return;
    }
    setActionError(
      error instanceof ApiError
        ? toUserMessage(error).message
        : 'Could not update this work order. Try again.',
    );
  }

  const assignMutation = useMutation({
    mutationFn: () => assignWorkOrder(id as string),
    onSuccess: () => {
      setActionError(null);
      invalidateAfterTransition();
    },
    onError: handleTransitionError,
  });

  const startMutation = useMutation({
    mutationFn: () => startWorkOrder(id as string),
    onSuccess: () => {
      setActionError(null);
      invalidateAfterTransition();
    },
    onError: handleTransitionError,
  });

  const completeMutation = useMutation({
    mutationFn: () => completeWorkOrder(id as string),
    onSuccess: () => {
      setActionError(null);
      invalidateAfterTransition();
    },
    onError: handleTransitionError,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelWorkOrder(id as string),
    onSuccess: () => {
      setActionError(null);
      setConfirmingCancel(false);
      invalidateAfterTransition();
    },
    onError: (error) => {
      setConfirmingCancel(false);
      handleTransitionError(error);
    },
  });

  const mutationForAction: Record<
    WorkOrderAction,
    { isPending: boolean; run: () => void }
  > = {
    assign: {
      isPending: assignMutation.isPending,
      run: () => assignMutation.mutate(),
    },
    start: {
      isPending: startMutation.isPending,
      run: () => startMutation.mutate(),
    },
    complete: {
      isPending: completeMutation.isPending,
      run: () => completeMutation.mutate(),
    },
    cancel: {
      isPending: cancelMutation.isPending,
      run: () => setConfirmingCancel(true),
    },
  };

  if (workOrderQuery.isPending) {
    return (
      <div className="flex flex-col gap-8">
        <Surface tone="kelp">
          <Skeleton lines={3} height={20} />
        </Surface>
      </div>
    );
  }

  if (workOrderQuery.isError) {
    if (
      workOrderQuery.error instanceof ApiError &&
      workOrderQuery.error.status === 404
    ) {
      return (
        <EmptyState
          title="Work order not found"
          body="This work order doesn't exist or may have been removed."
          action={
            <Button variant="primary" onClick={() => navigate('/work-orders')}>
              Back to work orders
            </Button>
          }
        />
      );
    }

    return (
      <ErrorState
        error={errorMessage(workOrderQuery.error)}
        onRetry={() => workOrderQuery.refetch()}
      />
    );
  }

  if (!workOrder) return null;

  const reference = workOrderReference(workOrder.id);
  const actions = nextActions[workOrder.status].filter((action) =>
    canPerform(action, roles),
  );
  const parts = workOrder.parts;
  const timelineEntries = TIMELINE_FIELDS.filter(
    (field) => workOrder[field.key],
  );

  const partColumns: TableColumn<WorkOrderPart>[] = [
    {
      key: 'sparePartId',
      header: 'Part',
      render: (row) => <SparePartNameCell sparePartId={row.sparePartId} />,
    },
    { key: 'quantityUsed', header: 'Quantity', align: 'right' },
    {
      key: 'unitCostAtCompletion',
      header: 'Unit cost',
      align: 'right',
      render: (row) => row.unitCostAtCompletion.toFixed(2),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Button variant="ghost" onClick={() => navigate('/work-orders')}>
        ← Work orders
      </Button>

      {showCreatedBanner && (
        <p
          role="status"
          className="font-display text-body font-normal text-text-mist"
        >
          Work order created.
        </p>
      )}

      <Surface tone="kelp" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-display text-caption font-normal uppercase text-text-silver">
              {reference}
            </span>
            <h1 className="font-display text-subheading font-medium text-text-platinum">
              {assetQuery.data?.tag ?? '—'}
            </h1>
            <p className="font-display text-meta font-normal text-text-silver">
              {toTitleCase(workOrder.priority)} priority
            </p>
            <p className="font-display text-body font-normal text-text-silver">
              {workOrder.description}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusTag status={workOrder.status} />
            {workOrder.source === 'AUTO' && (
              <StatusTag status="AUTO" showDot={false} />
            )}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {actions.map((action) => (
              <Button
                key={action}
                variant={action === 'cancel' ? 'ghost' : 'primary'}
                loading={mutationForAction[action].isPending}
                onClick={() => mutationForAction[action].run()}
              >
                {actionLabel[action]}
              </Button>
            ))}
          </div>
        )}

        {actionError && (
          <p role="alert" className="font-ui text-ui text-accent-lavender">
            {actionError}
          </p>
        )}
      </Surface>

      {workOrder.aiNote && (
        <Panel padding="dense" className="flex flex-col gap-1">
          <span className="font-display text-caption font-normal uppercase text-text-silver">
            Diagnostic note
          </span>
          <p className="font-ui text-ui font-normal text-text-ash">
            {workOrder.aiNote}
          </p>
        </Panel>
      )}

      {parts.length > 0 && (
        <div className="flex flex-col gap-3">
          <Eyebrow tone="silver" size="label">
            Parts used
          </Eyebrow>
          <Table
            columns={partColumns}
            rows={parts}
            rowKey={(row) => row.sparePartId}
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Eyebrow tone="silver" size="label">
          Timeline
        </Eyebrow>
        <Surface tone="kelp" className="flex flex-col gap-2">
          {timelineEntries.map((field) => (
            <div key={field.key} className="flex items-center justify-between">
              <span className="font-display text-body font-normal text-text-silver">
                {field.label}
              </span>
              <span className="font-display text-body font-normal text-text-platinum">
                {formatDateTime(workOrder[field.key] as string)}
              </span>
            </div>
          ))}
        </Surface>
      </div>

      <Dialog
        open={confirmingCancel}
        title="Cancel work order?"
        onClose={() => setConfirmingCancel(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>
              Keep work order
            </Button>
            <Button
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Cancel work order
            </Button>
          </>
        }
      >
        <p className="font-display text-body font-normal text-text-silver">
          This cancels {reference} for {assetQuery.data?.tag ?? 'this asset'}.
          This cannot be undone.
        </p>
      </Dialog>
    </div>
  );
}
