import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, ConfigOptions } from 'cloudinary';
import type {
  IStorageProvider,
  SignedUploadParams,
  RegisterUploadPayload,
  UploadFolder,
} from './storage-provider.interface';
import {
  isReviewVideoFolder,
  REVIEW_IMAGE_MAX_BYTES,
  REVIEW_VIDEO_MAX_BYTES,
  REVIEW_VIDEO_MIMES,
} from './storage-provider.interface';

const PRODUCT_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class CloudinaryStorageProvider implements IStorageProvider {
  readonly type = 'cloudinary' as const;
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const storage = this.config.get<{
      cloudinary?: { cloudName?: string; apiKey?: string; apiSecret?: string };
    }>('storage');
    const cld = storage?.cloudinary ?? {};
    this.cloudName = cld.cloudName ?? '';
    this.apiKey = cld.apiKey ?? '';
    this.apiSecret = cld.apiSecret ?? '';
    this.enabled = !!(this.cloudName && this.apiKey && this.apiSecret);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getSignedUploadParams(folder: UploadFolder): SignedUploadParams {
    if (!this.enabled) {
      throw new BadRequestException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    } as ConfigOptions);

    const isVideo = isReviewVideoFolder(folder);
    const resourceType = isVideo ? 'video' : 'image';
    const timestamp = Math.floor(Date.now() / 1000);
    // Sign only the params we send to the client; Cloudinary verifies against what it receives
    const paramsToSign: Record<string, string | number> = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      this.apiSecret,
    );
    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    return {
      provider: 'cloudinary',
      uploadUrl,
      resourceType,
      params: {
        api_key: this.apiKey,
        timestamp: String(timestamp),
        signature,
        folder,
      },
      validation: {
        allowedMimes: isVideo ? REVIEW_VIDEO_MIMES : PRODUCT_IMAGE_MIMES,
        maxSizeBytes: isVideo
          ? REVIEW_VIDEO_MAX_BYTES
          : folder === 'review-photos'
            ? REVIEW_IMAGE_MAX_BYTES
            : PRODUCT_IMAGE_MAX_BYTES,
      },
    };
  }

  parseUploadResponse(response: unknown): RegisterUploadPayload | null {
    const r = response as {
      public_id?: string;
      secure_url?: string;
      bytes?: number;
      width?: number;
      height?: number;
      resource_type?: string;
      format?: string;
    };
    if (!r?.public_id || !r?.secure_url) return null;
    const mimeType = this.guessMime(r.resource_type, r.format);
    return {
      provider: 'cloudinary',
      storageKey: r.public_id,
      deliveryUrl: r.secure_url,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
      mimeType,
    };
  }

  private guessMime(
    resourceType?: string,
    format?: string,
  ): string | undefined {
    if (!format) return undefined;
    const f = format.toLowerCase();
    if (resourceType === 'video') {
      if (f === 'mp4') return 'video/mp4';
      if (f === 'webm') return 'video/webm';
      if (f === 'mov' || f === 'qt') return 'video/quicktime';
      return `video/${f}`;
    }
    if (f === 'jpg' || f === 'jpeg') return 'image/jpeg';
    if (f === 'png') return 'image/png';
    if (f === 'webp') return 'image/webp';
    if (f === 'gif') return 'image/gif';
    return `image/${f}`;
  }
}
