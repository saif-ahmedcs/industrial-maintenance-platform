import { z } from 'zod';
import { request, type QueryParams } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const maintenancePlanSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  name: z.string(),
  intervalDays: z.number(),
  lastCompletedAt: z.string().nullable(),
  nextDueAt: z.string().nullable(),
  active: z.boolean(),
});
export type MaintenancePlan = z.infer<typeof maintenancePlanSchema>;

export interface ListMaintenancePlansParams extends QueryParams {
  page?: number;
  limit?: number;
  assetId?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/** GET /maintenance-plans/due */
export async function listDuePlans(params: ListMaintenancePlansParams = {}) {
  const data = await request<unknown>('/maintenance-plans/due', {
    query: params,
  });
  return paginated(maintenancePlanSchema).parse(data);
}

/** GET /maintenance-plans */
export async function listMaintenancePlans(
  params: ListMaintenancePlansParams = {},
) {
  const data = await request<unknown>('/maintenance-plans', {
    query: params,
  });
  return paginated(maintenancePlanSchema).parse(data);
}
