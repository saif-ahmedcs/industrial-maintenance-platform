import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { signIn, signOut } from '../../lib/auth/session';
import PlansListPage from './PlansListPage';
import type { Asset } from '../assets/api';
import type { MaintenancePlan } from './api';

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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/plans']}>
        <PlansListPage />
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

function makePlan(overrides: Partial<MaintenancePlan> = {}): MaintenancePlan {
  return {
    id: 'plan-1',
    assetId: 'asset-1',
    name: 'Quarterly lubrication',
    intervalDays: 90,
    lastCompletedAt: null,
    nextDueAt: '2026-12-01T00:00:00.000Z',
    active: true,
    ...overrides,
  };
}

describe('PlansListPage', () => {
  it('has no axe violations when the list is loaded (17.1)', async () => {
    mockSession(['SUPERVISOR']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    server.use(
      http.get('/assets', () =>
        HttpResponse.json({
          data: [makeAsset({})],
          meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
        }),
      ),
      http.get('/maintenance-plans', () =>
        HttpResponse.json({
          data: [makePlan({})],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      ),
    );

    const { container } = renderPage();
    await screen.findByRole(
      'row',
      { name: /Quarterly lubrication/ },
      { timeout: 5000 },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
