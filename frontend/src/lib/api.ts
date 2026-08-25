const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100/api/v1';

const K_ACCESS = 'tl_access';
const K_REFRESH = 'tl_refresh';
const K_SESSION = 'tl_session';
const K_PLATFORM_ACCESS = 'tl_platform_access';
const K_PLATFORM_REFRESH = 'tl_platform_refresh';

export class ApiClientError extends Error {
  status: number;
  code: string;
  body: unknown;
  constructor(status: number, code: string, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export const getAccessToken = () => localStorage.getItem(K_ACCESS);
export const getRefreshToken = () => localStorage.getItem(K_REFRESH);

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(K_ACCESS, access);
  localStorage.setItem(K_REFRESH, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(K_ACCESS);
  localStorage.removeItem(K_REFRESH);
  localStorage.removeItem(K_SESSION);
};

export const stashPlatformTokens = () => {
  const a = localStorage.getItem(K_ACCESS);
  const r = localStorage.getItem(K_REFRESH);
  if (a) localStorage.setItem(K_PLATFORM_ACCESS, a);
  if (r) localStorage.setItem(K_PLATFORM_REFRESH, r);
};

export const restorePlatformTokens = () => {
  const a = localStorage.getItem(K_PLATFORM_ACCESS);
  const r = localStorage.getItem(K_PLATFORM_REFRESH);
  if (a && r) {
    setTokens(a, r);
    localStorage.removeItem(K_PLATFORM_ACCESS);
    localStorage.removeItem(K_PLATFORM_REFRESH);
    localStorage.removeItem(K_SESSION);
    return true;
  }
  return false;
};

let refreshPromise: Promise<boolean> | null = null;

const tryRefresh = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = localStorage.getItem(K_REFRESH);
      if (!refresh) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        localStorage.setItem(K_SESSION, JSON.stringify({ ...data, accessToken: undefined, refreshToken: undefined }));
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshPromise = null), 100);
      }
    })();
  }
  return refreshPromise;
};

async function rawFetch(method: string, path: string, body?: unknown, retry = true): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && retry && !path.startsWith('/auth/login')) {
    const refreshed = await tryRefresh();
    if (refreshed) return rawFetch(method, path, body, false);
    clearTokens();
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/accept-invite')) {
      window.location.href = '/login';
    }
  }
  return res;
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await rawFetch(method, path, body);
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } })?.error;
    throw new ApiClientError(res.status, err?.code || 'ERROR', err?.message || `Request failed (${res.status})`, json);
  }
  return json as T;
}

export const apiGet = <T = unknown>(path: string) => api<T>('GET', path);
export const apiPost = <T = unknown>(path: string, body?: unknown) => api<T>('POST', path, body);
export const apiPatch = <T = unknown>(path: string, body?: unknown) => api<T>('PATCH', path, body);
export const apiDelete = <T = unknown>(path: string) => api<T>('DELETE', path);

export const saveSessionCache = (session: unknown) => localStorage.setItem(K_SESSION, JSON.stringify(session));
export const loadSessionCache = <T,>(): T | null => {
  const raw = localStorage.getItem(K_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};
