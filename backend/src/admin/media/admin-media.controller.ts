import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { MediaService } from '../../modules/media/media.service';
import { StorageProviderFactory } from '../../modules/media/storage/storage-provider.factory';
import type { UploadFolder } from '../../modules/media/storage/storage-provider.interface';
import { RegisterMediaDto } from '../../modules/media/dto/register-media.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@ApiTags('admin-media')
@Controller('admin/media')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermission('products:write')
@ApiBearerAuth('bearer')
export class AdminMediaController {
  private readonly logger = new Logger(AdminMediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly storageFactory: StorageProviderFactory,
  ) {}

  @Get('upload-params')
  getUploadParams(@Query('folder') folder?: string) {
    const provider = this.storageFactory.getRemoteProvider();
    if (!provider) {
      throw new BadRequestException(
        'No remote storage configured. Set CLOUDINARY_* or configure S3.',
      );
    }
    const f = (
      folder === 'payment-proofs' ? 'payment-proofs' : 'products'
    ) as UploadFolder;
    const params = provider.getSignedUploadParams(f);
    return ApiResponseDto.ok(params);
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
          width: dto.width,
          height: dto.height,
        },
        'product',
      );
      return ApiResponseDto.ok({ id }, 'Media registered');
    } catch (err) {
      this.logger.error(
        `Media register failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      try {
        await this.mediaService.createFailedUpload({
          source: 'product',
          error: err as Error,
          filename: dto.filename,
          productId: dto.productId,
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
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type'), false);
      },
    }),
  )
  async upload(
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype: string; size: number }
      | undefined,
    @Body('productId') productId?: string,
  ) {
    if (!file) {
      try {
        await this.mediaService.createFailedUpload({
          source: 'product',
          error: new Error('No file provided'),
          productId,
        });
      } catch {
        // ignore
      }
      return ApiResponseDto.fail('No file provided');
    }
    try {
      const { id } = await this.mediaService.createFromFile({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      return ApiResponseDto.ok({ id }, 'File uploaded');
    } catch (err) {
      try {
        await this.mediaService.createFailedUpload({
          source: 'product',
          error: err as Error,
          filename: file.originalname,
          productId,
        });
      } catch {
        // ignore
      }
      throw err;
    }
  }
}
