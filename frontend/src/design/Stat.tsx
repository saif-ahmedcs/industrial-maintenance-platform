import type { ReactNode } from 'react';

export type StatTone = 'mist' | 'silver';

export interface StatProps {
  value: ReactNode;
  label: string;
  loading?: boolean;
  tone?: StatTone;
  className?: string;
}

const LABEL_TONE_CLASS: Record<StatTone, string> = {
  mist: 'text-text-mist',
  silver: 'text-text-silver',
};

export function Stat({
  value,
  label,
  loading = false,
  tone = 'mist',
  className,
}: StatProps) {
  const classes = ['flex', 'flex-col', 'gap-1', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {loading ? (
        <>
          <div
            className="h-9 w-20 animate-pulse rounded-small bg-surface-abyss"
            aria-hidden="true"
          />
          <span className="sr-only">Loading {label}</span>
        </>
      ) : (
        <span className="font-display font-medium text-heading text-accent-lavender">
          {value}
        </span>
      )}
      <span
        className={[
          'font-display',
          'font-normal',
          'uppercase',
          'text-meta',
          LABEL_TONE_CLASS[tone],
        ].join(' ')}
      >
        {label}
      </span>
    </div>
  );
}
