/**
 * API client for the NestJS backend.
 * Base URL: set via env PUBLIC_API_URL (e.g. http://localhost:3000) or fallback.
 * Auth: access token from localStorage.
 */

import { getStoredToken, clearStoredTokens, decodeToken } from './auth';
import { adminApiBaseUrl, loginRedirectPath } from './config';
import { toastError, toastSuccess } from './toast';
import { incrementLoading, decrementLoading } from './loading';

export function getApiBaseUrl(): string {
  return adminApiBaseUrl;
}

export function getAuthToken(): string | null {
  return getStoredToken();
}

export interface ApiListResponse<T> {
  success: boolean;
  data?: T[];
  message?: string;
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

export interface ApiSingleResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const FETCH_TIMEOUT_MS = 15000;

function normalizeErrorMessage(raw: string | string[] | undefined, fallback: string): string {
  if (!raw) return fallback;
  return Array.isArray(raw) ? raw.join(' ') : raw;
}

function logUnauthorizedDebug(path: string, message: string, token: string | null): void {
  if (typeof window === 'undefined') return;
  const payload = token ? decodeToken(token) : null;
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = typeof payload?.exp === 'number' ? payload.exp : undefined;
  console.warn('[admin-api] 401 received', {
    path,
    message,
    hasToken: !!token,
    tokenAud: payload?.aud ?? null,
    tokenIss: payload?.iss ?? null,
    tokenExp: exp ?? null,
    tokenExpIso: exp ? new Date(exp * 1000).toISOString() : null,
    secondsUntilExp: exp ? exp - nowSec : null,
  });
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { params, ...init } = options;
  const base = adminApiBaseUrl.replace(/\/$/, '');
  const url = new URL(path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  incrementLoading();
  try {
    try {
      res = await fetch(url.toString(), { ...init, headers, signal: controller.signal });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        const msg = `Request timed out. Check that the backend is running at ${base} and the API URL is correct.`;
        toastError(msg);
        throw new Error(msg);
      }
      if (err instanceof Error) toastError(err.message);
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; message?: string | string[]; meta?: unknown };

    if (res.status === 401) {
      const msg = normalizeErrorMessage(json.message, res.statusText || 'Unauthorized');
      logUnauthorizedDebug(path, msg, token);
      clearStoredTokens();
      if (typeof window !== 'undefined') window.location.href = loginRedirectPath;
      toastError(msg);
      throw new Error(msg);
    }

    if (!res.ok) {
      const msg = normalizeErrorMessage(json.message, res.statusText || `Request failed (${res.status})`);
      toastError(msg);
      throw new Error(msg);
    }
    return json as T;
  } finally {
    decrementLoading();
  }
}

/** Multipart file upload (e.g. POST /admin/media/upload). Returns { success, data: { id } }. */
export async function uploadFile(file: File): Promise<{ id: string }> {
  const base = adminApiBaseUrl.replace(/\/$/, '');
  const url = `${base}/media/upload`;
  const form = new FormData();
  form.append('file', file);
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  incrementLoading();
  try {
    const res = await fetch(url, { method: 'POST', body: form, headers });
    const json = (await res.json().catch(() => ({}))) as ApiSingleResponse<{ id: string }> & {
      message?: string | string[];
    };
    if (res.status === 401) {
      const msg = normalizeErrorMessage(json.message, 'Unauthorized');
      logUnauthorizedDebug('/media/upload', msg, token);
      clearStoredTokens();
      if (typeof window !== 'undefined') window.location.href = loginRedirectPath;
      toastError(msg);
      throw new Error(msg);
    }
    if (!res.ok) {
      const msg = (json.message as string) || res.statusText || 'Upload failed';
      toastError(msg);
      throw new Error(msg);
    }
    if (!json.data?.id) {
      toastError('Upload did not return media id');
      throw new Error('Upload did not return media id');
    }
    return json.data;
  } finally {
    decrementLoading();
  }
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | undefined>) {
    return request<ApiSingleResponse<T>>(path, { method: 'GET', params });
  },
  getList<T>(path: string, params?: Record<string, string | number | undefined>) {
    return request<ApiListResponse<T>>(path, { method: 'GET', params });
  },
  post<T>(path: string, body: unknown) {
    return request<ApiSingleResponse<T>>(path, { method: 'POST', body: JSON.stringify(body) });
  },
  put<T>(path: string, body: unknown) {
    return request<ApiSingleResponse<T>>(path, { method: 'PUT', body: JSON.stringify(body) });
  },
  patch<T>(path: string, body: unknown) {
    return request<ApiSingleResponse<T>>(path, { method: 'PATCH', body: JSON.stringify(body) });
  },
  delete(path: string) {
    return request<ApiSingleResponse<null>>(path, { method: 'DELETE' });
  },
};

/** Queue a GitHub Actions rebuild of the main (storefront) website. Requires deploy:website. */
export async function deployMainWebsite(reason?: string): Promise<{ actionsUrl: string }> {
  const json = await api.post<{ actionsUrl: string }>('/deploy/main-website', {
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  });
  if (!json.success || !json.data?.actionsUrl) {
    const msg = typeof json.message === 'string' ? json.message : 'Deploy request failed';
    throw new Error(msg);
  }
  toastSuccess(json.message || 'Rebuild queued in GitHub Actions.');
  return json.data;
}
