import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { signIn, signOut } from '../../lib/auth/session';
import AlertsPage from './AlertsPage';
import type { Notification } from './api';

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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/alerts']}>
        <AlertsPage />
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
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const matches =
        (!status || notification.status === status) &&
        (!type || notification.type === type);
      const data = matches ? [notification] : [];
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
    http.patch(`/notifications/${notification.id}/resolve`, () => {
      notification.status = 'RESOLVED';
      notification.resolvedAt = '2026-01-01T01:00:00.000Z';
      notification.resolvedByUserId = 'user-1';
      return HttpResponse.json(notification);
    }),
  );
}

describe('AlertsPage', () => {
  it('has no axe violations when the list is loaded (17.1)', async () => {
    mockSession(['TECHNICIAN']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    mockNotificationsEndpoint(makeNotification());

    const { container } = renderPage();
    await screen.findByText(
      'PUMP-01 exceeded the critical temperature threshold.',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('defaults to the UNREAD filter and removes a resolved item after refetch', async () => {
    const user = userEvent.setup();
    mockSession(['TECHNICIAN']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    const notification = makeNotification();
    mockNotificationsEndpoint(notification);

    renderPage();

    await screen.findByText(
      'PUMP-01 exceeded the critical temperature threshold.',
    );

    await user.click(screen.getByRole('button', { name: 'Resolve' }));

    expect(
      await screen.findByText('No unread alerts right now.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'PUMP-01 exceeded the critical temperature threshold.',
      ),
    ).not.toBeInTheDocument();
  });

  it('shows the filtered-empty message, not the sphere, once a non-default filter has no matches', async () => {
    const user = userEvent.setup();
    mockSession(['TECHNICIAN']);
    await signIn({ accessToken: 'token', refreshToken: 'refresh' });

    mockNotificationsEndpoint(makeNotification({ status: 'UNREAD' }));

    renderPage();
    await screen.findByText(
      'PUMP-01 exceeded the critical temperature threshold.',
    );

    await user.selectOptions(screen.getByLabelText('Status'), 'ACKNOWLEDGED');

    expect(
      await screen.findByText('No alerts match these filters.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No unread alerts right now.'),
    ).not.toBeInTheDocument();
  });
});
