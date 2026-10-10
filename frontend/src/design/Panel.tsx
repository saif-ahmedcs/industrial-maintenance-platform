import type { ReactNode } from 'react';

export type PanelPadding = 'dense' | 'recessed' | 'none';

export interface PanelProps {
  padding?: PanelPadding;
  className?: string;
  children?: ReactNode;
}

const PADDING_CLASS: Record<PanelPadding, string> = {
  dense: 'p-9', // 36px
  recessed: 'px-9 py-30', // 36px horizontal, 120px vertical
  none: '',
};

export function Panel({ padding = 'dense', className, children }: PanelProps) {
  const classes = [
    'rounded-card',
    'bg-surface-deep',
    PADDING_CLASS[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
}
