import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { MAX_TELEMETRY_HISTORY_LIMIT, getTelemetryHistory } from './api';

const ASSET_ID = '82ecdb88-9d1e-40af-a62d-752ce0de007a';

function reading(recordedAt: string) {
  return {
    assetId: ASSET_ID,
    temperature: 55,
    vibration: 2.8,
    pressure: 5.5,
    recordedAt,
  };
}

describe('getTelemetryHistory', () => {
  it('never requests more than the backend page-size cap', async () => {
    let requestedLimit: string | null = null;
    server.use(
      http.get(`/assets/${ASSET_ID}/telemetry`, ({ request }) => {
        requestedLimit = new URL(request.url).searchParams.get('limit');
        return HttpResponse.json({
          data: [],
          meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
        });
      }),
    );

    await getTelemetryHistory(ASSET_ID, { limit: 300 });

    expect(requestedLimit).toBe(String(MAX_TELEMETRY_HISTORY_LIMIT));
  });

  it('fetches the newest readings and returns them oldest-first', async () => {
    let requestedSortDir: string | null = null;
    server.use(
      http.get(`/assets/${ASSET_ID}/telemetry`, ({ request }) => {
        requestedSortDir = new URL(request.url).searchParams.get('sortDir');
        return HttpResponse.json({
          data: [
            reading('2026-11-09T10:00:03.000Z'),
            reading('2026-11-09T10:00:02.000Z'),
            reading('2026-11-09T10:00:01.000Z'),
          ],
          meta: { page: 1, limit: 3, total: 3, totalPages: 1 },
        });
      }),
    );

    const result = await getTelemetryHistory(ASSET_ID, { limit: 3 });

    expect(requestedSortDir).toBe('DESC');
    expect(result.data.map((r) => r.recordedAt)).toEqual([
      '2026-11-09T10:00:01.000Z',
      '2026-11-09T10:00:02.000Z',
      '2026-11-09T10:00:03.000Z',
    ]);
  });
});
