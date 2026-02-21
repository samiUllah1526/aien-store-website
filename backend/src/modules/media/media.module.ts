import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { CloudinaryStorageProvider } from './storage/cloudinary-storage.provider';
import { StorageProviderFactory } from './storage/storage-provider.factory';

@Module({
  controllers: [MediaController],
  providers: [MediaService, CloudinaryStorageProvider, StorageProviderFactory],
  exports: [MediaService],
})
export class MediaModule {}
