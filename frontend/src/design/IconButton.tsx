import type { ComponentPropsWithoutRef } from 'react';
import { IconArrowUpRight } from '@tabler/icons-react';
import { Icon, type TablerIconComponent } from './Icon';

export type IconButtonIcon = 'open';

interface IconButtonOwnProps {
  label: string;
  icon?: IconButtonIcon;
  className?: string;
}

export type IconButtonProps = IconButtonOwnProps &
  Omit<ComponentPropsWithoutRef<'button'>, keyof IconButtonOwnProps>;

const ICON_MAP: Record<IconButtonIcon, TablerIconComponent> = {
  open: IconArrowUpRight,
};

export function IconButton({
  label,
  icon = 'open',
  disabled,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const classes = [
    'inline-flex',
    'items-center',
    'justify-center',
    'size-8', // 32px square
    'rounded-small', // 6px
    'bg-surface-arrow-button',
    'text-text-platinum',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={label}
      className={classes}
      {...rest}
    >
      <Icon icon={ICON_MAP[icon]} size={16} />
    </button>
  );
}
