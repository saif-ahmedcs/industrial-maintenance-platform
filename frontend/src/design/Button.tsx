import type { ComponentPropsWithoutRef } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'ghost';
export type ButtonSize = 'md';

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
}

export type ButtonProps = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<'button'>, keyof ButtonOwnProps>;

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-bioluminescent text-text-ink',
  ghost: 'border border-surface-slate text-text-silver',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: 'py-8 px-[22px]', // 32px vertical, 22px horizontal
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const classes = [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-2',
    'rounded-small',
    'font-ui',
    'text-ui',
    'uppercase',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading && (
        <Icon icon={IconLoader2} size={16} className="animate-spin" />
      )}
      {children}
    </button>
  );
}
