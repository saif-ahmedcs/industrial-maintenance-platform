import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { signIn, signOut } from '../../lib/auth/session';
import AuditPage from './AuditPage';
import type { AuditLog } from './api';

function mockSession(roles: string[]) {
  server.use(
    http.get('/auth/me', () =>
      HttpResponse.json({
        id: 'user-1',
        email: 'admin@plant.example',
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
      <MemoryRouter initialEntries={['/app/audit']}>
        <AuditPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeAuditLog(overrides: Partial<AuditLog>): AuditLog {
  return {
    id: 'audit-1',
    actorUserId: '11111111-2222-3333-4444-555555555555',
    entityType: 'Asset',
    entityId: '22222222-3333-4444-5555-666666666666',
    action: 'STATUS_CHANGE',
    before: { status: 'OPERATIONAL' },
    after: { status: 'CRITICAL' },
    source: 'manual',
    createdAt: '2026-10-20T12:00:00.000Z',
    ...overrides,
  };
}

function mockAuditLogs(entries: AuditLog[]) {
  server.use(
    http.get('/audit', () =>
      HttpResponse.json({
        data: entries,
        meta: { page: 1, limit: 20, total: entries.length, totalPages: 1 },
      }),
    ),
  );
}

describe('AuditPage', () => {
  it('shows "System" for a null actor and a user reference otherwise', async () => {
    mockSession(['ADMIN']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    mockAuditLogs([
      makeAuditLog({
        id: 'audit-system',
        action: 'AUTO_CREATE',
        actorUserId: null,
        entityId: '33333333-4444-5555-6666-777777777777',
        source: 'auto:condition-monitoring',
      }),
      makeAuditLog({
        id: 'audit-user',
        action: 'CREATE',
        actorUserId: '11111111-2222-3333-4444-555555555555',
        entityId: '44444444-5555-6666-7777-888888888888',
        source: 'manual',
      }),
    ]);

    renderPage();

    const systemRow = await screen.findByRole(
      'row',
      { name: /Auto Create/ },
      { timeout: 5000 },
    );
    expect(within(systemRow).getByText('System')).toBeInTheDocument();

    const userRow = screen.getByRole('row', { name: /#44444444/ });
    expect(within(userRow).getByText(/User #11111111/)).toBeInTheDocument();
    expect(within(userRow).queryByText('System')).not.toBeInTheDocument();
  });

  it('expands a row to reveal the before and after JSON, and hides it until then', async () => {
    const user = userEvent.setup();
    mockSession(['SUPERVISOR']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    mockAuditLogs([
      makeAuditLog({
        id: 'audit-diff',
        action: 'STATUS_CHANGE',
        before: { status: 'OPERATIONAL' },
        after: { status: 'CRITICAL' },
      }),
    ]);

    renderPage();

    const row = await screen.findByRole(
      'row',
      { name: /Status Change/ },
      { timeout: 5000 },
    );

    expect(screen.queryByText(/OPERATIONAL/)).not.toBeInTheDocument();
    expect(screen.queryByText(/"status": "CRITICAL"/)).not.toBeInTheDocument();

    await user.click(
      within(row).getByRole('button', { name: 'Expand change details' }),
    );

    expect(screen.getByText(/OPERATIONAL/)).toBeInTheDocument();
    expect(screen.getByText(/"status": "CRITICAL"/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Collapse change details' }),
    ).toBeInTheDocument();
  });

  it('renders no edit, delete, or export controls', async () => {
    const user = userEvent.setup();
    mockSession(['ADMIN']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    mockAuditLogs([makeAuditLog({})]);

    renderPage();

    const row = await screen.findByRole(
      'row',
      { name: /Status Change/ },
      { timeout: 5000 },
    );
    await user.click(
      within(row).getByRole('button', { name: 'Expand change details' }),
    );

    expect(
      screen.queryByRole('button', { name: /delete/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^edit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /export/i }),
    ).not.toBeInTheDocument();
  });
});
