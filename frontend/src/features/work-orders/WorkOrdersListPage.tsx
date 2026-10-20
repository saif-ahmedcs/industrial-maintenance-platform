import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../design/Button';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Field } from '../../design/Field';
import { Heading } from '../../design/Heading';
import { Pagination } from '../../design/Pagination';
import { Select, type SelectOption } from '../../design/Select';
import { Skeleton } from '../../design/Skeleton';
import { Surface } from '../../design/Surface';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { can } from '../../lib/auth/roles';
import { useSession } from '../../lib/auth/session';
import { listAssets } from '../assets/api';
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog';
import { WorkOrderRow } from './WorkOrderRow';
import {
  listWorkOrders,
  type WorkOrderSource,
  type WorkOrderStatus,
} from './api';

const REFERENCE_STALE_TIME = 5 * 60_000;

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const SOURCE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All sources' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'AUTO', label: 'Automatic' },
];

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load work orders right now.';
}

export default function WorkOrdersListPage() {
  const { user } = useSession();
  const roles = user?.roles ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const page = Number(searchParams.get('page')) || 1;
  const status = searchParams.get('status') ?? '';
  const source = searchParams.get('source') ?? '';
  const assetId = searchParams.get('assetId') ?? '';

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

  const assetsQuery = useQuery({
    queryKey: ['assets', 'list', { limit: 100 }],
    queryFn: () => listAssets({ limit: 100 }),
    staleTime: REFERENCE_STALE_TIME,
  });

  const assetOptions: SelectOption[] = (assetsQuery.data?.data ?? []).map(
    (asset) => ({ value: asset.id, label: asset.tag }),
  );

  const workOrdersQuery = useQuery({
    queryKey: ['work-orders', 'list', { page, status, source, assetId }],
    queryFn: () =>
      listWorkOrders({
        page,
        status: (status || undefined) as WorkOrderStatus | undefined,
        source: (source || undefined) as WorkOrderSource | undefined,
        assetId: assetId || undefined,
      }),
  });

  const workOrders = workOrdersQuery.data?.data ?? [];
  const meta = workOrdersQuery.data?.meta;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow tone="silver" size="label">
            Maintenance work
          </Eyebrow>
          <Heading level={1} scale="heading">
            Work orders
          </Heading>
        </div>

        {can.createWorkOrder(roles) && (
          <Button onClick={() => setCreateOpen(true)}>Create work order</Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Status" className="w-44">
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) =>
              updateParams({ status: value || undefined }, { resetPage: true })
            }
          />
        </Field>

        <Field label="Source" className="w-44">
          <Select
            options={SOURCE_OPTIONS}
            value={source}
            onChange={(value) =>
              updateParams({ source: value || undefined }, { resetPage: true })
            }
          />
        </Field>

        <Field label="Asset" className="w-48">
          <Select
            options={[{ value: '', label: 'All assets' }, ...assetOptions]}
            value={assetId}
            onChange={(value) =>
              updateParams({ assetId: value || undefined }, { resetPage: true })
            }
            searchable
          />
        </Field>
      </div>

      {workOrdersQuery.isError ? (
        <ErrorState
          error={errorMessage(workOrdersQuery.error)}
          onRetry={() => workOrdersQuery.refetch()}
        />
      ) : (
        <>
          <Surface tone="kelp" padding="none">
            <div className="px-9 py-9">
              {workOrdersQuery.isPending ? (
                <Skeleton lines={5} height={20} />
              ) : workOrders.length === 0 ? (
                <p className="font-display text-body font-normal text-text-silver">
                  No work orders match these filters.
                </p>
              ) : (
                <div className="flex flex-col">
                  {workOrders.map((workOrder) => (
                    <WorkOrderRow key={workOrder.id} workOrder={workOrder} />
                  ))}
                </div>
              )}
            </div>
          </Surface>

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

      <CreateWorkOrderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        assetOptions={assetOptions}
      />
    </div>
  );
}
