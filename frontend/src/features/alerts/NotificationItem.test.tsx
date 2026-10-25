import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../test/msw/server';
import { useSession } from '../../lib/auth/session';
import type { Role } from '../../lib/auth/roles';
import { NotificationItem } from './NotificationItem';
import type { Notification, NotificationStatus } from './api';

vi.mock('../../lib/auth/session', () => ({
  useSession: vi.fn(),
}));

const mockedUseSession = vi.mocked(useSession);

afterEach(() => {
  vi.clearAllMocks();
});

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

function renderItem(notification: Notification, roles: Role[]) {
  mockedUseSession.mockReturnValue({
    status: 'authenticated',
    user: { id: 'user-1', email: 'user@plant.example', roles },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationItem notification={notification} />
    </QueryClientProvider>,
  );
}

const STATUSES: NotificationStatus[] = ['UNREAD', 'ACKNOWLEDGED', 'RESOLVED'];
const ROLES: Role[] = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'VIEWER'];

describe('NotificationItem actions by status and role (14.2 matrix)', () => {
  for (const status of STATUSES) {
    for (const role of ROLES) {
      const canAct = role !== 'VIEWER';
      // ACKNOWLEDGE: shown for UNREAD items only.
      const expectAcknowledge = status === 'UNREAD' && canAct;
      // RESOLVE: shown for UNREAD or ACKNOWLEDGED items.
      const expectResolve = status !== 'RESOLVED' && canAct;

      it(`status=${status} role=${role} -> acknowledge ${
        expectAcknowledge ? 'shown' : 'hidden'
      }, resolve ${expectResolve ? 'shown' : 'hidden'}`, () => {
        renderItem(makeNotification({ status }), [role]);

        if (expectAcknowledge) {
          expect(
            screen.getByRole('button', { name: 'Acknowledge' }),
          ).toBeInTheDocument();
        } else {
          expect(
            screen.queryByRole('button', { name: 'Acknowledge' }),
          ).not.toBeInTheDocument();
        }

        if (expectResolve) {
          expect(
            screen.getByRole('button', { name: 'Resolve' }),
          ).toBeInTheDocument();
        } else {
          expect(
            screen.queryByRole('button', { name: 'Resolve' }),
          ).not.toBeInTheDocument();
        }
      });
    }
  }
});

describe('NotificationItem status tag', () => {
  it('shows RESOLVED, not a hardcoded ACKNOWLEDGED tag, for a resolved notification', () => {
    renderItem(makeNotification({ status: 'RESOLVED' }), ['ADMIN']);

    expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    expect(screen.queryByText('ACKNOWLEDGED')).not.toBeInTheDocument();
  });

  it('shows ACKNOWLEDGED for an acknowledged notification', () => {
    renderItem(makeNotification({ status: 'ACKNOWLEDGED' }), ['ADMIN']);

    expect(screen.getByText('ACKNOWLEDGED')).toBeInTheDocument();
  });

  it('shows the notification type, not the status, while unread', () => {
    renderItem(makeNotification({ status: 'UNREAD', type: 'LOW_STOCK' }), [
      'ADMIN',
    ]);

    expect(screen.getByText('LOW STOCK')).toBeInTheDocument();
    expect(screen.queryByText('UNREAD')).not.toBeInTheDocument();
  });
});

describe('NotificationItem AI note (14.3)', () => {
  it('shows the diagnostic note panel only when aiNote is set', () => {
    renderItem(
      makeNotification({ aiNote: 'Vibration has trended upward for 48h.' }),
      ['ADMIN'],
    );

    expect(screen.getByText('Diagnostic note')).toBeInTheDocument();
    expect(
      screen.getByText('Vibration has trended upward for 48h.'),
    ).toBeInTheDocument();
  });

  it('omits the diagnostic note panel when aiNote is null', () => {
    renderItem(makeNotification({ aiNote: null }), ['ADMIN']);

    expect(screen.queryByText('Diagnostic note')).not.toBeInTheDocument();
  });
});

describe('NotificationItem action failures', () => {
  it('shows the server message and does not crash when acknowledge fails', async () => {
    const user = userEvent.setup();
    const notification = makeNotification({ status: 'UNREAD' });
    server.use(
      http.patch(`/notifications/${notification.id}/acknowledge`, () =>
        HttpResponse.json(
          {
            message:
              'Cannot acknowledge a notification that is already resolved',
            path: `/notifications/${notification.id}/acknowledge`,
          },
          { status: 409 },
        ),
      ),
    );

    renderItem(notification, ['TECHNICIAN']);
    await user.click(screen.getByRole('button', { name: 'Acknowledge' }));

    expect(
      await screen.findByText(
        'Cannot acknowledge a notification that is already resolved',
      ),
    ).toBeInTheDocument();
  });

  it('shows the server message and does not crash when resolve fails', async () => {
    const user = userEvent.setup();
    const notification = makeNotification({ status: 'ACKNOWLEDGED' });
    server.use(
      http.patch(`/notifications/${notification.id}/resolve`, () =>
        HttpResponse.json(
          {
            message: 'Notification is already resolved',
            path: `/notifications/${notification.id}/resolve`,
          },
          { status: 409 },
        ),
      ),
    );

    renderItem(notification, ['SUPERVISOR']);
    await user.click(screen.getByRole('button', { name: 'Resolve' }));

    expect(
      await screen.findByText('Notification is already resolved'),
    ).toBeInTheDocument();
  });
});
