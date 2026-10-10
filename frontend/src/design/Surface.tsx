import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

export type SurfaceTone = 'kelp' | 'deep';
export type SurfacePadding = 'card' | 'card-lg' | 'none';

interface SurfaceOwnProps {
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  className?: string;
  children?: ReactNode;
}

export type SurfaceProps<T extends ElementType = 'div'> = SurfaceOwnProps & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof SurfaceOwnProps | 'as'>;

const TONE_CLASS: Record<SurfaceTone, string> = {
  kelp: 'bg-surface-kelp',
  deep: 'bg-surface-deep',
};

const PADDING_CLASS: Record<SurfacePadding, string> = {
  card: 'p-9', // 36px
  'card-lg': 'p-12', // 48px
  none: '',
};

export function Surface<T extends ElementType = 'div'>({
  as,
  tone = 'kelp',
  padding = 'card',
  className,
  children,
  ...rest
}: SurfaceProps<T>) {
  const Component = (as ?? 'div') as ElementType;

  const classes = [
    'rounded-card',
    TONE_CLASS[tone],
    PADDING_CLASS[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}
