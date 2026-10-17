import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../design/Button';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Field } from '../../design/Field';
import { Heading } from '../../design/Heading';
import { IconButton } from '../../design/IconButton';
import { Pagination } from '../../design/Pagination';
import { Select, type SelectOption } from '../../design/Select';
import { StatusTag } from '../../design/StatusTag';
import { Table, type TableColumn } from '../../design/Table';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { can } from '../../lib/auth/roles';
import { useSession } from '../../lib/auth/session';
import { listAssetTypes } from '../asset-types/api';
import { listLocations } from '../locations/api';
import { listAssets, type Asset, type AssetStatus } from './api';
import { CreateAssetDialog } from './CreateAssetDialog';

const REFERENCE_STALE_TIME = 5 * 60_000;
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_SORT_BY = 'asset.tag';
const DEFAULT_SORT_DIR = 'DESC';

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_MAINTENANCE', label: 'Under maintenance' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'DECOMMISSIONED', label: 'Decommissioned' },
];

const SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'asset.tag', label: 'Tag' },
  { value: 'asset.status', label: 'Status' },
];

const SORT_DIR_OPTIONS: SelectOption[] = [
  { value: 'ASC', label: 'Ascending' },
  { value: 'DESC', label: 'Descending' },
];

function toTitleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load assets right now.';
}

export default function AssetsListPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const roles = user?.roles ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const page = Number(searchParams.get('page')) || 1;
  const status = searchParams.get('status') ?? '';
  const locationId = searchParams.get('locationId') ?? '';
  const assetTypeId = searchParams.get('assetTypeId') ?? '';
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? DEFAULT_SORT_BY;
  const sortDir = searchParams.get('sortDir') ?? DEFAULT_SORT_DIR;

  const [searchInput, setSearchInput] = useState(search);

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

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (searchInput === search) return;
    const handle = setTimeout(() => {
      updateParams({ search: searchInput || undefined }, { resetPage: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const assetTypesQuery = useQuery({
    queryKey: ['asset-types', 'list', { limit: 100 }],
    queryFn: () => listAssetTypes({ limit: 100 }),
    staleTime: REFERENCE_STALE_TIME,
  });

  const locationsQuery = useQuery({
    queryKey: ['locations', 'list', { limit: 100 }],
    queryFn: () => listLocations({ limit: 100 }),
    staleTime: REFERENCE_STALE_TIME,
  });

  const assetsQuery = useQuery({
    queryKey: [
      'assets',
      'list',
      { page, status, locationId, assetTypeId, search, sortBy, sortDir },
    ],
    queryFn: () =>
      listAssets({
        page,
        status: (status || undefined) as AssetStatus | undefined,
        locationId: locationId || undefined,
        assetTypeId: assetTypeId || undefined,
        search: search || undefined,
        sortBy,
        sortDir: sortDir as 'ASC' | 'DESC',
      }),
  });

  const typeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of assetTypesQuery.data?.data ?? []) {
      map.set(type.id, type.name);
    }
    return map;
  }, [assetTypesQuery.data]);

  const locationNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const location of locationsQuery.data?.data ?? []) {
      map.set(location.id, location.name);
    }
    return map;
  }, [locationsQuery.data]);

  const assetTypeOptions: SelectOption[] = useMemo(
    () =>
      (assetTypesQuery.data?.data ?? []).map((type) => ({
        value: type.id,
        label: type.category ? `${type.name} (${type.category})` : type.name,
      })),
    [assetTypesQuery.data],
  );

  const locationOptions: SelectOption[] = useMemo(
    () =>
      (locationsQuery.data?.data ?? []).map((location) => ({
        value: location.id,
        label: location.name,
      })),
    [locationsQuery.data],
  );

  const columns: TableColumn<Asset>[] = [
    { key: 'tag', header: 'Tag' },
    {
      key: 'assetTypeId',
      header: 'Type',
      render: (row) => typeNameById.get(row.assetTypeId) ?? '—',
    },
    {
      key: 'locationId',
      header: 'Location',
      render: (row) => locationNameById.get(row.locationId) ?? '—',
    },
    {
      key: 'criticality',
      header: 'Criticality',
      render: (row) => toTitleCase(row.criticality),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (row) => <StatusTag status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <IconButton
          label={`Open asset ${row.tag}`}
          icon="open"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/assets/${row.id}`);
          }}
        />
      ),
    },
  ];

  const assets = assetsQuery.data?.data ?? [];
  const meta = assetsQuery.data?.meta;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow tone="silver" size="label">
            Plant assets
          </Eyebrow>
          <Heading level={1} scale="heading">
            Assets
          </Heading>
        </div>

        {can.manageAssets(roles) && (
          <Button onClick={() => setCreateOpen(true)}>Create asset</Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Search" className="min-w-[200px] flex-1">
          <input
            type="search"
            placeholder="Search by tag"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Field>

        <Field label="Status" className="w-44">
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) =>
              updateParams({ status: value || undefined }, { resetPage: true })
            }
          />
        </Field>

        <Field label="Location" className="w-48">
          <Select
            options={[
              { value: '', label: 'All locations' },
              ...locationOptions,
            ]}
            value={locationId}
            onChange={(value) =>
              updateParams(
                { locationId: value || undefined },
                { resetPage: true },
              )
            }
            searchable
          />
        </Field>

        <Field label="Asset type" className="w-48">
          <Select
            options={[
              { value: '', label: 'All asset types' },
              ...assetTypeOptions,
            ]}
            value={assetTypeId}
            onChange={(value) =>
              updateParams(
                { assetTypeId: value || undefined },
                { resetPage: true },
              )
            }
            searchable
          />
        </Field>

        <Field label="Sort by" className="w-36">
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

      {assetsQuery.isError ? (
        <ErrorState
          error={errorMessage(assetsQuery.error)}
          onRetry={() => assetsQuery.refetch()}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={assets}
            loading={assetsQuery.isPending}
            empty="No assets match these filters."
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/assets/${row.id}`)}
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

      <CreateAssetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        assetTypeOptions={assetTypeOptions}
        locationOptions={locationOptions}
      />
    </div>
  );
}
