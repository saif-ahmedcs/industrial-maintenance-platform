import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { getAccessToken, signOut } from '../../lib/auth/session';
import LoginPage from './LoginPage';

function mockLogoutOk() {
  server.use(
    http.post('/auth/logout', () => new HttpResponse(null, { status: 204 })),
  );
}

afterEach(async () => {
  mockLogoutOk();
  await signOut();
});

function renderLoginPage(
  initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries'] = [
    '/login',
  ],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>overview screen</div>} />
        <Route
          path="/work-orders/:id"
          element={<div>work order detail screen</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email, password }: { email?: string; password?: string },
) {
  if (email !== undefined) {
    await user.type(screen.getByLabelText('Email'), email);
  }
  if (password !== undefined) {
    await user.type(screen.getByLabelText('Password'), password);
  }
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage', () => {
  it('has no axe violations on initial render (17.1)', async () => {
    const { container } = renderLoginPage();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows validation messages and does not submit when fields are empty', async () => {
    const user = userEvent.setup();
    let loginCalls = 0;
    server.use(
      http.post('/auth/login', () => {
        loginCalls += 1;
        return HttpResponse.json({ message: 'should not be called' });
      }),
    );

    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(loginCalls).toBe(0);
  });

  it('shows a format error for an invalid email and focuses the email field', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await fillAndSubmit(user, { email: 'not-an-email', password: 'x' });

    expect(
      await screen.findByText('Enter a valid email address'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('shows "Email or password is not correct." on 401 and keeps the password', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/auth/login', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    );

    renderLoginPage();
    await fillAndSubmit(user, {
      email: 'admin@plant.example',
      password: 'wrong-password',
    });

    expect(
      await screen.findByText('Email or password is not correct.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue('wrong-password');
  });

  it('shows "Too many attempts. Wait a minute and try again." on 429', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/auth/login', () =>
        HttpResponse.json({ message: 'Too Many Requests' }, { status: 429 }),
      ),
    );

    renderLoginPage();
    await fillAndSubmit(user, {
      email: 'admin@plant.example',
      password: 'whatever',
    });

    expect(
      await screen.findByText(
        'Too many attempts. Wait a minute and try again.',
      ),
    ).toBeInTheDocument();
  });

  it('stores the session and redirects to / on success with no intended path', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/auth/login', () =>
        HttpResponse.json({
          accessToken: 'fresh-token',
          refreshToken: 'fresh-refresh',
        }),
      ),
      http.get('/auth/me', () =>
        HttpResponse.json({
          id: 'user-1',
          email: 'admin@plant.example',
          roles: ['ADMIN'],
        }),
      ),
    );

    renderLoginPage(['/login']);
    await fillAndSubmit(user, {
      email: 'admin@plant.example',
      password: 'correct-password',
    });

    expect(await screen.findByText('overview screen')).toBeInTheDocument();
    expect(getAccessToken()).toBe('fresh-token');
  });

  it('redirects to the remembered intended path after a successful sign-in', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/auth/login', () =>
        HttpResponse.json({
          accessToken: 'fresh-token',
          refreshToken: 'fresh-refresh',
        }),
      ),
      http.get('/auth/me', () =>
        HttpResponse.json({
          id: 'user-1',
          email: 'tech@plant.example',
          roles: ['TECHNICIAN'],
        }),
      ),
    );

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: { pathname: '/work-orders/42', search: '' } },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/work-orders/:id"
            element={<div>work order detail screen</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    await fillAndSubmit(user, {
      email: 'tech@plant.example',
      password: 'correct-password',
    });

    expect(
      await screen.findByText('work order detail screen'),
    ).toBeInTheDocument();
  });

  it('disables the submit button and shows a loading state while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolveLogin: (() => void) | undefined;
    server.use(
      http.post(
        '/auth/login',
        () =>
          new Promise((resolve) => {
            resolveLogin = () =>
              resolve(
                HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
              );
          }),
      ),
    );

    renderLoginPage();
    await user.type(screen.getByLabelText('Email'), 'admin@plant.example');
    await user.type(screen.getByLabelText('Password'), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    resolveLogin?.();
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
