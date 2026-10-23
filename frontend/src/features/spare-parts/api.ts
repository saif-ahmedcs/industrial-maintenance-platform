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

/** GET /spare-parts/:id */
export async function getSparePart(id: string): Promise<SparePart> {
  const data = await request<unknown>(`/spare-parts/${id}`);
  return sparePartSchema.parse(data);
}

export interface CreateSparePartInput {
  sku: string;
  name: string;
  initialQuantity?: number;
  reorderThreshold?: number;
  unitCost: number;
}

/** POST /spare-parts (ADMIN, SUPERVISOR) */
export async function createSparePart(
  input: CreateSparePartInput,
): Promise<SparePart> {
  const data = await request<unknown>('/spare-parts', {
    method: 'POST',
    body: input,
  });
  return sparePartSchema.parse(data);
}

// Restock/adjust both return { sparePart, transaction }
const stockChangeResponseSchema = z.object({
  sparePart: sparePartSchema,
  transaction: z.unknown(),
});

export interface RestockSparePartInput {
  quantity: number;
}

/** POST /spare-parts/:id/restock (ADMIN, SUPERVISOR) */
export async function restockSparePart(
  id: string,
  input: RestockSparePartInput,
): Promise<SparePart> {
  const data = await request<unknown>(`/spare-parts/${id}/restock`, {
    method: 'POST',
    body: input,
  });
  return stockChangeResponseSchema.parse(data).sparePart;
}

export interface AdjustSparePartInput {
  delta: number;
  reason: string;
}

/** POST /spare-parts/:id/adjust (ADMIN, SUPERVISOR) */
export async function adjustSparePart(
  id: string,
  input: AdjustSparePartInput,
): Promise<SparePart> {
  const data = await request<unknown>(`/spare-parts/${id}/adjust`, {
    method: 'POST',
    body: input,
  });
  return stockChangeResponseSchema.parse(data).sparePart;
}

/** DELETE /spare-parts/:id (ADMIN, SUPERVISOR) */
export async function deleteSparePart(id: string): Promise<void> {
  await request<void>(`/spare-parts/${id}`, { method: 'DELETE' });
}
