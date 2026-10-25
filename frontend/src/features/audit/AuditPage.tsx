import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Field } from '../../design/Field';
import { Heading } from '../../design/Heading';
import { Icon } from '../../design/Icon';
import { Pagination } from '../../design/Pagination';
import { Panel } from '../../design/Panel';
import { Select, type SelectOption } from '../../design/Select';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../lib/format';
import { AuditChangeDiff } from './AuditChangeDiff';
import { listAuditLogs, type AuditLog } from './api';

const ENTITY_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All entity types' },
  { value: 'Asset', label: 'Asset' },
  { value: 'AssetType', label: 'Asset type' },
  { value: 'Location', label: 'Location' },
  { value: 'MaintenancePlan', label: 'Maintenance plan' },
  { value: 'Plant', label: 'Plant' },
  { value: 'SparePart', label: 'Spare part' },
  { value: 'WorkOrder', label: 'Work order' },
];

const ACTION_OPTIONS: SelectOption[] = [
  { value: '', label: 'All actions' },
  { value: 'ADJUST', label: 'Adjust' },
  { value: 'ASSIGN', label: 'Assign' },
  { value: 'AUTO_CREATE', label: 'Auto create' },
  { value: 'CANCEL', label: 'Cancel' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'CREATE', label: 'Create' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'RESTOCK', label: 'Restock' },
  { value: 'START', label: 'Start' },
  { value: 'STATUS_CHANGE', label: 'Status change' },
  { value: 'UPDATE', label: 'Update' },
];

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  Asset: (id) => `/assets/${id}`,
  WorkOrder: (id) => `/work-orders/${id}`,
  SparePart: (id) => `/spare-parts/${id}`,
  MaintenancePlan: (id) => `/plans/${id}`,
};

const LOADING_ROW_COUNT = 5;

const HEADER_CLASSES =
  'font-ui text-ui uppercase tracking-[0.08em] text-text-silver';
const VALUE_CLASSES = 'font-display text-body font-normal text-text-platinum';
const CELL_PADDING = 'p-4';

function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function actorLabel(actorUserId: string | null): string {
  return actorUserId === null ? 'System' : `User ${shortId(actorUserId)}`;
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load the audit log right now.';
}

