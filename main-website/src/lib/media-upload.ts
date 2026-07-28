/**
 * Provider-agnostic media upload for payment proof (checkout) and review media.
 */

import { getApiBaseUrl, getStoreToken } from './api';

export interface SignedUploadParams {
  provider: string;
  uploadUrl: string;
  params: Record<string, string>;
  resourceType?: 'image' | 'video';
  validation: {
    allowedMimes: readonly string[];
    maxSizeBytes: number;
  };
}

const PAYMENT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_REVIEW_MEDIA = 5;

export function validatePaymentProofFile(
  file: File,
  validation: SignedUploadParams['validation'],
): string | null {
  if (!PAYMENT_MIMES.includes(file.type)) {
    return 'Use a JPEG, PNG, WebP or GIF image';
  }
  if (file.size > validation.maxSizeBytes) {
    return `File must be under ${Math.round(validation.maxSizeBytes / 1024 / 1024)}MB`;
  }
  return null;
}

async function getSignedParams(): Promise<SignedUploadParams> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const res = await fetch(`${base}/media/upload-params-payment-proof`);
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: SignedUploadParams;
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || 'Failed to get upload parameters');
  if (!json.data) throw new Error('No upload params returned');
  return json.data;
}

async function registerPaymentProof(payload: {
  provider: string;
  providerResponse: Record<string, unknown>;
  filename?: string;
}): Promise<{ id: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const res = await fetch(`${base}/media/register-payment-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { id: string };
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || 'Failed to register payment proof');
  if (!json.data?.id) throw new Error('No media id returned');
  return json.data;
}

/**
 * Upload payment proof via remote storage, register in DB, return media id.
 */
export async function uploadPaymentProofRemote(file: File): Promise<string> {
  const params = await getSignedParams();
  const err = validatePaymentProofFile(file, params.validation);
  if (err) throw new Error(err);

  const formData = new FormData();
  formData.append('file', file);
  Object.entries(params.params).forEach(([k, v]) => formData.append(k, v));

  const response = await fetch(params.uploadUrl, { method: 'POST', body: formData });
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error((result.error?.message as string) || `Upload failed (${response.status})`);
  }

  const { id } = await registerPaymentProof({
    provider: params.provider,
    providerResponse: result,
    filename: file.name,
  });
  return id;
}

function authHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = getStoreToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
}

export type ReviewUploadResult = {
  id: string;
  url: string;
  mimeType: string;
  kind: 'image' | 'video';
};

/**
 * Upload a review image or video (direct Cloudinary → register).
 * Falls back to server multipart if remote storage is unavailable.
 */
export async function uploadReviewMedia(file: File): Promise<ReviewUploadResult> {
  const kind: 'image' | 'video' = isVideoFile(file) ? 'video' : 'image';
  const base = getApiBaseUrl().replace(/\/$/, '');

  try {
    const paramsRes = await fetch(`${base}/media/upload-params-review?type=${kind}`, {
      headers: authHeaders(),
    });
    const paramsJson = (await paramsRes.json().catch(() => ({}))) as {
      success?: boolean;
      data?: SignedUploadParams;
      message?: string;
    };
    if (!paramsRes.ok || !paramsJson.data) {
      throw new Error(paramsJson.message || 'Failed to get upload parameters');
    }
    const params = paramsJson.data;
    if (!(params.validation.allowedMimes as readonly string[]).includes(file.type)) {
      throw new Error(
        kind === 'video'
          ? 'Use an MP4, WebM or MOV video'
          : 'Use a JPEG, PNG, WebP or GIF image',
      );
    }
    if (file.size > params.validation.maxSizeBytes) {
      throw new Error(
        `File must be under ${Math.round(params.validation.maxSizeBytes / 1024 / 1024)}MB`,
      );
    }

    const formData = new FormData();
    formData.append('file', file);
    Object.entries(params.params).forEach(([k, v]) => formData.append(k, v));

    const uploadRes = await fetch(params.uploadUrl, { method: 'POST', body: formData });
    const result = (await uploadRes.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: { message?: string };
      secure_url?: string;
      url?: string;
    };
    if (!uploadRes.ok) {
      throw new Error(result.error?.message || `Upload failed (${uploadRes.status})`);
    }

    const regRes = await fetch(`${base}/media/register-review`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        provider: params.provider,
        providerResponse: result,
        filename: file.name,
        mimeType: file.type,
      }),
    });
    const regJson = (await regRes.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { id: string };
      message?: string;
    };
    if (!regRes.ok || !regJson.data?.id) {
      throw new Error(regJson.message || 'Failed to register review media');
    }
    return {
      id: regJson.data.id,
      url: (result.secure_url as string) || (result.url as string) || '',
      mimeType: file.type,
      kind,
    };
  } catch (remoteErr) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${base}/media/upload-review`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { id: string };
      message?: string;
    };
    if (!res.ok || !json.data?.id) {
      throw remoteErr instanceof Error ? remoteErr : new Error(json.message || 'Upload failed');
    }
    return {
      id: json.data.id,
      url: URL.createObjectURL(file),
      mimeType: file.type,
      kind,
    };
  }
}
