import { Button } from './Button';

export interface ErrorStateError {
  message: string;
  requestId?: string;
}

export interface ErrorStateProps {
  error: ErrorStateError | string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const message = typeof error === 'string' ? error : error.message;
  const requestId = typeof error === 'string' ? undefined : error.requestId;

  const classes = ['flex', 'flex-col', 'items-start', 'gap-3', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="alert" className={classes}>
      <p className="font-display text-body font-normal text-text-platinum">
        {message}
      </p>
      {requestId && (
        <p className="font-display text-meta font-normal uppercase text-text-silver">
          Request ID: {requestId}
        </p>
      )}
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