export default function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const page = Number(searchParams.get('page')) || 1;
  const entityType = searchParams.get('entityType') ?? '';
  const action = searchParams.get('action') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

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

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const auditQuery = useQuery({
    queryKey: ['audit', 'list', { page, entityType, action, dateFrom, dateTo }],
    queryFn: () =>
      listAuditLogs({
        page,
        entityType: entityType || undefined,
        action: action || undefined,
        dateFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      }),
  });

  const entries = auditQuery.data?.data ?? [];
  const meta = auditQuery.data?.meta;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow tone="silver" size="label">
          Plant history
        </Eyebrow>
        <Heading level={1} scale="heading">
          Audit log
        </Heading>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Entity type" className="w-48">
          <Select
            options={ENTITY_TYPE_OPTIONS}
            value={entityType}
            onChange={(value) =>
              updateParams(
                { entityType: value || undefined },
                { resetPage: true },
              )
            }
          />
        </Field>

        <Field label="Action" className="w-44">
          <Select
            options={ACTION_OPTIONS}
            value={action}
            onChange={(value) =>
              updateParams({ action: value || undefined }, { resetPage: true })
            }
          />
        </Field>

        <Field label="From" className="w-40">
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) =>
              updateParams(
                { dateFrom: event.target.value || undefined },
                { resetPage: true },
              )
            }
          />
        </Field>

        <Field label="To" className="w-40">
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) =>
              updateParams(
                { dateTo: event.target.value || undefined },
                { resetPage: true },
              )
            }
          />
        </Field>
      </div>

      {auditQuery.isError ? (
        <ErrorState
          error={errorMessage(auditQuery.error)}
          onRetry={() => auditQuery.refetch()}
        />
      ) : (
        <>
          <Panel padding="none" className="overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-surface-abyss">
                  <th
                    scope="col"
                    className={`${CELL_PADDING} ${HEADER_CLASSES} text-left`}
                  >
                    Time
                  </th>
                  <th
                    scope="col"
                    className={`${CELL_PADDING} ${HEADER_CLASSES} text-left`}
                  >
                    Actor
                  </th>
                  <th
                    scope="col"
                    className={`${CELL_PADDING} ${HEADER_CLASSES} text-left`}
                  >
                    Action
                  </th>
                  <th
                    scope="col"
                    className={`${CELL_PADDING} ${HEADER_CLASSES} text-left`}
                  >
                    Entity type
                  </th>
                  <th
                    scope="col"
                    className={`${CELL_PADDING} ${HEADER_CLASSES} text-left`}
                  >
                    Entity ID
                  </th>
                  <th
                    scope="col"
                    className={`${CELL_PADDING} ${HEADER_CLASSES} text-left`}
                  >
                    Source
                  </th>
                  <th
                    scope="col"
                    className={`${CELL_PADDING} ${HEADER_CLASSES} text-right`}
                  >
                    <span className="sr-only">Expand</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditQuery.isPending ? (
                  Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
                    <tr
                      key={`skeleton-${index}`}
                      className="border-b border-surface-abyss last:border-b-0"
                    >
                      {Array.from({ length: 7 }).map((_, cellIndex) => (
                        <td key={cellIndex} className={CELL_PADDING}>
                          <div
                            className="h-4 w-full max-w-32 animate-pulse rounded-small bg-surface-abyss"
                            aria-hidden="true"
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`${CELL_PADDING} text-center`}>
                      <p className="font-display text-body font-normal text-text-silver">
                        No audit entries match these filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry: AuditLog) => {
                    const expanded = expandedIds.has(entry.id);
                    const entityRoute = ENTITY_ROUTES[entry.entityType]?.(
                      entry.entityId,
                    );

                    return (
                      <Fragment key={entry.id}>
                        <tr className="border-b border-surface-abyss last:border-b-0 hover:bg-surface-abyss">
                          <td className={`${CELL_PADDING} ${VALUE_CLASSES}`}>
                            {formatDateTime(entry.createdAt)}
                          </td>
                          <td className={`${CELL_PADDING} ${VALUE_CLASSES}`}>
                            {actorLabel(entry.actorUserId)}
                          </td>
                          <td className={`${CELL_PADDING} ${VALUE_CLASSES}`}>
                            {toTitleCase(entry.action)}
                          </td>
                          <td className={`${CELL_PADDING} ${VALUE_CLASSES}`}>
                            {entry.entityType}
                          </td>
                          <td className={`${CELL_PADDING} ${VALUE_CLASSES}`}>
                            {entityRoute ? (
                              <Link
                                to={entityRoute}
                                className="text-text-mist underline-offset-2 hover:underline"
                              >
                                {shortId(entry.entityId)}
                              </Link>
                            ) : (
                              shortId(entry.entityId)
                            )}
                          </td>
                          <td className={`${CELL_PADDING} ${VALUE_CLASSES}`}>
                            {entry.source}
                          </td>
                          <td className={`${CELL_PADDING} text-right`}>
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-small bg-surface-arrow-button text-text-platinum"
                              aria-expanded={expanded}
                              aria-label={
                                expanded
                                  ? 'Collapse change details'
                                  : 'Expand change details'
                              }
                              onClick={() => toggleExpanded(entry.id)}
                            >
                              <Icon
                                icon={
                                  expanded ? IconChevronUp : IconChevronDown
                                }
                                size={16}
                              />
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-surface-abyss last:border-b-0">
                            <td colSpan={7} className={CELL_PADDING}>
                              <AuditChangeDiff
                                before={entry.before}
                                after={entry.after}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </Panel>

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
    </div>
  );
}
