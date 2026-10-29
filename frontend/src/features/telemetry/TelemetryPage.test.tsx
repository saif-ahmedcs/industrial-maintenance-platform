import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { signIn, signOut } from '../../lib/auth/session';
import TelemetryPage from './TelemetryPage';
import type { Asset } from '../assets/api';

function mockSession(roles: string[]) {
  server.use(
    http.get('/auth/me', () =>
      HttpResponse.json({
        id: 'user-1',
        email: 'technician@plant.example',
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

function renderPage(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <TelemetryPage />
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

describe('TelemetryPage', () => {
  it('has no axe violations with an asset selected (17.1)', async () => {
    mockSession(['TECHNICIAN']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    server.use(
      http.get('/assets', () =>
        HttpResponse.json({
          data: [makeAsset({})],
          meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
        }),
      ),
      http.get('/assets/asset-1/telemetry/latest', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
      http.get('/assets/asset-1/telemetry', () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, limit: 120, total: 0, totalPages: 0 },
        }),
      ),
    );

    const { container } = renderPage(['/app/telemetry?assetId=asset-1']);
    await screen.findByText('No readings received for this asset yet.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
