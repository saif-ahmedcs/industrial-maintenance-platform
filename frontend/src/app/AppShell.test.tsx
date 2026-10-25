import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../test/msw/server';
import { signIn, signOut } from '../lib/auth/session';
import { AppShell } from './AppShell';
import AlertsPage from '../features/alerts/AlertsPage';
import type { Notification } from '../features/alerts/api';

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

function renderAppAtAlerts() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/alerts']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/alerts" element={<AlertsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    type: 'CRITICAL_ASSET',
    relatedEntityType: 'asset',
    relatedEntityId: 'asset-1',
    message: 'PUMP-01 exceeded the critical temperature threshold.',
    aiNote: null,
    status: 'UNREAD',
    createdAt: '2026-01-01T00:00:00.000Z',
    resolvedAt: null,
    resolvedByUserId: null,
    ...overrides,
  };
}

function mockNotificationsEndpoint(notification: Notification) {
  server.use(
    http.get('/notifications', ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      const data =
        !status || notification.status === status ? [notification] : [];
      return HttpResponse.json({
        data,
        meta: {
          page: 1,
          limit: 20,
          total: data.length,
          totalPages: data.length ? 1 : 0,
        },
      });
    }),
    http.patch(`/notifications/${notification.id}/acknowledge`, () => {
      notification.status = 'ACKNOWLEDGED';
      return HttpResponse.json(notification);
    }),
  );
}

describe('AppShell alert badge (14.4 / 14.5)', () => {
  it('shows the unread count and clears it once the alert is acknowledged', async () => {
    const user = userEvent.setup();
    mockSession(['TECHNICIAN']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    const notification = makeNotification();
    mockNotificationsEndpoint(notification);

    renderAppAtAlerts();

    const nav = screen.getByRole('navigation', { name: 'Main' });
    await within(nav).findByText('1');

    await user.click(screen.getByRole('button', { name: 'Acknowledge' }));

    await waitFor(() => {
      expect(within(nav).queryByText('1')).not.toBeInTheDocument();
    });
  });
});
