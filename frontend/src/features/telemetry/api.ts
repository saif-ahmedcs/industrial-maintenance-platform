import { z } from 'zod';
import { request } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const HOT_TEMPERATURE_THRESHOLD_C = 80;

export const telemetryReadingSchema = z.object({
  assetId: z.string(),
  temperature: z.number(),
  vibration: z.number(),
  pressure: z.number(),
  recordedAt: z.string(),
});
export type TelemetryReading = z.infer<typeof telemetryReadingSchema>;

/** GET /assets/:id/telemetry/latest. Throws ApiError with status 404 when the asset has no readings yet. */
export async function getLatestTelemetry(
  assetId: string,
): Promise<TelemetryReading> {
  const data = await request<unknown>(`/assets/${assetId}/telemetry/latest`);
  return telemetryReadingSchema.parse(data);
}

export interface GetTelemetryHistoryParams {
  page?: number;
  limit?: number;
}

/**
 * GET /assets/:id/telemetry (paginated)*/
export async function getTelemetryHistory(
  assetId: string,
  params: GetTelemetryHistoryParams = {},
) {
  const data = await request<unknown>(`/assets/${assetId}/telemetry`, {
    query: { ...params, sortDir: 'ASC' },
  });
  return paginated(telemetryReadingSchema).parse(data);
}
