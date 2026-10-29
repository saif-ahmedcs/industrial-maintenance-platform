import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { AppRouter } from './router';
import { AppProviders } from './providers';
import { server } from '../test/msw/server';
import { useSession } from '../lib/auth/session';

vi.mock('../lib/auth/session', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth/session')>(
    '../lib/auth/session',
  );
  return { ...actual, useSession: vi.fn() };
});

const mockedUseSession = vi.mocked(useSession);

function mockAppShellEndpoints() {
  server.use(
    http.get('/notifications', () =>
      HttpResponse.json({
        data: [],
        meta: { page: 1, limit: 5, total: 0, totalPages: 0 },
      }),
    ),
  );
}

describe('AppRouter code-splitting (17.4)', () => {
  it('shows the route fallback, then the lazily-loaded page, for an authenticated route', async () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      user: { id: 'user-1', email: 'admin@plant.example', roles: ['ADMIN'] },
    });
    mockAppShellEndpoints();
    window.history.pushState({}, '', '/app/account');

    render(
      <AppProviders>
        <AppRouter />
      </AppProviders>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Account' }),
    ).toBeInTheDocument();
  });
});
