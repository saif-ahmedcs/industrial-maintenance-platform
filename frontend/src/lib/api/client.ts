import { ApiError } from './errors';
import { getAccessToken, setAccessToken } from './tokenStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const SESSION_EXPIRED_EVENT = 'api:session-expired';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(API_BASE_URL + path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function doFetch(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(options.body !== undefined
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    signal: options.signal,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

function invalidateSession(): void {
  setAccessToken(null);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

let refreshPromise: Promise<void> | null = null;

function performRefresh(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function refreshAccessToken(): Promise<void> {
  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response, '/auth/refresh');
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : null;
  const accessToken =
    data &&
    typeof data === 'object' &&
    typeof (data as { accessToken?: unknown }).accessToken === 'string'
      ? (data as { accessToken: string }).accessToken
      : null;

  if (!accessToken) {
    throw new ApiError({
      status: response.status,
      message: 'Refresh response did not include an access token',
      path: '/auth/refresh',
    });
  }

  setAccessToken(accessToken);
}

type RefreshPhase = 'eligible' | 'retry' | 'disabled';

async function performRequest<T>(
  path: string,
  options: RequestOptions,
  phase: RefreshPhase,
): Promise<T> {
  const response = await doFetch(path, options);

  if (response.status === 401 && phase !== 'disabled') {
    if (phase === 'eligible') {
      try {
        await performRefresh();
      } catch {
        invalidateSession();
        throw await ApiError.fromResponse(response, path);
      }
      return performRequest<T>(path, options, 'retry');
    }
    invalidateSession();
    throw await ApiError.fromResponse(response, path);
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response, path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return performRequest<T>(
    path,
    options,
    options.skipAuthRefresh ? 'disabled' : 'eligible',
  );
}
