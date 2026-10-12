import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequireRole } from './RequireRole';
import { useSession } from '../lib/auth/session';
import type { Role } from '../lib/auth/roles';

vi.mock('../lib/auth/session', () => ({
  useSession: vi.fn(),
}));

const mockedUseSession = vi.mocked(useSession);

afterEach(cleanup);

function renderGuarded(allowedRoles: Role[]) {
  return render(
    <MemoryRouter initialEntries={['/audit']}>
      <Routes>
        <Route
          path="/audit"
          element={
            <RequireRole roles={allowedRoles}>
              <div>audit log</div>
            </RequireRole>
          }
        />
        <Route path="/not-permitted" element={<div>not permitted</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  it('renders the protected content when the user holds one of the allowed roles', () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'super@plant.example',
        roles: ['SUPERVISOR'],
      },
    });

    renderGuarded(['ADMIN', 'SUPERVISOR']);

    expect(screen.getByText('audit log')).toBeInTheDocument();
    expect(screen.queryByText('not permitted')).not.toBeInTheDocument();
  });

  it('redirects to /not-permitted when the user holds none of the allowed roles', () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'user-2',
        email: 'tech@plant.example',
        roles: ['TECHNICIAN'],
      },
    });

    renderGuarded(['ADMIN', 'SUPERVISOR']);

    expect(screen.getByText('not permitted')).toBeInTheDocument();
    expect(screen.queryByText('audit log')).not.toBeInTheDocument();
  });

  it('redirects to /not-permitted when there is no user yet', () => {
    mockedUseSession.mockReturnValue({ status: 'restoring', user: null });

    renderGuarded(['ADMIN', 'SUPERVISOR']);

    expect(screen.getByText('not permitted')).toBeInTheDocument();
  });

  it('renders the content when a multi-role user holds at least one allowed role', () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'user-3',
        email: 'both@plant.example',
        roles: ['VIEWER', 'ADMIN'],
      },
    });

    renderGuarded(['ADMIN', 'SUPERVISOR']);

    expect(screen.getByText('audit log')).toBeInTheDocument();
  });
});
