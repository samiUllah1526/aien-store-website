import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { CloudinaryStorageProvider } from './storage/cloudinary-storage.provider';
import { StorageProviderFactory } from './storage/storage-provider.factory';

@Module({
  controllers: [],
  providers: [MediaService, CloudinaryStorageProvider, StorageProviderFactory],
  exports: [MediaService, StorageProviderFactory],
})
export class MediaModule {}
