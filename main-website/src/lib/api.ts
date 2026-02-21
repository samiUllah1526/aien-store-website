/**
 * API client for the storefront (main website).
 * Base URL: PUBLIC_API_URL (e.g. http://localhost:3000) or fallback.
 * Auth: access token from localStorage.
 */

import { useAuthStore } from '../store/authStore';

const defaultBaseUrl =
  typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.PUBLIC_API_URL
    ? (import.meta as unknown as { env: Record<string, string> }).env.PUBLIC_API_URL
    : 'http://localhost:3000';

export function getApiBaseUrl(): string {
  return defaultBaseUrl?.trim() || 'http://localhost:3000';
}

export function getStoreToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('store_token');
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
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {},
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
  const token = getStoreToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url.toString(), { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; message?: string };

  if (res.status === 401) {
    useAuthStore.getState().clearAuth();
    const msg = json.message || res.statusText || 'Unauthorized';
    throw new Error(msg);
  }

  if (!res.ok) {
    const raw = json.message ?? res.statusText ?? `Request failed (${res.status})`;
    const msg = Array.isArray(raw) ? raw[0] : raw;
    throw new Error(String(msg));
  }
  return json as T;
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | undefined>) {
    return request<ApiSingleResponse<T>>(path, { method: 'GET', params });
  },
  getList<T>(path: string, params?: Record<string, string | number | undefined>) {
    return request<ApiListResponse<T>>(path, { method: 'GET', params });
  },
  post<T>(path: string, body: unknown, options?: { headers?: Record<string, string>; signal?: AbortSignal }) {
    return request<ApiSingleResponse<T>>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...(options?.headers && { headers: options.headers }),
      ...(options?.signal && { signal: options.signal }),
    });
  },
  put<T>(path: string, body: unknown) {
    return request<ApiSingleResponse<T>>(path, { method: 'PUT', body: JSON.stringify(body) });
  },
  delete<T>(path: string) {
    return request<ApiSingleResponse<T>>(path, { method: 'DELETE' });
  },
};

/** Saved shipping for checkout "Save for next time" (requires auth). */
export interface SavedShippingDto {
  firstName: string | null;
  lastName: string | null;
  customerPhone: string | null;
  shippingCountry: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
}

export const profileApi = {
  getShipping: () => api.get<SavedShippingDto | null>('/profile/shipping').then((r) => r.data ?? null),
  saveShipping: (body: {
    firstName?: string;
    lastName?: string;
    customerPhone?: string;
    shippingCountry?: string;
    shippingAddressLine1?: string;
    shippingAddressLine2?: string;
    shippingCity?: string;
    shippingPostalCode?: string;
  }) => api.put<SavedShippingDto>('/profile/shipping', body).then((r) => r.data),
};

/** Customer favorites (requires auth). */
export const favoritesApi = {
  list: () => api.get<unknown[]>('/favorites').then((r) => r.data ?? []),
  getIds: () => api.get<string[]>('/favorites/ids').then((r) => r.data ?? []),
  add: (productId: string) => api.post<{ added: boolean }>('/favorites/' + productId, {}),
  remove: (productId: string) => api.delete<{ removed: boolean }>('/favorites/' + productId),
};

/** Upload payment proof image for Bank Deposit (public). Returns media id to send in checkout. */
export async function uploadPaymentProof(file: File): Promise<string> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = `${base}/media/upload-payment-proof`;
  const form = new FormData();
  form.append('file', file);
  const token = getStoreToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', body: form, headers });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: { id: string }; message?: string };
  if (res.status === 401) {
    useAuthStore.getState().clearAuth();
    throw new Error(json.message || 'Unauthorized');
  }
  if (!res.ok) throw new Error(json.message || `Upload failed (${res.status})`);
  if (!json.data?.id) throw new Error('No media id returned');
  return json.data.id;
}

/** Customer order history (requires auth). */
export const ordersApi = {
  myOrders: (params?: { page?: number; limit?: number }) =>
    api.getList<OrderDto>('/orders/me', params as Record<string, string | number | undefined>),
  myOrder: (id: string) => api.get<OrderDto>('/orders/me/' + id),
};

export interface OrderDto {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  courierServiceName: string | null;
  trackingId: string | null;
  shippingCountry: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName?: string;
    productImage?: string | null;
    quantity: number;
    unitCents: number;
  }>;
  statusHistory: Array<{ status: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}
