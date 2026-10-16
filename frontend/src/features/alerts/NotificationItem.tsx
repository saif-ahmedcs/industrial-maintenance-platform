import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../design/Button';
import { Panel } from '../../design/Panel';
import { StatusTag } from '../../design/StatusTag';
import { Surface } from '../../design/Surface';
import { can } from '../../lib/auth/roles';
import { useSession } from '../../lib/auth/session';
import { formatDateTime } from '../../lib/format';
import { acknowledgeNotification, type Notification } from './api';

export interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const roles = user?.roles ?? [];
  const isUnread = notification.status === 'UNREAD';

  const acknowledgeMutation = useMutation({
    mutationFn: () => acknowledgeNotification(notification.id),
    onSuccess: () => {
      // The overview only ever queries status=UNREAD, so a successful
      // acknowledge simply drops this item out of the refetched list.
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'list'],
      });
    },
  });

  return (
    <Surface tone="kelp" padding="card" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {isUnread ? (
            <StatusTag status={notification.type} />
          ) : (
            // "Acknowledged items fall back to Silver Mist text with no status dot."
            <StatusTag status="ACKNOWLEDGED" showDot={false} />
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

        {isUnread && can.acknowledgeAlert(roles) && (
          <Button
            variant="ghost"
            onClick={() => acknowledgeMutation.mutate()}
            loading={acknowledgeMutation.isPending}
          >
            Acknowledge
          </Button>
        )}
      </div>

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
