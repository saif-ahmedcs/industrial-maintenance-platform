import type { ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router-dom';

interface NavLinkOwnProps {
  to: string;
  active?: boolean;
  className?: string;
}

export type NavLinkProps = NavLinkOwnProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof NavLinkOwnProps>;

export function NavLink({
  to,
  active = false,
  className,
  children,
  ...rest
}: NavLinkProps) {
  const classes = [
    'font-display',
    'uppercase',
    'text-label', // 12px / 1.4 / 0.12em, matches DESIGN.md exactly
    'font-normal',
    active ? 'text-text-platinum' : 'text-text-silver',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={classes}
      {...rest}
    >
      {children}
    </Link>
  );
}
