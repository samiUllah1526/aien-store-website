/**
 * Provider-agnostic media upload for payment proof (checkout).
 */

import { getApiBaseUrl } from './api';

export interface SignedUploadParams {
  provider: string;
  uploadUrl: string;
  params: Record<string, string>;
  validation: {
    allowedMimes: readonly string[];
    maxSizeBytes: number;
  };
}

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validatePaymentProofFile(
  file: File,
  validation: SignedUploadParams['validation'],
): string | null {
  if (!ALLOWED_MIMES.includes(file.type)) {
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
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: SignedUploadParams };
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
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: { id: string } };
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
