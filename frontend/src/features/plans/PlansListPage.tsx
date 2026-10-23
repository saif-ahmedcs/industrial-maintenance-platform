import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../design/Button';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Heading } from '../../design/Heading';
import { Pagination } from '../../design/Pagination';
import { StatusTag } from '../../design/StatusTag';
import { Table, type TableColumn } from '../../design/Table';
import { Tabs } from '../../design/Tabs';
import { listAssets } from '../assets/api';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { can } from '../../lib/auth/roles';
import { useSession } from '../../lib/auth/session';
import { formatDateTime } from '../../lib/format';
import { listDuePlans, listMaintenancePlans, type MaintenancePlan } from './api';
import { CreatePlanDialog } from './CreatePlanDialog';
import { EditPlanDialog } from './EditPlanDialog';

type PlansView = 'all' | 'due';

const VIEW_TABS = [
  { value: 'all', label: 'All plans' },
  { value: 'due', label: 'Due' },
];

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load maintenance plans right now.';
}

function isOverdue(plan: MaintenancePlan): boolean {
  if (!plan.active || !plan.nextDueAt) return false;
  return new Date(plan.nextDueAt).getTime() < Date.now();
}

export default function PlansListPage() {
  const { user } = useSession();
  const roles = user?.roles ?? [];
  const [searchParams, setSearchParams] = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MaintenancePlan | null>(null);

  const view = (searchParams.get('view') as PlansView) ?? 'all';
  const page = Number(searchParams.get('page')) || 1;

  function updateParams(
    patch: Record<string, string | undefined>,
    options: { resetPage?: boolean } = {},
  ) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(patch)) {
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
        }
        if (options.resetPage) {
          next.delete('page');
        }
        return next;
      },
      { replace: true },
    );
  }

  const plansQuery = useQuery({
    queryKey: ['maintenance-plans', 'list', view, { page }],
    queryFn: () =>
      view === 'due' ? listDuePlans({ page }) : listMaintenancePlans({ page }),
  });

  // Plan responses only carry assetId (no nested asset), so the asset
  // catalog is fetched once and used both for the create-form Select and
  // for resolving each row's display tag — same assumption AssetsListPage
  // / CreateAssetDialog make about catalog size (limit: 100).
  const assetsQuery = useQuery({
    queryKey: ['assets', 'list', { limit: 100 }],
    queryFn: () => listAssets({ limit: 100 }),
  });

  const assetOptions = useMemo(
    () =>
      (assetsQuery.data?.data ?? []).map((asset) => ({
        value: asset.id,
        label: asset.tag,
      })),
    [assetsQuery.data],
  );

  const assetLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const asset of assetsQuery.data?.data ?? []) {
      map.set(asset.id, asset.tag);
    }
    return map;
  }, [assetsQuery.data]);

  const columns: TableColumn<MaintenancePlan>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'asset',
      header: 'Asset',
      render: (row) => assetLabelById.get(row.assetId) ?? row.assetId,
    },
    {
      key: 'intervalDays',
      header: 'Interval (days)',
      align: 'right',
      render: (row) => String(row.intervalDays),
    },
    {
      key: 'lastCompletedAt',
      header: 'Last completed',
      render: (row) =>
        row.lastCompletedAt ? formatDateTime(row.lastCompletedAt) : '—',
    },
    {
      key: 'nextDueAt',
      header: 'Next due',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span>{row.nextDueAt ? formatDateTime(row.nextDueAt) : '—'}</span>
          {isOverdue(row) && <StatusTag status="OVERDUE_MAINTENANCE" />}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Active',
      render: (row) => (row.active ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        can.manageMaintenancePlans(roles) ? (
          <Button
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              setEditTarget(row);
            }}
          >
            Edit
          </Button>
        ) : null,
    },
  ];

  const plans = plansQuery.data?.data ?? [];
  const meta = plansQuery.data?.meta;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow tone="silver" size="label">
            Maintenance
          </Eyebrow>
          <Heading level={1} scale="heading">
            Maintenance plans
          </Heading>
        </div>

        {can.manageMaintenancePlans(roles) && (
          <Button onClick={() => setCreateOpen(true)}>Create plan</Button>
        )}
      </div>

      <Tabs
        items={VIEW_TABS}
        value={view}
        onChange={(next) =>
          updateParams(
            { view: next === 'all' ? undefined : next },
            { resetPage: true },
          )
        }
      />

      {plansQuery.isError ? (
        <ErrorState
          error={errorMessage(plansQuery.error)}
          onRetry={() => plansQuery.refetch()}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={plans}
            loading={plansQuery.isPending}
            empty={
              view === 'due'
                ? 'No plans are currently due.'
                : 'No maintenance plans yet.'
            }
            rowKey={(row) => row.id}
          />

          {meta && (
            <Pagination
              meta={meta}
              onPageChange={(nextPage) =>
                updateParams({ page: String(nextPage) })
              }
            />
          )}
        </>
      )}

      <CreatePlanDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        assetOptions={assetOptions}
      />

      <EditPlanDialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        plan={editTarget}
      />
    </div>
  );
}
