import type { ReactNode } from 'react';
import { Heading } from './Heading';
import { Panel } from './Panel';

export interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: EmptyStateProps) {
  const classes = [
    'flex',
    'flex-col',
    'items-center',
    'gap-4',
    'text-center',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Panel padding="recessed" className={classes}>
      <Heading level={2} scale="heading-lg">
        {title}
      </Heading>
      <p className="max-w-prose font-display text-body font-normal text-text-silver">
        {body}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </Panel>
  );
}
