import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../design/Button';
import { EmptyState } from '../../design/EmptyState';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Field } from '../../design/Field';
import { Panel } from '../../design/Panel';
import { Select, type SelectOption } from '../../design/Select';
import { Skeleton } from '../../design/Skeleton';
import { Stat } from '../../design/Stat';
import { StatusTag } from '../../design/StatusTag';
import { Surface } from '../../design/Surface';
import { Table, type TableColumn } from '../../design/Table';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { can } from '../../lib/auth/roles';
import { useSession } from '../../lib/auth/session';
import { formatDateTime } from '../../lib/format';
import { listAssetTypes } from '../asset-types/api';
import { listLocations } from '../locations/api';
import { listNotifications } from '../alerts/api';
import { listMaintenancePlans, type MaintenancePlan } from '../plans/api';
import { listWorkOrders, type WorkOrder } from '../work-orders/api';
import {
  getAsset,
  getAssetHistory,
  updateAssetStatus,
  type AssetStateHistoryEntry,
  type AssetStatus,
} from './api';

const REFERENCE_STALE_TIME = 5 * 60_000;
const AI_NOTE_PROBE_LIMIT = 5;

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_MAINTENANCE', label: 'Under maintenance' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'DECOMMISSIONED', label: 'Decommissioned' },
];

function toTitleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function workOrderReference(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function formatSource(source: string): string {
  return source.startsWith('auto') ? 'Automatic' : toTitleCase(source);
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load this right now.';
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const roles = user?.roles ?? [];
  const [statusError, setStatusError] = useState<string | null>(null);

  const assetQuery = useQuery({
    queryKey: ['assets', 'detail', id],
    queryFn: () => getAsset(id as string),
    enabled: Boolean(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: AssetStatus) =>
      updateAssetStatus(id as string, status),
    onSuccess: () => {
      setStatusError(null);

      void queryClient.invalidateQueries({
        queryKey: ['assets', 'detail', id],
      });
      void queryClient.invalidateQueries({
        queryKey: ['assets', 'history', id],
      });
    },
    onError: (error) => {
      setStatusError(
        error instanceof ApiError
          ? toUserMessage(error).message
          : 'Could not update status. Try again.',
      );
    },
  });

  const loaded = assetQuery.isSuccess;

  const assetTypesQuery = useQuery({
    queryKey: ['asset-types', 'list', { limit: 100 }],
    queryFn: () => listAssetTypes({ limit: 100 }),
    staleTime: REFERENCE_STALE_TIME,
    enabled: loaded,
  });

  const locationsQuery = useQuery({
    queryKey: ['locations', 'list', { limit: 100 }],
    queryFn: () => listLocations({ limit: 100 }),
    staleTime: REFERENCE_STALE_TIME,
    enabled: loaded,
  });

  const historyQuery = useQuery({
    queryKey: ['assets', 'history', id, { limit: 10 }],
    queryFn: () => getAssetHistory(id as string, { limit: 10 }),
    enabled: loaded,
  });

  const plansQuery = useQuery({
    queryKey: ['maintenance-plans', 'list', { assetId: id, limit: 20 }],
    queryFn: () => listMaintenancePlans({ assetId: id as string, limit: 20 }),
    enabled: loaded,
  });

  const completedWorkOrdersQuery = useQuery({
    queryKey: [
      'work-orders',
      'list',
      { assetId: id, status: 'COMPLETED', limit: 10 },
    ],
    queryFn: () =>
      listWorkOrders({ assetId: id as string, status: 'COMPLETED', limit: 10 }),
    enabled: loaded,
  });

  // Separate, unfiltered probe for the AI diagnostic note: the work order
  // that carries it is usually still OPEN (auto-created by condition
  // monitoring), so the COMPLETED-only history query above would miss it.
  const aiNoteWorkOrdersQuery = useQuery({
    queryKey: [
      'work-orders',
      'list',
      { assetId: id, limit: AI_NOTE_PROBE_LIMIT },
    ],
    queryFn: () =>
      listWorkOrders({ assetId: id as string, limit: AI_NOTE_PROBE_LIMIT }),
    enabled: loaded,
  });

  const aiNoteNotificationsQuery = useQuery({
    queryKey: [
      'notifications',
      'list',
      { relatedEntityId: id, limit: AI_NOTE_PROBE_LIMIT },
    ],
    queryFn: () =>
      listNotifications({
        relatedEntityId: id as string,
        limit: AI_NOTE_PROBE_LIMIT,
      }),
    enabled: loaded,
  });

  if (assetQuery.isPending) {
    return (
      <div className="flex flex-col gap-8">
        <Surface tone="kelp">
          <Skeleton lines={3} height={20} />
        </Surface>
      </div>
    );
  }

  if (assetQuery.isError) {
    if (
      assetQuery.error instanceof ApiError &&
      assetQuery.error.status === 404
    ) {
      return (
        <EmptyState
          title="Asset not found"
          body="This asset doesn't exist or may have been removed."
          action={
            <Button variant="primary" onClick={() => navigate('/assets')}>
              Back to assets
            </Button>
          }
        />
      );
    }

    return (
      <ErrorState
        error={errorMessage(assetQuery.error)}
        onRetry={() => assetQuery.refetch()}
      />
    );
  }

  const asset = assetQuery.data;
  const canManage = can.manageAssets(roles);

  const typeName =
    assetTypesQuery.data?.data.find((type) => type.id === asset.assetTypeId)
      ?.name ?? '—';
  const locationName =
    locationsQuery.data?.data.find(
      (location) => location.id === asset.locationId,
    )?.name ?? '—';

  const aiNote =
    aiNoteWorkOrdersQuery.data?.data.find((wo) => wo.aiNote)?.aiNote ??
    aiNoteNotificationsQuery.data?.data.find((n) => n.aiNote)?.aiNote ??
    null;

  const plans = plansQuery.data?.data ?? [];
  const completedWorkOrders = completedWorkOrdersQuery.data?.data ?? [];
  const history = historyQuery.data?.data ?? [];
  const now = Date.now();

  const planColumns: TableColumn<MaintenancePlan>[] = [
    { key: 'name', header: 'Plan' },
    {
      key: 'intervalDays',
      header: 'Interval',
      render: (row) => `${row.intervalDays} days`,
    },
    {
      key: 'lastCompletedAt',
      header: 'Last completed',
      render: (row) =>
        row.lastCompletedAt ? formatDateTime(row.lastCompletedAt) : 'Never',
    },
    {
      key: 'nextDueAt',
      header: 'Next due',
      render: (row) => {
        if (!row.nextDueAt) return '—';
        const overdue = row.active && new Date(row.nextDueAt).getTime() < now;
        return (
          <div className="flex items-center justify-end gap-2">
            <span>{formatDateTime(row.nextDueAt)}</span>
            {overdue && <StatusTag status="OVERDUE_MAINTENANCE" />}
          </div>
        );
      },
      align: 'right',
    },
    {
      key: 'active',
      header: 'Active',
      align: 'right',
      render: (row) => (row.active ? 'Active' : 'Inactive'),
    },
  ];

  const workOrderColumns: TableColumn<WorkOrder>[] = [
    {
      key: 'reference',
      header: 'Work order',
      render: (row) => workOrderReference(row.id),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="block max-w-xs truncate">{row.description}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => toTitleCase(row.priority),
    },
    {
      key: 'completedAt',
      header: 'Completed',
      render: (row) =>
        row.completedAt ? formatDateTime(row.completedAt) : '—',
    },
    {
      key: 'status',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <StatusTag status={row.status} />
          {row.source === 'AUTO' && <StatusTag status="AUTO" showDot={false} />}
        </div>
      ),
    },
  ];

  const historyColumns: TableColumn<AssetStateHistoryEntry>[] = [
    {
      key: 'previousStatus',
      header: 'From',
      render: (row) => <StatusTag status={row.previousStatus} />,
    },
    {
      key: 'newStatus',
      header: 'To',
      render: (row) => <StatusTag status={row.newStatus} />,
    },
    {
      key: 'changedAt',
      header: 'Changed',
      render: (row) => formatDateTime(row.changedAt),
    },
    {
      key: 'source',
      header: 'Source',
      align: 'right',
      render: (row) => formatSource(row.source),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Button variant="ghost" onClick={() => navigate('/assets')}>
        ← Assets
      </Button>

      <Surface tone="kelp" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-display text-caption font-normal uppercase text-text-silver">
              {asset.criticality}
            </span>
            <h1 className="font-display text-subheading font-medium text-text-platinum">
              {asset.tag}
            </h1>
            <p className="font-display text-meta font-normal text-text-silver">
              {typeName} · {locationName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusTag status={asset.status} />
            {canManage && asset.status !== 'DECOMMISSIONED' && (
              <Field label="Change status" className="w-48">
                <Select
                  options={STATUS_OPTIONS}
                  value={asset.status}
                  disabled={statusMutation.isPending}
                  onChange={(value) => {
                    if (value === asset.status) return;
                    setStatusError(null);
                    statusMutation.mutate(value as AssetStatus);
                  }}
                />
              </Field>
            )}
          </div>
        </div>

        {asset.status === 'DECOMMISSIONED' && (
          <p className="font-display text-body font-normal text-text-silver">
            This asset is decommissioned. Its record is kept for history.
          </p>
        )}

        {statusError && (
          <p role="alert" className="font-ui text-ui text-accent-lavender">
            {statusError}
          </p>
        )}
      </Surface>

      {aiNote && (
        <Panel padding="dense" className="flex flex-col gap-1">
          <span className="font-display text-caption font-normal uppercase text-text-silver">
            Diagnostic note
          </span>
          <p className="font-ui text-ui font-normal text-text-ash">{aiNote}</p>
        </Panel>
      )}

      <Surface tone="kelp" className="flex flex-col gap-6">
        <Eyebrow tone="silver" size="label">
          Live readings
        </Eyebrow>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Stat label="Temperature" value="—" />
          <Stat label="Vibration" value="—" />
          <Stat label="Pressure" value="—" />
        </div>
        <p className="font-display text-body font-normal text-text-silver">
          Live telemetry and the trend chart for this asset arrive in Phase 11.
        </p>
      </Surface>

      <div className="flex flex-col gap-3">
        <Eyebrow tone="silver" size="label">
          Maintenance plans
        </Eyebrow>
        {plansQuery.isError ? (
          <ErrorState
            error={errorMessage(plansQuery.error)}
            onRetry={() => plansQuery.refetch()}
          />
        ) : (
          <Table
            columns={planColumns}
            rows={plans}
            loading={plansQuery.isPending}
            empty="No maintenance plans for this asset."
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/plans/${row.id}`)}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Eyebrow tone="silver" size="label">
          Work order history
        </Eyebrow>
        {completedWorkOrdersQuery.isError ? (
          <ErrorState
            error={errorMessage(completedWorkOrdersQuery.error)}
            onRetry={() => completedWorkOrdersQuery.refetch()}
          />
        ) : (
          <Table
            columns={workOrderColumns}
            rows={completedWorkOrders}
            loading={completedWorkOrdersQuery.isPending}
            empty="No completed work orders for this asset yet."
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/work-orders/${row.id}`)}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Eyebrow tone="silver" size="label">
          State history
        </Eyebrow>
        {historyQuery.isError ? (
          <ErrorState
            error={errorMessage(historyQuery.error)}
            onRetry={() => historyQuery.refetch()}
          />
        ) : (
          <Table
            columns={historyColumns}
            rows={history}
            loading={historyQuery.isPending}
            empty="No status changes recorded for this asset yet."
            rowKey={(row) => row.id}
          />
        )}
      </div>
    </div>
  );
}
