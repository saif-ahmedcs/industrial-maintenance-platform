import type { CSSProperties } from 'react';

export interface SphereProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function Sphere({
  size = 240,
  animated = true,
  className,
}: SphereProps) {
  const style: CSSProperties = { width: size, height: size };

  const classes = [
    'pointer-events-none',
    'rounded-full',
    'border',
    'border-surface-slate',
    'bg-surface-deep',
    animated ? 'animate-pulse' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      aria-hidden="true"
      data-testid="sphere-placeholder"
      className={classes}
      style={style}
    />
  );
}
