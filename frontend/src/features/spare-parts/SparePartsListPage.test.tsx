import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { signIn, signOut } from '../../lib/auth/session';
import SparePartsListPage from './SparePartsListPage';
import type { SparePart } from './api';

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
      <MemoryRouter initialEntries={['/app/spare-parts']}>
        <SparePartsListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makePart(overrides: Partial<SparePart>): SparePart {
  return {
    id: 'sp-1',
    sku: 'SKU-1',
    name: 'Part',
    quantityOnHand: 10,
    reorderThreshold: 5,
    unitCost: 1,
    isLowStock: false,
    ...overrides,
  };
}

describe('SparePartsListPage', () => {
  it('shows LOW STOCK exactly when the server marks isLowStock, including at the quantity === threshold boundary, and OUT takes priority at zero', async () => {
    mockSession(['VIEWER']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    const atThreshold = makePart({
      id: 'sp-at-threshold',
      sku: 'AT-THRESHOLD',
      quantityOnHand: 10,
      reorderThreshold: 10,
      isLowStock: true,
    });
    const aboveThreshold = makePart({
      id: 'sp-above-threshold',
      sku: 'ABOVE-THRESHOLD',
      quantityOnHand: 11,
      reorderThreshold: 10,
      isLowStock: false,
    });
    const zeroStock = makePart({
      id: 'sp-zero',
      sku: 'ZERO-STOCK',
      quantityOnHand: 0,
      reorderThreshold: 5,
      isLowStock: true,
    });

    server.use(
      http.get('/spare-parts', () =>
        HttpResponse.json({
          data: [atThreshold, aboveThreshold, zeroStock],
          meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
        }),
      ),
    );

    renderPage();

    const thresholdRow = await screen.findByRole('row', {
      name: /AT-THRESHOLD/,
    });
    expect(within(thresholdRow).getByText('LOW STOCK')).toBeInTheDocument();

    const aboveRow = screen.getByRole('row', { name: /ABOVE-THRESHOLD/ });
    expect(within(aboveRow).queryByText('LOW STOCK')).not.toBeInTheDocument();
    expect(within(aboveRow).queryByText('OUT')).not.toBeInTheDocument();

    const zeroRow = screen.getByRole('row', { name: /ZERO-STOCK/ });
    expect(within(zeroRow).getByText('OUT')).toBeInTheDocument();
    expect(within(zeroRow).queryByText('LOW STOCK')).not.toBeInTheDocument();
  });

  it('displays the server-returned quantity after a restock, not a client-computed sum', async () => {
    const user = userEvent.setup();
    mockSession(['SUPERVISOR']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    let currentQuantity = 5;
    const partId = 'sp-restock';

    server.use(
      http.get('/spare-parts', () =>
        HttpResponse.json({
          data: [
            makePart({
              id: partId,
              sku: 'PUMP-SEAL',
              quantityOnHand: currentQuantity,
              reorderThreshold: 10,
              isLowStock: currentQuantity <= 10,
            }),
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      ),
      http.post(`/spare-parts/${partId}/restock`, () => {
        currentQuantity = 777;
        return HttpResponse.json({
          sparePart: makePart({
            id: partId,
            sku: 'PUMP-SEAL',
            quantityOnHand: currentQuantity,
            reorderThreshold: 10,
            isLowStock: false,
          }),
          transaction: {},
        });
      }),
    );

    renderPage();

    const row = await screen.findByRole('row', { name: /PUMP-SEAL/ });
    expect(within(row).getByText('5')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Restock' }));

    const dialog = screen.getByRole('dialog', { name: 'Restock PUMP-SEAL' });
    await user.type(within(dialog).getByLabelText('Quantity to add'), '50');
    await user.click(within(dialog).getByRole('button', { name: 'Restock' }));

    const updatedRow = await screen.findByRole('row', { name: /PUMP-SEAL/ });
    expect(within(updatedRow).getByText('777')).toBeInTheDocument();
    expect(within(updatedRow).queryByText('55')).not.toBeInTheDocument();
  });
});
