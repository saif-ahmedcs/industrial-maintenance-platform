import type { ComponentPropsWithoutRef } from 'react';

export type StatusTagValue =
  | 'OPERATIONAL'
  | 'UNDER_MAINTENANCE'
  | 'CRITICAL'
  | 'DECOMMISSIONED'
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'AUTO'
  | 'CRITICAL_ASSET'
  | 'OVERDUE_MAINTENANCE'
  | 'LOW_STOCK'
  | 'UNREAD'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'TECHNICIAN'
  | 'VIEWER';

interface StatusTagOwnProps {
  status: StatusTagValue;
  showDot?: boolean;
  className?: string;
}

export type StatusTagProps = StatusTagOwnProps &
  Omit<ComponentPropsWithoutRef<'span'>, keyof StatusTagOwnProps>;

const STATUS_STYLE: Record<StatusTagValue, { text: string; dot: string }> = {
  // OPERATIONAL / OPEN / COMPLETED tier — Liquid Mist
  OPERATIONAL: { text: 'text-text-mist', dot: 'bg-text-mist' },
  OPEN: { text: 'text-text-mist', dot: 'bg-text-mist' },
  COMPLETED: { text: 'text-text-mist', dot: 'bg-text-mist' },
  RESOLVED: { text: 'text-text-mist', dot: 'bg-text-mist' },

  // UNDER_MAINTENANCE / ASSIGNED / IN_PROGRESS tier — Silver Mist
  UNDER_MAINTENANCE: { text: 'text-text-silver', dot: 'bg-text-silver' },
  ASSIGNED: { text: 'text-text-silver', dot: 'bg-text-silver' },
  IN_PROGRESS: { text: 'text-text-silver', dot: 'bg-text-silver' },
  ACKNOWLEDGED: { text: 'text-text-silver', dot: 'bg-text-silver' },
  ADMIN: { text: 'text-text-silver', dot: 'bg-text-silver' },
  SUPERVISOR: { text: 'text-text-silver', dot: 'bg-text-silver' },
  TECHNICIAN: { text: 'text-text-silver', dot: 'bg-text-silver' },
  VIEWER: { text: 'text-text-silver', dot: 'bg-text-silver' },

  // BLOCKED tier — Platinum
  BLOCKED: { text: 'text-text-platinum', dot: 'bg-text-platinum' },
  UNREAD: { text: 'text-text-platinum', dot: 'bg-text-platinum' },

  // CRITICAL tier — Alarm Critical
  CRITICAL: { text: 'text-alarm-critical', dot: 'bg-alarm-critical' },
  CRITICAL_ASSET: { text: 'text-alarm-critical', dot: 'bg-alarm-critical' },

  // WARNING tier — Alarm Warning
  OVERDUE_MAINTENANCE: { text: 'text-alarm-warning', dot: 'bg-alarm-warning' },
  LOW_STOCK: { text: 'text-alarm-warning', dot: 'bg-alarm-warning' },

  // AUTO source tag — Lavender Phosphor
  AUTO: { text: 'text-accent-lavender', dot: 'bg-accent-lavender' },

  // DECOMMISSIONED / CANCELLED — Silver Mist text, Slate Deep dot
  DECOMMISSIONED: { text: 'text-text-silver', dot: 'bg-surface-slate' },
  CANCELLED: { text: 'text-text-silver', dot: 'bg-surface-slate' },
};

function toLabel(status: StatusTagValue): string {
  return status.replace(/_/g, ' ');
}

export function StatusTag({
  status,
  showDot = true,
  className,
  ...rest
}: StatusTagProps) {
  const style = STATUS_STYLE[status];

  const classes = [
    'inline-flex',
    'items-center',
    'gap-1.5',
    'rounded-small',
    'border',
    'border-surface-slate',
    'bg-surface-abyss',
    'px-[10px]',
    'py-1',
    'font-display',
    'font-normal',
    'uppercase',
    'text-caption',
    style.text,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {showDot && (
        <span
          aria-hidden="true"
          className={['size-1.5', 'shrink-0', 'rounded-full', style.dot].join(
            ' ',
          )}
        />
      )}
      {toLabel(status)}
    </span>
  );
}
