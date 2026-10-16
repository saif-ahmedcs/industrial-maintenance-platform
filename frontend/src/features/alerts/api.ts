import { z } from 'zod';
import { request, type QueryParams } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const notificationTypeSchema = z.enum([
  'CRITICAL_ASSET',
  'OVERDUE_MAINTENANCE',
  'LOW_STOCK',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationStatusSchema = z.enum([
  'UNREAD',
  'ACKNOWLEDGED',
  'RESOLVED',
]);
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  relatedEntityType: z.string(),
  relatedEntityId: z.string(),
  message: z.string(),
  aiNote: z.string().nullable(),
  status: notificationStatusSchema,
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedByUserId: z.string().nullable(),
});
export type Notification = z.infer<typeof notificationSchema>;

export interface ListNotificationsParams extends QueryParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  status?: NotificationStatus;
  relatedEntityId?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/** GET /notifications */
export async function listNotifications(params: ListNotificationsParams = {}) {
  const data = await request<unknown>('/notifications', { query: params });
  return paginated(notificationSchema).parse(data);
}

/** PATCH /notifications/:id/acknowledge */
export async function acknowledgeNotification(
  id: string,
): Promise<Notification> {
  const data = await request<unknown>(`/notifications/${id}/acknowledge`, {
    method: 'PATCH',
  });
  return notificationSchema.parse(data);
}
