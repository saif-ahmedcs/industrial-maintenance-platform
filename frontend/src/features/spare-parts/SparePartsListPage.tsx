import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../design/Button';
import { Dialog } from '../../design/Dialog';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Field } from '../../design/Field';
import { Heading } from '../../design/Heading';
import { Pagination } from '../../design/Pagination';
import { Select, type SelectOption } from '../../design/Select';
import { StatusTag } from '../../design/StatusTag';
import { Table, type TableColumn } from '../../design/Table';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { can } from '../../lib/auth/roles';
import { useSession } from '../../lib/auth/session';
import { formatCurrency, formatNumber } from '../../lib/format';
import { deleteSparePart, listSpareParts, type SparePart } from './api';
import { AdjustSparePartDialog } from './AdjustSparePartDialog';
import { CreateSparePartDialog } from './CreateSparePartDialog';
import { RestockSparePartDialog } from './RestockSparePartDialog';

const DEFAULT_SORT_BY = 'part.sku';
const DEFAULT_SORT_DIR = 'ASC';

const SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'part.sku', label: 'SKU' },
  { value: 'part.name', label: 'Name' },
  { value: 'part.quantityOnHand', label: 'Quantity' },
];

const SORT_DIR_OPTIONS: SelectOption[] = [
  { value: 'ASC', label: 'Ascending' },
  { value: 'DESC', label: 'Descending' },
];

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load spare parts right now.';
}

export default function SparePartsListPage() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const roles = user?.roles ?? [];
  const [searchParams, setSearchParams] = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<SparePart | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<SparePart | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SparePart | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const page = Number(searchParams.get('page')) || 1;
  const sortBy = searchParams.get('sortBy') ?? DEFAULT_SORT_BY;
  const sortDir = searchParams.get('sortDir') ?? DEFAULT_SORT_DIR;

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

  const sparePartsQuery = useQuery({
    queryKey: ['spare-parts', 'list', { page, sortBy, sortDir }],
    queryFn: () =>
      listSpareParts({
        page,
        sortBy,
        sortDir: sortDir as 'ASC' | 'DESC',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSparePart(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spare-parts', 'list'] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(
        error instanceof ApiError
          ? toUserMessage(error).message
          : 'Could not delete this part. Try again.',
      );
    },
  });

  const columns: TableColumn<SparePart>[] = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Name' },
    {
      key: 'quantityOnHand',
      header: 'Quantity',
      align: 'right',
      render: (row) => formatNumber(row.quantityOnHand),
    },
    {
      key: 'reorderThreshold',
      header: 'Reorder threshold',
      align: 'right',
      render: (row) => formatNumber(row.reorderThreshold),
    },
    {
      key: 'unitCost',
      header: 'Unit cost',
      align: 'right',
      render: (row) => formatCurrency(row.unitCost),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (row) =>
        row.quantityOnHand === 0 ? (
          <StatusTag status="OUT" />
        ) : row.isLowStock ? (
          <StatusTag status="LOW_STOCK" />
        ) : null,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {can.adjustStock(roles) && (
            <>
              <Button
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  setRestockTarget(row);
                }}
              >
                Restock
              </Button>
              <Button
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  setAdjustTarget(row);
                }}
              >
                Adjust
              </Button>
            </>
          )}
          {can.manageSpareParts(roles) && (
            <Button
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setDeleteError(null);
                setDeleteTarget(row);
              }}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const spareParts = sparePartsQuery.data?.data ?? [];
  const meta = sparePartsQuery.data?.meta;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow tone="silver" size="label">
            Inventory
          </Eyebrow>
          <Heading level={1} scale="heading">
            Spare parts
          </Heading>
        </div>

        {can.manageSpareParts(roles) && (
          <Button onClick={() => setCreateOpen(true)}>Add part</Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Sort by" className="w-44">
          <Select
            options={SORT_BY_OPTIONS}
            value={sortBy}
            onChange={(value) => updateParams({ sortBy: value })}
          />
        </Field>

        <Field label="Direction" className="w-36">
          <Select
            options={SORT_DIR_OPTIONS}
            value={sortDir}
            onChange={(value) => updateParams({ sortDir: value })}
          />
        </Field>
      </div>

      {sparePartsQuery.isError ? (
        <ErrorState
          error={errorMessage(sparePartsQuery.error)}
          onRetry={() => sparePartsQuery.refetch()}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={spareParts}
            loading={sparePartsQuery.isPending}
            empty="No spare parts in the catalog yet."
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

      <CreateSparePartDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <RestockSparePartDialog
        open={Boolean(restockTarget)}
        onClose={() => setRestockTarget(null)}
        part={restockTarget}
      />

      <AdjustSparePartDialog
        open={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        part={adjustTarget}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.sku ?? ''}?`}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
            >
              Keep part
            </Button>
            <Button
              loading={deleteMutation.isPending}
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              Delete part
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="font-display text-body font-normal text-text-silver">
            This removes {deleteTarget?.name} ({deleteTarget?.sku}) from the
            catalog. This cannot be undone.
          </p>
          {deleteError && (
            <p role="alert" className="font-ui text-ui text-accent-lavender">
              {deleteError}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
