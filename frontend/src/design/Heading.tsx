import type { ReactNode } from 'react';

export type HeadingLevel = 1 | 2 | 3;
export type HeadingScale = 'heading' | 'heading-lg' | 'display';

export interface HeadingProps {
  level?: HeadingLevel;
  scale?: HeadingScale;
  className?: string;
  children?: ReactNode;
}

const SCALE_CLASS: Record<HeadingScale, string> = {
  heading: 'text-heading', // 36px / line-height 1
  'heading-lg': 'text-heading-lg', // 61px / line-height 1 / -0.04em
  display: 'text-display', // 96px / line-height 1 / -0.04em
};

const TAG: Record<HeadingLevel, 'h1' | 'h2' | 'h3'> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
};

export function Heading({
  level = 2,
  scale = 'heading',
  className,
  children,
}: HeadingProps) {
  const Tag = TAG[level];

  const classes = [
    'font-display',
    'font-medium',
    'text-text-platinum',
    SCALE_CLASS[scale],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes}>{children}</Tag>;
}
