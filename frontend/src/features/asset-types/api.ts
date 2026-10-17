import { z } from 'zod';
import { request, type QueryParams } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const assetTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
});
export type AssetType = z.infer<typeof assetTypeSchema>;

export interface ListAssetTypesParams extends QueryParams {
  page?: number;
  limit?: number;
}

/** GET /asset-types */
export async function listAssetTypes(params: ListAssetTypesParams = {}) {
  const data = await request<unknown>('/asset-types', { query: params });
  return paginated(assetTypeSchema).parse(data);
}
