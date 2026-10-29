import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { signIn, signOut } from '../../lib/auth/session';
import WorkOrderDetailPage from './WorkOrderDetailPage';
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

function renderPage(initialEntries: string[] = ['/app/work-orders/wo-1']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route
            path="/app/work-orders/:id"
            element={<WorkOrderDetailPage />}
          />
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

export function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
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

function mockWorkOrderEndpoints(workOrder: WorkOrder) {
  server.use(
    http.get(`/work-orders/${workOrder.id}`, () =>
      HttpResponse.json(workOrder),
    ),
    http.get(`/assets/${workOrder.assetId}`, () =>
      HttpResponse.json(makeAsset({ id: workOrder.assetId })),
    ),
  );
}

describe('WorkOrderDetailPage', () => {
  it('has no axe violations when loaded (17.1)', async () => {
    mockSession(['SUPERVISOR']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });
    mockWorkOrderEndpoints(makeWorkOrder({}));

    const { container } = renderPage();
    await screen.findByText('Replace worn seal');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations on the cancel-confirm dialog (17.1, Batch 3)', async () => {
    mockSession(['SUPERVISOR']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });
    mockWorkOrderEndpoints(makeWorkOrder({ status: 'OPEN' }));

    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByText('Replace worn seal');

    await user.click(screen.getByRole('button', { name: 'Cancel work order' }));
    await screen.findByRole('dialog');

    expect(await axe(container)).toHaveNoViolations();
  });
});
