import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../design/Button';
import { Panel } from '../../design/Panel';
import { StatusTag } from '../../design/StatusTag';
import { Surface } from '../../design/Surface';
import { ApiError, toUserMessage } from '../../lib/api/errors';
import { can } from '../../lib/auth/roles';
import { useSession } from '../../lib/auth/session';
import { formatDateTime } from '../../lib/format';
import {
  acknowledgeNotification,
  resolveNotification,
  type Notification,
} from './api';

export interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const roles = user?.roles ?? [];
  const isUnread = notification.status === 'UNREAD';
  const isResolved = notification.status === 'RESOLVED';
  const [actionError, setActionError] = useState<string | null>(null);

  function handleActionError(error: unknown) {
    setActionError(
      error instanceof ApiError
        ? toUserMessage(error).message
        : 'Could not update this alert. Try again.',
    );
    void queryClient.invalidateQueries({
      queryKey: ['notifications', 'list'],
    });
  }

  const acknowledgeMutation = useMutation({
    mutationFn: () => acknowledgeNotification(notification.id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'list'],
      });
    },
    onError: handleActionError,
  });

  const resolveMutation = useMutation({
    mutationFn: () => resolveNotification(notification.id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'list'],
      });
    },
    onError: handleActionError,
  });

  return (
    <Surface tone="kelp" padding="card" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {isUnread ? (
            <StatusTag status={notification.type} />
          ) : (
            <StatusTag
              status={notification.status}
              showDot={notification.status !== 'ACKNOWLEDGED'}
            />
          )}
          <p
            className={
              isUnread
                ? 'font-display text-body font-normal text-text-platinum'
                : 'font-display text-body font-normal text-text-silver'
            }
          >
            {notification.message}
          </p>
          <span className="font-display text-meta font-normal text-text-silver">
            {formatDateTime(notification.createdAt)}
          </span>
        </div>

        {!isResolved && (
          <div className="flex items-center gap-3">
            {isUnread && can.acknowledgeAlert(roles) && (
              <Button
                variant="ghost"
                onClick={() => acknowledgeMutation.mutate()}
                loading={acknowledgeMutation.isPending}
              >
                Acknowledge
              </Button>
            )}

            {can.resolveAlert(roles) && (
              <Button
                variant="ghost"
                onClick={() => resolveMutation.mutate()}
                loading={resolveMutation.isPending}
              >
                Resolve
              </Button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <p role="alert" className="font-ui text-ui text-accent-lavender">
          {actionError}
        </p>
      )}

      {notification.aiNote && (
        <Panel padding="dense" className="flex flex-col gap-1">
          <span className="font-display text-caption font-normal uppercase text-text-silver">
            Diagnostic note
          </span>
          <p className="font-ui text-ui font-normal text-text-ash">
            {notification.aiNote}
          </p>
        </Panel>
      )}
    </Surface>
  );
}
