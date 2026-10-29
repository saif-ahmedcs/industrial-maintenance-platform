import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { signIn, signOut } from '../../lib/auth/session';
import WorkOrdersListPage from './WorkOrdersListPage';
import type { Asset } from '../assets/api';
import type { WorkOrder } from './api';

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
      <MemoryRouter initialEntries={['/app/work-orders']}>
        <WorkOrdersListPage />
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

function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1',
    assetId: 'asset-1',
    maintenancePlanId: null,
    status: 'OPEN',
    source: 'MANUAL',
    priority: 'HIGH',
    assignedToUserId: null,
    description: 'Replace worn seal',
    openedAt: '2026-01-01T00:00:00.000Z',
    assignedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    totalCost: null,
    aiNote: null,
    parts: [],
    ...overrides,
  };
}

describe('WorkOrdersListPage', () => {
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
      http.get('/assets/asset-1', () => HttpResponse.json(makeAsset({}))),
      http.get('/work-orders', () =>
        HttpResponse.json({
          data: [makeWorkOrder({})],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      ),
    );

    const { container } = renderPage();
    await screen.findByText('Replace worn seal');
    expect(await axe(container)).toHaveNoViolations();
  });
});
