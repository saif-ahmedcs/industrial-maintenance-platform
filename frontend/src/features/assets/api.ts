import { z } from 'zod';
import { request, type QueryParams } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const assetStatusSchema = z.enum([
  'OPERATIONAL',
  'UNDER_MAINTENANCE',
  'CRITICAL',
  'DECOMMISSIONED',
]);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const assetCriticalitySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);
export type AssetCriticality = z.infer<typeof assetCriticalitySchema>;

export const assetSchema = z.object({
  id: z.string(),
  assetTypeId: z.string(),
  locationId: z.string(),
  tag: z.string(),
  manufacturer: z.string().nullable(),
  model: z.string().nullable(),
  criticality: assetCriticalitySchema,
  status: assetStatusSchema,
  installedAt: z.string().nullable(),
});
export type Asset = z.infer<typeof assetSchema>;

export interface ListAssetsParams extends QueryParams {
  page?: number;
  limit?: number;
  status?: AssetStatus;
  search?: string;
  locationId?: string;
  assetTypeId?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/** GET /assets */
export async function listAssets(params: ListAssetsParams = {}) {
  const data = await request<unknown>('/assets', { query: params });
  return paginated(assetSchema).parse(data);
}

/** GET /assets/:id */
export async function getAsset(id: string): Promise<Asset> {
  const data = await request<unknown>(`/assets/${id}`);
  return assetSchema.parse(data);
}

export const assetStateHistoryEntrySchema = z.object({
  id: z.string(),
  assetId: z.string(),
  previousStatus: assetStatusSchema,
  newStatus: assetStatusSchema,
  changedAt: z.string(),
  changedByUserId: z.string().nullable(),
  source: z.string(),
});
export type AssetStateHistoryEntry = z.infer<
  typeof assetStateHistoryEntrySchema
>;

export interface ListAssetHistoryParams extends QueryParams {
  page?: number;
  limit?: number;
}

/** GET /assets/:id/history */
export async function getAssetHistory(
  id: string,
  params: ListAssetHistoryParams = {},
) {
  const data = await request<unknown>(`/assets/${id}/history`, {
    query: params,
  });
  return paginated(assetStateHistoryEntrySchema).parse(data);
}

export interface CreateAssetInput {
  assetTypeId: string;
  locationId: string;
  tag: string;
  manufacturer?: string;
  model?: string;
  criticality?: AssetCriticality;
  installedAt?: string;
}

/** POST /assets */
export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const data = await request<unknown>('/assets', {
    method: 'POST',
    body: input,
  });
  return assetSchema.parse(data);
}
