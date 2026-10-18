import { useEffect, useRef, useState } from 'react';
import { formatTemperature, formatTime } from '../../lib/format';
import { HOT_TEMPERATURE_THRESHOLD_C, type TelemetryReading } from './api';

export interface TelemetryChartProps {
  points: TelemetryReading[];
  thresholdC?: number;
  height?: number;
  width?: number;
  className?: string;
}

const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 24;
const PAD_BOTTOM = 28;
const Y_TICKS = [0, 0.5, 1];
const SR_TABLE_ROWS = 20;

function useMeasuredWidth(fixedWidth?: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);

  useEffect(() => {
    if (fixedWidth !== undefined) return;
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setMeasured(entry.contentRect.width);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fixedWidth]);

  return { containerRef, width: fixedWidth ?? measured };
}

export function TelemetryChart({
  points,
  thresholdC = HOT_TEMPERATURE_THRESHOLD_C,
  height = 240,
  width: fixedWidth,
  className,
}: TelemetryChartProps) {
  const { containerRef, width } = useMeasuredWidth(fixedWidth);

  const classes = ['w-full', className].filter(Boolean).join(' ');

  if (points.length === 0) {
    return (
      <div ref={containerRef} className={classes} style={{ height }}>
        <p className="font-display text-body font-normal text-text-silver">
          No readings received for this asset yet.
        </p>
      </div>
    );
  }

  const latest = points[points.length - 1];
  const above = latest.temperature > thresholdC;

  if (width < 1) {
    return <div ref={containerRef} className={classes} style={{ height }} />;
  }

  const temperatures = points.map((p) => p.temperature);
  const rawMin = Math.min(...temperatures, thresholdC);
  const rawMax = Math.max(...temperatures, thresholdC);
  const span = rawMax - rawMin || 1;
  const yPad = span * 0.15;
  const yMin = rawMin - yPad;
  const yMax = rawMax + yPad;

  const firstTime = new Date(points[0].recordedAt).getTime();
  const lastTime = new Date(latest.recordedAt).getTime();
  const timeSpan = lastTime - firstTime || 1;

  const plotWidth = width - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  const xScale = (iso: string) => {
    const t = new Date(iso).getTime();
    return PAD_LEFT + ((t - firstTime) / timeSpan) * plotWidth;
  };
  const yScale = (value: number) =>
    PAD_TOP + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  const linePoints = points
    .map(
      (p) =>
        `${xScale(p.recordedAt).toFixed(1)},${yScale(p.temperature).toFixed(1)}`,
    )
    .join(' ');
  const thresholdY = yScale(thresholdC);

  const srReadings = points.slice(-SR_TABLE_ROWS);

  const ariaLabel = `Temperature trend. Latest reading ${formatTemperature(
    latest.temperature,
  )} at ${formatTime(latest.recordedAt)}, ${
    above ? 'above' : 'below'
  } the ${thresholdC}\u00b0C critical threshold.`;

  return (
    <div ref={containerRef} className={classes}>
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
      >
        {Y_TICKS.map((fraction) => {
          const y = PAD_TOP + plotHeight * fraction;
          const value = yMax - (yMax - yMin) * fraction;
          return (
            <g key={fraction}>
              <line
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-surface-slate)"
                strokeOpacity={0.4}
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="font-ui"
                fontSize={12}
                fill="var(--color-text-silver)"
              >
                {formatTemperature(value)}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD_LEFT}
          x2={width - PAD_RIGHT}
          y1={thresholdY}
          y2={thresholdY}
          stroke="var(--color-alarm-critical)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={width - PAD_RIGHT}
          y={thresholdY - 6}
          textAnchor="end"
          className="font-display uppercase"
          fontSize={10}
          letterSpacing="0.08em"
          fill="var(--color-alarm-critical)"
        >
          {thresholdC}°C CRITICAL
        </text>

        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--color-text-mist)"
          strokeWidth={2}
        />

        <text
          x={PAD_LEFT}
          y={height - 8}
          textAnchor="start"
          className="font-ui"
          fontSize={12}
          fill="var(--color-text-silver)"
        >
          {formatTime(points[0].recordedAt)}
        </text>
        <text
          x={width - PAD_RIGHT}
          y={height - 8}
          textAnchor="end"
          className="font-ui"
          fontSize={12}
          fill="var(--color-text-silver)"
        >
          {formatTime(latest.recordedAt)}
        </text>
      </svg>

      <table className="sr-only">
        <caption>Last {srReadings.length} temperature readings</caption>
        <thead>
          <tr>
            <th>Time</th>
            <th>Temperature</th>
          </tr>
        </thead>
        <tbody>
          {srReadings.map((reading) => (
            <tr key={reading.recordedAt}>
              <td>{formatTime(reading.recordedAt)}</td>
              <td>{formatTemperature(reading.temperature)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
