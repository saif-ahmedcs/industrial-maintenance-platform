import { act, cleanup, renderHook } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import type { AuthTokens, AuthUser } from '../../features/auth/api';
import { SESSION_EXPIRED_EVENT } from '../api/client';
import {
  getAccessToken,
  restoreSession,
  signIn,
  signOut,
  useSession,
} from './session';

const ME: AuthUser = {
  id: 'user-1',
  email: 'admin@plant.example',
  roles: ['ADMIN'],
};

const TOKENS: AuthTokens = {
  accessToken: 'fresh-access-token',
  refreshToken: 'fresh-refresh-token',
};

function mockLogoutOk() {
  server.use(
    http.post('/auth/logout', () => new HttpResponse(null, { status: 204 })),
  );
}

function mockMeOk() {
  server.use(http.get('/auth/me', () => HttpResponse.json(ME)));
}

beforeEach(async () => {
  mockLogoutOk();
  await signOut();
});

afterEach(async () => {
  cleanup();
  mockLogoutOk();
  await signOut();
});

describe('restoreSession', () => {
  it('restores an authenticated session from the refresh cookie on load', async () => {
    server.use(
      http.post('/auth/refresh', () =>
        HttpResponse.json({ ...TOKENS, accessToken: 'restored-token' }),
      ),
    );
    mockMeOk();

    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('unauthenticated');

    await act(async () => {
      await restoreSession();
    });

    expect(result.current).toEqual({ status: 'authenticated', user: ME });
    expect(getAccessToken()).toBe('restored-token');
  });

  it('leaves the session signed out when there is no valid refresh cookie', async () => {
    server.use(
      http.post('/auth/refresh', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    );

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await restoreSession();
    });

    expect(result.current).toEqual({ status: 'unauthenticated', user: null });
    expect(getAccessToken()).toBeNull();
  });
});

describe('signIn', () => {
  it('stores the access token and loads the current user', async () => {
    mockMeOk();

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await signIn(TOKENS);
    });

    expect(result.current).toEqual({ status: 'authenticated', user: ME });
    expect(getAccessToken()).toBe(TOKENS.accessToken);
  });

  it('clears the token and rejects when /auth/me fails after sign-in', async () => {
    server.use(
      http.get('/auth/me', () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useSession());

    let caughtError: unknown;
    await act(async () => {
      try {
        await signIn(TOKENS);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBeTruthy();
    expect(result.current).toEqual({ status: 'unauthenticated', user: null });
    expect(getAccessToken()).toBeNull();
  });
});

describe('signOut', () => {
  it('clears the session after a successful logout call', async () => {
    mockMeOk();
    await signIn(TOKENS);

    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('authenticated');

    mockLogoutOk();
    await act(async () => {
      await signOut();
    });

    expect(result.current).toEqual({ status: 'unauthenticated', user: null });
    expect(getAccessToken()).toBeNull();
  });

  it('still clears the local session when the logout call fails', async () => {
    mockMeOk();
    await signIn(TOKENS);

    const { result } = renderHook(() => useSession());

    server.use(
      http.post('/auth/logout', () => new HttpResponse(null, { status: 500 })),
    );
    await act(async () => {
      await signOut();
    });

    expect(result.current).toEqual({ status: 'unauthenticated', user: null });
    expect(getAccessToken()).toBeNull();
  });
});

describe('session expiry', () => {
  it('signs the user out when the api client reports an expired session', async () => {
    mockMeOk();
    await signIn(TOKENS);

    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('authenticated');

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });

    expect(result.current).toEqual({ status: 'unauthenticated', user: null });
  });
});
