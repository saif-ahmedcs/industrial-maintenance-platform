import { z } from 'zod';
import { request, type QueryParams } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const sparePartSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  quantityOnHand: z.number(),
  reorderThreshold: z.number(),
  unitCost: z.number(),
  isLowStock: z.boolean(),
});
export type SparePart = z.infer<typeof sparePartSchema>;

export interface ListSparePartsParams extends QueryParams {
  page?: number;
  limit?: number;
  /** Server-side filter: quantityOnHand <= reorderThreshold */
  lowStock?: boolean;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/** GET /spare-parts */
export async function listSpareParts(params: ListSparePartsParams = {}) {
  const data = await request<unknown>('/spare-parts', { query: params });
  return paginated(sparePartSchema).parse(data);
}
