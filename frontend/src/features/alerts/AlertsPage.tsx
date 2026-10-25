import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../design/EmptyState';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Field } from '../../design/Field';
import { Heading } from '../../design/Heading';
import { Pagination } from '../../design/Pagination';
import { Select, type SelectOption } from '../../design/Select';
import { Skeleton } from '../../design/Skeleton';
import { Sphere } from '../../design/Sphere';
import { Surface } from '../../design/Surface';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { NotificationItem } from './NotificationItem';
import {
  listNotifications,
  type NotificationStatus,
  type NotificationType,
} from './api';

const TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All types' },
  { value: 'CRITICAL_ASSET', label: 'Critical asset' },
  { value: 'OVERDUE_MAINTENANCE', label: 'Overdue maintenance' },
  { value: 'LOW_STOCK', label: 'Low stock' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
];

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load alerts right now.';
}

export default function AlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const type = searchParams.get('type') ?? '';
  const status = searchParams.get('status') ?? 'UNREAD';

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

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'list', { page, type, status }],
    queryFn: () =>
      listNotifications({
        page,
        type: (type || undefined) as NotificationType | undefined,
        status: (status || undefined) as NotificationStatus | undefined,
      }),
  });

  const notifications = notificationsQuery.data?.data ?? [];
  const meta = notificationsQuery.data?.meta;
  const isDefaultUnreadView = type === '' && status === 'UNREAD';
  const showSphereEmptyState =
    isDefaultUnreadView && notifications.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow tone="silver" size="label">
          Alert centre
        </Eyebrow>
        <Heading level={1} scale="heading">
          Alerts
        </Heading>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Type" className="w-52">
          <Select
            options={TYPE_OPTIONS}
            value={type}
            onChange={(value) =>
              updateParams({ type: value || undefined }, { resetPage: true })
            }
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
      </div>

      {notificationsQuery.isError ? (
        <ErrorState
          error={errorMessage(notificationsQuery.error)}
          onRetry={() => notificationsQuery.refetch()}
        />
      ) : (
        <>
          {notificationsQuery.isPending ? (
            <Surface tone="kelp" padding="card">
              <Skeleton lines={5} height={20} />
            </Surface>
          ) : showSphereEmptyState ? (
            <div className="flex flex-col items-center gap-6">
              <Sphere size={160} animated={false} />
              <EmptyState
                title="Nothing is overdue"
                body="No unread alerts right now."
              />
            </div>
          ) : notifications.length === 0 ? (
            <Surface tone="kelp" padding="card">
              <p className="font-display text-body font-normal text-text-silver">
                No alerts match these filters.
              </p>
            </Surface>
          ) : (
            <div className="flex flex-col gap-4">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}

          {meta && !showSphereEmptyState && (
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
