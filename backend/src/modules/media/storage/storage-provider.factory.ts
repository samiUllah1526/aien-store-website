import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IStorageProvider, StorageProviderType } from './storage-provider.interface';
import { CloudinaryStorageProvider } from './cloudinary-storage.provider';

@Injectable()
export class StorageProviderFactory {
  private readonly providers: Map<StorageProviderType, IStorageProvider>;
  private readonly preferred: StorageProviderType;

  constructor(
    cloudinaryProvider: CloudinaryStorageProvider,
    private readonly config: ConfigService,
  ) {
    this.providers = new Map([['cloudinary', cloudinaryProvider]]);
    const configured = (this.config.get<string>('storage.provider') ?? 'cloudinary').toLowerCase();
    this.preferred =
      configured === 's3'
        ? 's3'
        : configured === 'local'
          ? 'local'
          : 'cloudinary';
  }

  /** Get the configured remote provider (cloudinary or s3). Local has no signed params. */
  getRemoteProvider(): IStorageProvider | null {
    if (this.preferred === 'local') return null;
    const p = this.providers.get(this.preferred);
    return p?.isEnabled() ? p : this.providers.get('cloudinary')?.isEnabled()
      ? this.providers.get('cloudinary')!
      : null;
  }

  /** Get provider by type (e.g. for parsing response when provider is known). */
  getByType(type: StorageProviderType): IStorageProvider | null {
    return this.providers.get(type) ?? null;
  }
}
