import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { MediaService } from '../../modules/media/media.service';
import { StorageProviderFactory } from '../../modules/media/storage/storage-provider.factory';
import { RegisterMediaDto } from '../../modules/media/dto/register-media.dto';
import type { UploadFolder } from '../../modules/media/storage/storage-provider.interface';
import {
  REVIEW_IMAGE_MAX_BYTES,
  REVIEW_IMAGE_MIMES,
  REVIEW_VIDEO_MAX_BYTES,
  REVIEW_VIDEO_MIMES,
} from '../../modules/media/storage/storage-provider.interface';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

const REVIEW_ALLOWED = [...REVIEW_IMAGE_MIMES, ...REVIEW_VIDEO_MIMES];

@ApiTags('admin-review-media')
@Controller('admin/review-media')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermission('reviews:moderate')
@ApiBearerAuth('bearer')
export class AdminReviewMediaController {
  private readonly logger = new Logger(AdminReviewMediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly storageFactory: StorageProviderFactory,
  ) {}

  @Get('upload-params')
  getUploadParams(@Query('type') type?: string) {
    const provider = this.storageFactory.getRemoteProvider();
    if (!provider) {
      throw new BadRequestException(
        'No remote storage configured. Set CLOUDINARY_* or configure S3.',
      );
    }
    const folder: UploadFolder =
      type === 'video' ? 'review-videos' : 'review-photos';
    return ApiResponseDto.ok(provider.getSignedUploadParams(folder));
  }

  @Post('register')
  async register(@Body() dto: RegisterMediaDto) {
    try {
      const { id } = await this.mediaService.registerUpload(
        {
          provider: dto.provider,
          storageKey: dto.storageKey,
          deliveryUrl: dto.deliveryUrl,
          providerResponse: dto.providerResponse,
          filename: dto.filename,
          mimeType: dto.mimeType,
          bytes: dto.bytes,
        },
        'review',
      );
      return ApiResponseDto.ok({ id }, 'Review media registered');
    } catch (err) {
      this.logger.error(
        `Admin review media register failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      try {
        await this.mediaService.createFailedUpload({
          source: 'review',
          error: err as Error,
          filename: dto.filename,
        });
      } catch {
        // ignore
      }
      throw err;
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: REVIEW_VIDEO_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if ((REVIEW_ALLOWED as readonly string[]).includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              'Invalid file type. Use JPEG, PNG, WebP, GIF, MP4, WebM or MOV.',
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype: string; size: number }
      | undefined,
  ) {
    if (!file) {
      return ApiResponseDto.fail('No file provided');
    }
    const isVideo = file.mimetype.startsWith('video/');
    const max = isVideo ? REVIEW_VIDEO_MAX_BYTES : REVIEW_IMAGE_MAX_BYTES;
    if (file.size > max) {
      throw new BadRequestException(
        `File must be under ${Math.round(max / 1024 / 1024)}MB`,
      );
    }
    const { id } = await this.mediaService.createFromFileForReview({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    return ApiResponseDto.ok({ id }, 'Review media uploaded');
  }
}
