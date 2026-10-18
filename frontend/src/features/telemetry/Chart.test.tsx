import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TelemetryChart } from './Chart';
import type { TelemetryReading } from './api';

function reading(recordedAt: string, temperature: number): TelemetryReading {
  return {
    assetId: 'asset-1',
    temperature,
    vibration: 2.2,
    pressure: 6,
    recordedAt,
  };
}

const POINTS: TelemetryReading[] = [
  reading('2026-10-08T10:00:00Z', 60),
  reading('2026-10-08T10:05:00Z', 80),
  reading('2026-10-08T10:10:00Z', 100),
];

describe('TelemetryChart', () => {
  it('renders one plotted point per reading', () => {
    const { container } = render(
      <TelemetryChart
        points={POINTS}
        thresholdC={80}
        width={600}
        height={240}
      />,
    );
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    const plotted = polyline!.getAttribute('points')!.trim().split(/\s+/);
    expect(plotted).toHaveLength(POINTS.length);
  });

  it('draws the threshold line at the y position implied by the value domain', () => {
    // rawMin = min(60, 80) = 60 via points, but thresholdC=80 extends rawMax.
    // points temps are 60..100, threshold 80 -> yMin=54, yMax=106 (15% pad),
    // plotHeight = 240 - 24(top) - 28(bottom) = 188.
    // thresholdY = 24 + 188 - ((80-54)/(106-54)) * 188 = 118.
    const { container } = render(
      <TelemetryChart
        points={[
          reading('2026-10-08T10:00:00Z', 60),
          reading('2026-10-08T10:10:00Z', 100),
        ]}
        thresholdC={80}
        width={600}
        height={240}
      />,
    );
    const dashed = container.querySelector('line[stroke-dasharray]');
    expect(dashed).not.toBeNull();
    expect(dashed!.getAttribute('y1')).toBe('118');
    expect(dashed!.getAttribute('y2')).toBe('118');
  });

  it('shows the "no readings" message instead of a chart when points is empty', () => {
    render(<TelemetryChart points={[]} width={600} height={240} />);
    expect(
      screen.getByText('No readings received for this asset yet.'),
    ).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeNull();
  });

  it('labels the chart with the latest value and says "above" when past the threshold', () => {
    const { container } = render(
      <TelemetryChart
        points={POINTS}
        thresholdC={80}
        width={600}
        height={240}
      />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-label')).toContain('100.0°C');
    expect(svg.getAttribute('aria-label')).toContain('above');
  });

  it('says "below" when the latest reading has not crossed the threshold', () => {
    const { container } = render(
      <TelemetryChart
        points={[reading('2026-10-08T10:00:00Z', 70)]}
        thresholdC={80}
        width={600}
        height={240}
      />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-label')).toContain('below');
  });

  it('includes a visually hidden table of readings for screen readers', () => {
    const { container } = render(
      <TelemetryChart
        points={POINTS}
        thresholdC={80}
        width={600}
        height={240}
      />,
    );
    const table = container.querySelector<HTMLTableElement>('table.sr-only')!;
    expect(table).not.toBeNull();
    const rows = within(table).getAllByRole('row');
    // header row + one row per reading
    expect(rows).toHaveLength(POINTS.length + 1);
  });
});
