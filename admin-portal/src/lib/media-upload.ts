/**
 * Provider-agnostic media upload. Works with Cloudinary, S3, or future providers.
 * 1. Fetch signed params from backend
 * 2. POST file to provider URL
 * 3. Register in our DB
 */

import { getApiBaseUrl, getAuthToken } from './api';

export type StorageProviderType = 'local' | 'cloudinary' | 's3';

export interface SignedUploadParams {
  provider: StorageProviderType;
  uploadUrl: string;
  params: Record<string, string>;
  validation: {
    allowedMimes: readonly string[];
    maxSizeBytes: number;
    maxWidth?: number;
    maxHeight?: number;
  };
}

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateFile(file: File, validation: SignedUploadParams['validation']): string | null {
  if (!ALLOWED_MIMES.includes(file.type)) {
    return 'Invalid file type. Use JPEG, PNG, WebP or GIF.';
  }
  if (file.size > validation.maxSizeBytes) {
    return `File must be under ${Math.round(validation.maxSizeBytes / 1024 / 1024)}MB.`;
  }
  return null;
}

async function getSignedParams(folder: 'products' | 'payment-proofs'): Promise<SignedUploadParams> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = folder === 'payment-proofs' ? '/media/upload-params-payment-proof' : '/media/upload-params';
  const url = `${base}${path}${folder === 'products' ? '?folder=products' : ''}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const json = await res.json().catch(() => ({})) as { success?: boolean; data?: SignedUploadParams };
  if (!res.ok) throw new Error(json.message || 'Failed to get upload parameters');
  if (!json.data) throw new Error('No upload params returned');
  return json.data;
}

async function registerUpload(
  folder: 'products' | 'payment-proofs',
  payload: { provider: string; providerResponse: Record<string, unknown>; filename?: string },
): Promise<{ id: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = folder === 'payment-proofs' ? '/media/register-payment-proof' : '/media/register';
  const url = `${base}${path}`;
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: payload.provider,
      providerResponse: payload.providerResponse,
      filename: payload.filename,
    }),
  });
  const json = await res.json().catch(() => ({})) as { success?: boolean; data?: { id: string } };
  if (!res.ok) throw new Error(json.message || 'Failed to register upload');
  if (!json.data?.id) throw new Error('No media id returned');
  return json.data;
}

export interface UploadResult {
  id: string;
  deliveryUrl: string;
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
}

/**
 * Upload file via remote storage (Cloudinary, S3, etc.), then register in DB.
 */
export async function uploadMedia(
  file: File,
  folder: 'products' | 'payment-proofs',
  options?: UploadOptions,
): Promise<UploadResult> {
  const params = await getSignedParams(folder);
  const err = validateFile(file, params.validation);
  if (err) throw new Error(err);

  const formData = new FormData();
  formData.append('file', file);
  Object.entries(params.params).forEach(([k, v]) => formData.append(k, v));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && options?.onProgress) {
        options.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as Record<string, unknown>;
          const { id } = await registerUpload(folder, {
            provider: params.provider,
            providerResponse: response,
            filename: file.name,
          });
          const deliveryUrl =
            (response.secure_url as string) || (response.url as string) || '';
          resolve({ id, deliveryUrl });
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Upload failed'));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const errJson = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          msg = errJson.error?.message || msg;
        } catch {
          // ignore
        }
        reject(new Error(msg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', params.uploadUrl);
    xhr.send(formData);
  });
}

/** Check if remote upload is available. */
export async function isRemoteUploadAvailable(folder: 'products' | 'payment-proofs'): Promise<boolean> {
  try {
    await getSignedParams(folder);
    return true;
  } catch {
    return false;
  }
}
