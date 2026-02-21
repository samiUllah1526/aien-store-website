import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, ConfigOptions } from 'cloudinary';
import type {
  IStorageProvider,
  SignedUploadParams,
  RegisterUploadPayload,
  UploadFolder,
} from './storage-provider.interface';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CloudinaryStorageProvider implements IStorageProvider {
  readonly type = 'cloudinary' as const;
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const storage = this.config.get<{ cloudinary?: { cloudName?: string; apiKey?: string; apiSecret?: string } }>('storage');
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

    const timestamp = Math.floor(Date.now() / 1000);
    // Sign only the params we send to the client; Cloudinary verifies against what it receives
    const paramsToSign: Record<string, string | number> = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, this.apiSecret);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    return {
      provider: 'cloudinary',
      uploadUrl,
      params: {
        api_key: this.apiKey,
        timestamp: String(timestamp),
        signature,
        folder,
      },
      validation: {
        allowedMimes: ALLOWED_MIMES,
        maxSizeBytes: MAX_SIZE_BYTES,
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
    };
    if (!r?.public_id || !r?.secure_url) return null;
    return {
      provider: 'cloudinary',
      storageKey: r.public_id,
      deliveryUrl: r.secure_url,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
    };
  }
}
