import { z } from 'zod';
import { request, type QueryParams } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const auditLogSchema = z.object({
  id: z.string(),
  actorUserId: z.string().nullable(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  source: z.string(),
  createdAt: z.string(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;

export interface ListAuditLogsParams extends QueryParams {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/** GET /audit (ADMIN, SUPERVISOR) */
export async function listAuditLogs(params: ListAuditLogsParams = {}) {
  const data = await request<unknown>('/audit', { query: params });
  return paginated(auditLogSchema).parse(data);
}
