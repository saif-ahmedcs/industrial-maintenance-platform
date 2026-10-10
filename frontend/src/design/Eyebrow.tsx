import type { ReactNode } from 'react';

export type EyebrowTone = 'silver' | 'mist';
export type EyebrowSize = 'label' | 'eyebrow';

export interface EyebrowProps {
  tone?: EyebrowTone;
  size?: EyebrowSize;
  className?: string;
  children?: ReactNode;
}

const TONE_CLASS: Record<EyebrowTone, string> = {
  silver: 'text-text-silver',
  mist: 'text-text-mist',
};

const SIZE_CLASS: Record<EyebrowSize, string> = {
  label: 'text-label font-normal', // 12px / 1.4 / 0.12em
  eyebrow: 'text-eyebrow font-medium', // 20px / 1.4 / 0.08em
};

export function Eyebrow({
  tone = 'silver',
  size = 'label',
  className,
  children,
}: EyebrowProps) {
  const classes = [
    'font-display',
    'uppercase',
    SIZE_CLASS[size],
    TONE_CLASS[tone],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <p className={classes}>{children}</p>;
}
