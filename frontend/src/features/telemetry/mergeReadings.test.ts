import { describe, expect, it } from 'vitest';
import { mergeLatestReading } from './mergeReadings';
import type { TelemetryReading } from './api';

function reading(recordedAt: string, temperature = 50): TelemetryReading {
  return {
    assetId: 'asset-1',
    temperature,
    vibration: 2.2,
    pressure: 6,
    recordedAt,
  };
}

describe('mergeLatestReading', () => {
  it('appends a newer reading to the end of the series', () => {
    const series = [reading('2026-10-08T10:00:00Z')];
    const result = mergeLatestReading(
      series,
      reading('2026-10-08T10:00:05Z'),
      120,
    );
    expect(result).toHaveLength(2);
    expect(result[1].recordedAt).toBe('2026-10-08T10:00:05Z');
  });

  it('does not mutate the original series', () => {
    const series = [reading('2026-10-08T10:00:00Z')];
    mergeLatestReading(series, reading('2026-10-08T10:00:05Z'), 120);
    expect(series).toHaveLength(1);
  });

  it('no-ops when latest has the same timestamp as the last point', () => {
    const series = [reading('2026-10-08T10:00:00Z')];
    const result = mergeLatestReading(
      series,
      reading('2026-10-08T10:00:00Z'),
      120,
    );
    expect(result).toBe(series);
  });

  it('no-ops when latest is older than the last point', () => {
    const series = [reading('2026-10-08T10:00:05Z')];
    const result = mergeLatestReading(
      series,
      reading('2026-10-08T10:00:00Z'),
      120,
    );
    expect(result).toBe(series);
  });

  it('no-ops when latest is undefined', () => {
    const series = [reading('2026-10-08T10:00:00Z')];
    const result = mergeLatestReading(series, undefined, 120);
    expect(result).toBe(series);
  });

  it('appends to an empty series', () => {
    const result = mergeLatestReading(
      [],
      reading('2026-10-08T10:00:00Z'),
      120,
    );
    expect(result).toHaveLength(1);
  });

  it('trims to the limit, dropping the oldest point first', () => {
    const series = [
      reading('2026-10-08T10:00:00Z', 10),
      reading('2026-10-08T10:00:01Z', 11),
      reading('2026-10-08T10:00:02Z', 12),
    ];
    const result = mergeLatestReading(
      series,
      reading('2026-10-08T10:00:03Z', 13),
      3,
    );
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.temperature)).toEqual([11, 12, 13]);
  });
});
