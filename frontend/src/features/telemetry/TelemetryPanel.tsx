import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErrorState } from '../../design/ErrorState';
import { Eyebrow } from '../../design/Eyebrow';
import { Panel } from '../../design/Panel';
import { Skeleton } from '../../design/Skeleton';
import { Stat } from '../../design/Stat';
import { Surface } from '../../design/Surface';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import {
  formatDateTime,
  formatNumber,
  formatTemperature,
} from '../../lib/format';
import { TelemetryChart } from './Chart';
import {
  HOT_TEMPERATURE_THRESHOLD_C,
  getLatestTelemetry,
  getTelemetryHistory,
  type TelemetryReading,
} from './api';
import { mergeLatestReading } from './mergeReadings';

const LATEST_POLL_MS = 5_000;
const HISTORY_POLL_MS = 60_000;
const STALE_AFTER_MS = 60_000;
const DEFAULT_LIMIT = 120;

export interface TelemetryPanelProps {
  assetId: string;
  limit?: number;
  className?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? toUserMessage(error).message
    : 'Could not load telemetry right now.';
}

export function TelemetryPanel({
  assetId,
  limit = DEFAULT_LIMIT,
  className,
}: TelemetryPanelProps) {
  const [series, setSeries] = useState<TelemetryReading[]>([]);

  const latestQuery = useQuery({
    queryKey: ['telemetry', assetId, 'latest'],
    queryFn: () => getLatestTelemetry(assetId),
    refetchInterval: LATEST_POLL_MS,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 1,
  });

  const historyQuery = useQuery({
    queryKey: ['telemetry', assetId, 'history', limit],
    queryFn: () => getTelemetryHistory(assetId, { limit }),
    refetchInterval: HISTORY_POLL_MS,
  });

  useEffect(() => {
    setSeries(historyQuery.data?.data ?? []);
  }, [historyQuery.data]);

  useEffect(() => {
    if (latestQuery.data) {
      setSeries((current) =>
        mergeLatestReading(current, latestQuery.data, limit),
      );
    }
  }, [latestQuery.data, limit]);

  const noReadingsYet =
    latestQuery.isError &&
    latestQuery.error instanceof ApiError &&
    latestQuery.error.status === 404;

  const classes = ['flex', 'flex-col', 'gap-6', className]
    .filter(Boolean)
    .join(' ');

  if (historyQuery.isPending || (latestQuery.isPending && !noReadingsYet)) {
    return (
      <Surface tone="kelp" className={classes}>
        <Eyebrow tone="silver" size="label">
          Live readings
        </Eyebrow>
        <Skeleton lines={3} height={36} />
      </Surface>
    );
  }

  if (noReadingsYet) {
    return (
      <Surface tone="kelp" className={classes}>
        <Eyebrow tone="silver" size="label">
          Live readings
        </Eyebrow>
        <p className="font-display text-body font-normal text-text-silver">
          No readings received for this asset yet.
        </p>
      </Surface>
    );
  }

  if (historyQuery.isError) {
    return (
      <Surface tone="kelp" className={classes}>
        <Eyebrow tone="silver" size="label">
          Live readings
        </Eyebrow>
        <ErrorState
          error={errorMessage(historyQuery.error)}
          onRetry={() => historyQuery.refetch()}
        />
      </Surface>
    );
  }

  const latest = series[series.length - 1];
  const stale = latest
    ? Date.now() - new Date(latest.recordedAt).getTime() > STALE_AFTER_MS
    : false;
  const critical = latest
    ? latest.temperature > HOT_TEMPERATURE_THRESHOLD_C
    : false;

  return (
    <Surface tone="kelp" className={classes}>
      <Eyebrow tone="silver" size="label">
        Live readings
      </Eyebrow>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Stat
          label="Temperature"
          value={latest ? formatTemperature(latest.temperature) : '—'}
          valueTone={critical ? 'critical' : 'lavender'}
        />
        <Stat
          label="Vibration"
          value={
            latest
              ? formatNumber(latest.vibration, { maximumFractionDigits: 2 })
              : '—'
          }
        />
        <Stat
          label="Pressure"
          value={
            latest
              ? formatNumber(latest.pressure, { maximumFractionDigits: 2 })
              : '—'
          }
        />
      </div>
      {latest && (
        <p className="font-display text-meta font-normal text-text-silver">
          {stale
            ? `Last reading at ${formatDateTime(latest.recordedAt)}`
            : `Updated ${formatDateTime(latest.recordedAt)}`}
        </p>
      )}
      <Panel padding="dense">
        <TelemetryChart
          points={series}
          thresholdC={HOT_TEMPERATURE_THRESHOLD_C}
        />
      </Panel>
    </Surface>
  );
}
