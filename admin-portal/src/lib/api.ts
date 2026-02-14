/**
 * API client for the NestJS backend.
 * Base URL: set via env PUBLIC_API_URL (e.g. http://localhost:3000) or fallback.
 * Auth: token from localStorage key 'admin_token' for write operations.
 */

const defaultBaseUrl =
  typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.PUBLIC_API_URL
    ? (import.meta as unknown as { env: Record<string, string> }).env.PUBLIC_API_URL
    : 'http://localhost:3000';

export function getApiBaseUrl(): string {
  return defaultBaseUrl || 'http://localhost:3000';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
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

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { params, ...init } = options;
  const base = getApiBaseUrl().replace(/\/$/, '');
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
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url.toString(), { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; message?: string | string[]; meta?: unknown };
  if (!res.ok) {
    const raw = json.message || res.statusText || `Request failed (${res.status})`;
    const msg = Array.isArray(raw) ? raw.join(' ') : raw;
    throw new Error(msg);
  }
  return json as T;
}

/** Multipart file upload (e.g. POST /media/upload). Returns { success, data: { id } }. */
export async function uploadFile(file: File): Promise<{ id: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = `${base}/media/upload`;
  const form = new FormData();
  form.append('file', file);
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', body: form, headers });
  const json = (await res.json().catch(() => ({}))) as ApiSingleResponse<{ id: string }>;
  if (!res.ok) throw new Error(json.message || res.statusText || 'Upload failed');
  if (!json.data?.id) throw new Error('Upload did not return media id');
  return json.data;
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
  delete(path: string) {
    return request<ApiSingleResponse<null>>(path, { method: 'DELETE' });
  },
};
