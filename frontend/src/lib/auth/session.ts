import { useSyncExternalStore } from 'react';
import { SESSION_EXPIRED_EVENT, refreshSession } from '../api/client';
import {
  getAccessToken as getStoredAccessToken,
  setAccessToken as setStoredAccessToken,
} from '../api/tokenStore';
import {
  getMe,
  logout,
  type AuthTokens,
  type AuthUser,
} from '../../features/auth/api';

export type SessionStatus = 'restoring' | 'authenticated' | 'unauthenticated';

export interface SessionState {
  status: SessionStatus;
  user: AuthUser | null;
}

// Refresh-token storage: Option A (httpOnly cookie), per docs/decisions.md #1.
// The cookie is set by the backend on login/refresh and is never read or
// written from JavaScript. The access token lives only in this module
// variable (never in localStorage) and does not survive a reload, which is
// why startup goes through restoreSession() below.
let state: SessionState = { status: 'restoring', user: null };
const listeners = new Set<() => void>();

function setState(next: SessionState): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SessionState {
  return state;
}

export function getAccessToken(): string | null {
  return getStoredAccessToken();
}

export async function signIn(tokens: AuthTokens): Promise<void> {
  setStoredAccessToken(tokens.accessToken);
  try {
    const user = await getMe();
    setState({ status: 'authenticated', user });
  } catch (error) {
    setStoredAccessToken(null);
    setState({ status: 'unauthenticated', user: null });
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    await logout();
  } catch {
    // Best-effort revocation; the session is cleared locally regardless.
  } finally {
    setStoredAccessToken(null);
    setState({ status: 'unauthenticated', user: null });
  }
}

function handleSessionExpired(): void {
  setState({ status: 'unauthenticated', user: null });
}

export async function restoreSession(): Promise<void> {
  try {
    await refreshSession();
    const user = await getMe();
    setState({ status: 'authenticated', user });
  } catch {
    setStoredAccessToken(null);
    setState({ status: 'unauthenticated', user: null });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
