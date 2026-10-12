import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequireAuth } from './RequireAuth';
import { useSession } from '../lib/auth/session';

vi.mock('../lib/auth/session', () => ({
  useSession: vi.fn(),
}));

const mockedUseSession = vi.mocked(useSession);

afterEach(cleanup);

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from;
  return <div>login screen{from ? `, from ${from.pathname}` : ''}</div>;
}

function renderProtected(initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireAuth>
              <div>secret content</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('shows a loading skeleton, not the protected content or the login screen, while restoring', () => {
    mockedUseSession.mockReturnValue({ status: 'restoring', user: null });

    renderProtected();

    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
    expect(screen.queryByText(/login screen/)).not.toBeInTheDocument();
  });

  it('redirects to /login and remembers the intended path when signed out', () => {
    mockedUseSession.mockReturnValue({
      status: 'unauthenticated',
      user: null,
    });

    renderProtected('/protected');

    expect(
      screen.getByText('login screen, from /protected'),
    ).toBeInTheDocument();
  });

  it('renders the protected content once authenticated', () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      user: { id: 'user-1', email: 'admin@plant.example', roles: ['ADMIN'] },
    });

    renderProtected();

    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});
