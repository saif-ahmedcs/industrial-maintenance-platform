import type { TelemetryReading } from './api';

export function mergeLatestReading(
  series: TelemetryReading[],
  latest: TelemetryReading | undefined,
  limit: number,
): TelemetryReading[] {
  if (!latest) {
    return series;
  }

  const lastPoint = series[series.length - 1];
  const isNewer =
    !lastPoint ||
    new Date(latest.recordedAt).getTime() >
      new Date(lastPoint.recordedAt).getTime();

  if (!isNewer) {
    return series;
  }

  const next = [...series, latest];
  return next.length > limit ? next.slice(next.length - limit) : next;
}
