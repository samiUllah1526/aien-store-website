/**
 * Provider-agnostic storage abstraction.
 * Swap Cloudinary for S3 or other providers without changing Media schema or API.
 */

export type StorageProviderType = 'local' | 'cloudinary' | 's3';

export type UploadFolder =
  | 'products'
  | 'payment-proofs'
  | 'review-photos'
  | 'review-videos';

export type UploadResourceType = 'image' | 'video';

export interface SignedUploadParams {
  /** Provider identifier so frontend can handle response accordingly. */
  provider: StorageProviderType;
  /** URL to POST the file to (Cloudinary, S3 presigned, etc.). */
  uploadUrl: string;
  /** Params to include in the upload request (provider-specific shape). */
  params: Record<string, string>;
  /** image | video — tells the client which Cloudinary resource endpoint was signed. */
  resourceType: UploadResourceType;
  /** Validation rules for client-side pre-check. */
  validation: {
    allowedMimes: readonly string[];
    maxSizeBytes: number;
    maxWidth?: number;
    maxHeight?: number;
  };
}

export interface RegisterUploadPayload {
  provider: StorageProviderType;
  /** Provider's storage key (public_id, S3 key, etc.) */
  storageKey: string;
  /** Full URL for delivery (CDN or origin). */
  deliveryUrl: string;
  filename?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

export interface IStorageProvider {
  readonly type: StorageProviderType;
  /** Whether this provider is configured and available. */
  isEnabled(): boolean;
  /** Generate signed params for direct browser upload. */
  getSignedUploadParams(folder: UploadFolder): SignedUploadParams;
  /** Parse provider response into normalized RegisterUploadPayload. */
  parseUploadResponse(response: unknown): RegisterUploadPayload | null;
}

export const REVIEW_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const REVIEW_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const REVIEW_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const REVIEW_VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const MAX_REVIEW_MEDIA = 5;

export function isReviewVideoFolder(folder: UploadFolder): boolean {
  return folder === 'review-videos';
}
