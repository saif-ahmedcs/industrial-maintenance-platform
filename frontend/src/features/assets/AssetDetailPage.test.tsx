import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { signIn, signOut } from '../../lib/auth/session';
import AssetDetailPage from './AssetDetailPage';
import type { Asset } from './api';

function mockSession(roles: string[]) {
  server.use(
    http.get('/auth/me', () =>
      HttpResponse.json({
        id: 'user-1',
        email: 'supervisor@plant.example',
        roles,
      }),
    ),
  );
}

function mockLogoutOk() {
  server.use(
    http.post('/auth/logout', () => new HttpResponse(null, { status: 204 })),
  );
}

afterEach(async () => {
  mockLogoutOk();
  await signOut();
});

function renderPage(initialEntries: string[] = ['/app/assets/asset-1']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/app/assets/:id" element={<AssetDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    assetTypeId: 'type-1',
    locationId: 'location-1',
    tag: 'PUMP-01',
    manufacturer: 'Grundfos',
    model: 'CR 15',
    criticality: 'HIGH',
    status: 'OPERATIONAL',
    installedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function emptyPage(limit = 20) {
  return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
}

function mockAssetDetailEndpoints(asset: Asset) {
  server.use(
    http.get(`/assets/${asset.id}`, () => HttpResponse.json(asset)),
    http.get('/asset-types', () =>
      HttpResponse.json({
        data: [{ id: asset.assetTypeId, name: 'Pump', category: 'Mechanical' }],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      }),
    ),
    http.get('/locations', () =>
      HttpResponse.json({
        data: [
          {
            id: asset.locationId,
            plantId: 'plant-1',
            name: 'Building A',
            parentLocationId: null,
          },
        ],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      }),
    ),
    http.get(`/assets/${asset.id}/history`, () =>
      HttpResponse.json(emptyPage(10)),
    ),
    http.get('/maintenance-plans', () => HttpResponse.json(emptyPage(20))),
    http.get('/work-orders', () => HttpResponse.json(emptyPage(10))),
    http.get('/notifications', () => HttpResponse.json(emptyPage(5))),
    http.get(`/assets/${asset.id}/telemetry/latest`, () =>
      HttpResponse.json({ message: 'Not found' }, { status: 404 }),
    ),
    http.get(`/assets/${asset.id}/telemetry`, () =>
      HttpResponse.json(emptyPage(120)),
    ),
  );
}

describe('AssetDetailPage', () => {
  it('has no axe violations when loaded (17.1)', async () => {
    mockSession(['SUPERVISOR']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });
    mockAssetDetailEndpoints(makeAsset({}));

    const { container } = renderPage();
    await screen.findByRole('heading', { name: 'PUMP-01' });
    await screen.findByText('No readings received for this asset yet.');
    await screen.findByText('No maintenance plans for this asset.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
