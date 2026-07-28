/**
 * Provider-agnostic media upload. Works with Cloudinary, S3, or future providers.
 * 1. Fetch signed params from backend
 * 2. POST file to provider URL
 * 3. Register in our DB
 */

import { getApiBaseUrl, getAuthToken } from './api';
import { incrementLoading, decrementLoading } from './loading';

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

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export function validateFile(file: File, validation: SignedUploadParams['validation']): string | null {
  const allowed = validation.allowedMimes?.length
    ? (validation.allowedMimes as readonly string[])
    : ALLOWED_MIMES;
  if (!allowed.includes(file.type)) {
    return 'Invalid file type. Use JPEG, PNG, WebP, GIF, MP4, WebM or MOV.';
  }
  if (file.size > validation.maxSizeBytes) {
    return `File must be under ${Math.round(validation.maxSizeBytes / 1024 / 1024)}MB.`;
  }
  return null;
}

async function getSignedParams(folder: 'products' | 'payment-proofs' | 'review-photos' | 'review-videos'): Promise<SignedUploadParams> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  let url: string;
  if (folder === 'payment-proofs') {
    url = `${base}/media/upload-params-payment-proof`;
  } else if (folder === 'review-photos' || folder === 'review-videos') {
    const type = folder === 'review-videos' ? 'video' : 'image';
    url = `${base}/review-media/upload-params?type=${type}`;
  } else {
    url = `${base}/media/upload-params?folder=products`;
  }
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const json = await res.json().catch(() => ({})) as { success?: boolean; data?: SignedUploadParams; message?: string };
  if (!res.ok) throw new Error(json.message ?? 'Failed to get upload parameters');
  if (!json.data) throw new Error('No upload params returned');
  return json.data;
}

async function registerUpload(
  folder: 'products' | 'payment-proofs' | 'review-photos' | 'review-videos',
  payload: { provider: string; providerResponse: Record<string, unknown>; filename?: string },
): Promise<{ id: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  let path: string;
  if (folder === 'payment-proofs') path = '/media/register-payment-proof';
  else if (folder === 'review-photos' || folder === 'review-videos') path = '/review-media/register';
  else path = '/media/register';
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
  const json = await res.json().catch(() => ({})) as { success?: boolean; data?: { id: string }; message?: string };
  if (!res.ok) throw new Error(json.message ?? 'Failed to register upload');
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
  folder: 'products' | 'payment-proofs' | 'review-photos' | 'review-videos',
  options?: UploadOptions,
): Promise<UploadResult> {
  incrementLoading();
  try {
    const params = await getSignedParams(folder);
    const err = validateFile(file, params.validation);
    if (err) throw new Error(err);

    const formData = new FormData();
    formData.append('file', file);
    Object.entries(params.params).forEach(([k, v]) => formData.append(k, v));

    const result = await new Promise<UploadResult>((resolve, reject) => {
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
    return result;
  } finally {
    decrementLoading();
  }
}

/** Check if remote upload is available. */
export async function isRemoteUploadAvailable(
  folder: 'products' | 'payment-proofs' | 'review-photos' | 'review-videos',
): Promise<boolean> {
  try {
    await getSignedParams(folder);
    return true;
  } catch {
    return false;
  }
}

export const MAX_REVIEW_MEDIA = 5;

export async function uploadReviewMediaAdmin(file: File): Promise<UploadResult & { kind: 'image' | 'video'; mimeType: string }> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
  const folder = isVideo ? 'review-videos' : 'review-photos';
  try {
    const result = await uploadMedia(file, folder);
    return { ...result, kind: isVideo ? 'video' : 'image', mimeType: file.type };
  } catch {
    // Legacy fallback
    const base = getApiBaseUrl().replace(/\/$/, '');
    const form = new FormData();
    form.append('file', file);
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${base}/review-media/upload`, { method: 'POST', headers, body: form });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { id: string };
      message?: string;
    };
    if (!res.ok || !json.data?.id) throw new Error(json.message || 'Upload failed');
    return {
      id: json.data.id,
      deliveryUrl: URL.createObjectURL(file),
      kind: isVideo ? 'video' : 'image',
      mimeType: file.type,
    };
  }
}
