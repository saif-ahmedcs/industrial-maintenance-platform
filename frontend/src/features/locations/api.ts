import { z } from 'zod';
import { request, type QueryParams } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const locationSchema = z.object({
  id: z.string(),
  plantId: z.string(),
  name: z.string(),
  parentLocationId: z.string().nullable(),
});
export type Location = z.infer<typeof locationSchema>;

export interface ListLocationsParams extends QueryParams {
  page?: number;
  limit?: number;
}

/** GET /locations */
export async function listLocations(params: ListLocationsParams = {}) {
  const data = await request<unknown>('/locations', { query: params });
  return paginated(locationSchema).parse(data);
}
