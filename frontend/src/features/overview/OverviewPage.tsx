import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../design/EmptyState';
import { ErrorBoundary } from '../../design/ErrorBoundary';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Heading } from '../../design/Heading';
import { Skeleton } from '../../design/Skeleton';
import { Sphere } from '../../design/Sphere';
import { Stat } from '../../design/Stat';
import { Surface } from '../../design/Surface';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { formatNumber } from '../../lib/format';
import { listNotifications } from '../alerts/api';
import { NotificationItem } from '../alerts/NotificationItem';
import { listAssets } from '../assets/api';
import { listDuePlans } from '../plans/api';
import { listSpareParts } from '../spare-parts/api';
import { listWorkOrders } from '../work-orders/api';
import { WorkOrderRow } from '../work-orders/WorkOrderRow';

const POLL_INTERVAL_MS = 30_000;

function tileErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load this right now.';
}

interface CounterTileProps {
  label: string;
  total: number | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}

function CounterTileContent({
  label,
  total,
  isPending,
  isError,
  error,
  onRetry,
}: CounterTileProps) {
  if (isError) {
    return (
      <Surface tone="kelp" className="flex flex-col gap-3">
        <span className="font-display text-meta font-normal uppercase text-text-silver">
          {label}
        </span>
        <ErrorState error={tileErrorMessage(error)} onRetry={onRetry} />
      </Surface>
    );
  }

  return (
    <Surface tone="kelp">
      <Stat
        label={label}
        loading={isPending}
        value={total === undefined ? undefined : formatNumber(total)}
      />
    </Surface>
  );
}

function CounterTile(props: CounterTileProps) {
  return (
    <ErrorBoundary fallbackMessage={`Could not show "${props.label}."`}>
      <CounterTileContent {...props} />
    </ErrorBoundary>
  );
}

export default function OverviewPage() {
  const openWorkOrders = useQuery({
    queryKey: ['work-orders', 'list', { status: 'OPEN', limit: 1 }],
    queryFn: () => listWorkOrders({ status: 'OPEN', limit: 1 }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const criticalAssets = useQuery({
    queryKey: ['assets', 'list', { status: 'CRITICAL', limit: 1 }],
    queryFn: () => listAssets({ status: 'CRITICAL', limit: 1 }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const overduePlans = useQuery({
    queryKey: ['maintenance-plans', 'due', { limit: 1 }],
    queryFn: () => listDuePlans({ limit: 1 }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const lowStockParts = useQuery({
    queryKey: ['spare-parts', 'list', { lowStock: true, limit: 1 }],
    queryFn: () => listSpareParts({ lowStock: true, limit: 1 }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const workOrderQueue = useQuery({
    queryKey: ['work-orders', 'list', { status: 'OPEN', limit: 5 }],
    queryFn: () => listWorkOrders({ status: 'OPEN', limit: 5 }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const unreadAlerts = useQuery({
    queryKey: ['notifications', 'list', { status: 'UNREAD', limit: 5 }],
    queryFn: () => listNotifications({ status: 'UNREAD', limit: 5 }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const queueItems = workOrderQueue.data?.data ?? [];
  const alertItems = unreadAlerts.data?.data ?? [];

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-2">
        <Eyebrow tone="silver" size="label">
          Plant overview
        </Eyebrow>
        <Heading level={1} scale="heading">
          Overview
        </Heading>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <CounterTile
          label="Open work orders"
          total={openWorkOrders.data?.meta.total}
          isPending={openWorkOrders.isPending}
          isError={openWorkOrders.isError}
          error={openWorkOrders.error}
          onRetry={() => openWorkOrders.refetch()}
        />
        <CounterTile
          label="Critical assets"
          total={criticalAssets.data?.meta.total}
          isPending={criticalAssets.isPending}
          isError={criticalAssets.isError}
          error={criticalAssets.error}
          onRetry={() => criticalAssets.refetch()}
        />
        <CounterTile
          label="Overdue plans"
          total={overduePlans.data?.meta.total}
          isPending={overduePlans.isPending}
          isError={overduePlans.isError}
          error={overduePlans.error}
          onRetry={() => overduePlans.refetch()}
        />
        <CounterTile
          label="Low-stock parts"
          total={lowStockParts.data?.meta.total}
          isPending={lowStockParts.isPending}
          isError={lowStockParts.isError}
          error={lowStockParts.error}
          onRetry={() => lowStockParts.refetch()}
        />
        {/* No GET /telemetry/summary endpoint yet (backend gap, flagged to
            the user) — static placeholder until Phase 11 wires this up. */}
        <Surface tone="kelp">
          <Stat label="Readings last hour" value="—" />
        </Surface>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Surface tone="deep" className="flex flex-col gap-3">
            <Eyebrow tone="silver" size="label">
              Telemetry
            </Eyebrow>
            <p className="font-display text-body font-normal text-text-silver">
              The live telemetry chart for the selected asset arrives in Phase
              11.
            </p>
          </Surface>

          <Surface tone="kelp" padding="none">
            <div className="px-9 pt-9">
              <Eyebrow tone="silver" size="label">
                Work order queue
              </Eyebrow>
            </div>

            <div className="px-9 pb-9">
              <ErrorBoundary fallbackMessage="Could not show the work order queue.">
                {workOrderQueue.isError ? (
                  <ErrorState
                    error={tileErrorMessage(workOrderQueue.error)}
                    onRetry={() => workOrderQueue.refetch()}
                    className="pt-6"
                  />
                ) : workOrderQueue.isPending ? (
                  <div className="pt-6">
                    <Skeleton lines={5} height={20} />
                  </div>
                ) : queueItems.length === 0 ? (
                  <p className="pt-6 font-display text-body font-normal text-text-silver">
                    No open work orders. Create one from an asset page.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {queueItems.map((workOrder) => (
                      <WorkOrderRow key={workOrder.id} workOrder={workOrder} />
                    ))}
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </Surface>
        </div>

        <div className="flex flex-col gap-4">
          <Eyebrow tone="silver" size="label">
            Alerts
          </Eyebrow>

          <ErrorBoundary fallbackMessage="Could not show alerts.">
            {unreadAlerts.isError ? (
              <Surface tone="kelp">
                <ErrorState
                  error={tileErrorMessage(unreadAlerts.error)}
                  onRetry={() => unreadAlerts.refetch()}
                />
              </Surface>
            ) : unreadAlerts.isPending ? (
              <Surface tone="kelp">
                <Skeleton lines={5} height={20} />
              </Surface>
            ) : alertItems.length === 0 ? (
              <div className="flex flex-col items-center gap-6">
                <Sphere size={160} />
                <EmptyState
                  title="Nothing is overdue"
                  body="No unread alerts right now."
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {alertItems.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
