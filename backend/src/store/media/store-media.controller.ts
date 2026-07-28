import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { MediaService } from '../../modules/media/media.service';
import { StorageProviderFactory } from '../../modules/media/storage/storage-provider.factory';
import { RegisterMediaDto } from '../../modules/media/dto/register-media.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import type { UploadFolder } from '../../modules/media/storage/storage-provider.interface';
import {
  REVIEW_IMAGE_MAX_BYTES,
  REVIEW_IMAGE_MIMES,
  REVIEW_VIDEO_MAX_BYTES,
  REVIEW_VIDEO_MIMES,
} from '../../modules/media/storage/storage-provider.interface';

const PAYMENT_MAX_SIZE = 5 * 1024 * 1024;
const PAYMENT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const REVIEW_LEGACY_MAX = REVIEW_VIDEO_MAX_BYTES;
const REVIEW_ALLOWED = [...REVIEW_IMAGE_MIMES, ...REVIEW_VIDEO_MIMES];

@ApiTags('store-media')
@Controller('store/media')
export class StoreMediaController {
  private readonly logger = new Logger(StoreMediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly storageFactory: StorageProviderFactory,
  ) {}

  @Public()
  @Get('upload-params-payment-proof')
  @ApiOperation({
    summary: 'Get payment proof upload params (public)',
    security: [],
  })
  getUploadParamsPaymentProof() {
    const provider = this.storageFactory.getRemoteProvider();
    if (!provider) {
      throw new BadRequestException(
        'No remote storage configured. Set CLOUDINARY_* or configure S3.',
      );
    }
    const params = provider.getSignedUploadParams('payment-proofs');
    return ApiResponseDto.ok(params);
  }

  @Public()
  @Post('register-payment-proof')
  @ApiOperation({
    summary: 'Register payment proof upload (public)',
    security: [],
  })
  async registerPaymentProof(@Body() dto: RegisterMediaDto) {
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
        'payment_proof',
      );
      return ApiResponseDto.ok({ id }, 'Payment proof registered');
    } catch (err) {
      this.logger.error(
        `Payment proof register failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      try {
        await this.mediaService.createFailedUpload({
          source: 'payment_proof',
          error: err as Error,
          filename: dto.filename,
          orderId: dto.orderId,
        });
      } catch {
        // ignore
      }
      throw err;
    }
  }

  @Public()
  @Post('upload-payment-proof')
  @ApiOperation({ summary: 'Upload payment proof (public)', security: [] })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: PAYMENT_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (PAYMENT_MIMES.includes(file.mimetype)) cb(null, true);
        else
          cb(
            new Error('Invalid file type. Use JPEG, PNG, WebP or GIF.'),
            false,
          );
      },
    }),
  )
  async uploadPaymentProof(
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype: string; size: number }
      | undefined,
    @Body('orderId') orderId?: string,
  ) {
    if (!file) {
      try {
        await this.mediaService.createFailedUpload({
          source: 'payment_proof',
          error: new Error('No file provided'),
          orderId,
        });
      } catch {
        // ignore
      }
      return ApiResponseDto.fail('No file provided');
    }
    try {
      const { id } = await this.mediaService.createFromFileForPaymentProof({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      return ApiResponseDto.ok({ id }, 'Payment proof uploaded');
    } catch (err) {
      try {
        await this.mediaService.createFailedUpload({
          source: 'payment_proof',
          error: err as Error,
          filename: file.originalname,
          orderId,
        });
      } catch {
        // ignore
      }
      throw err;
    }
  }

  /**
   * Signed Cloudinary params for review media.
   * Query: type=image|video (default image).
   */
  @Get('upload-params-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get review media upload params (auth required)' })
  getUploadParamsReview(@Query('type') type?: string) {
    const provider = this.storageFactory.getRemoteProvider();
    if (!provider) {
      throw new BadRequestException(
        'No remote storage configured. Set CLOUDINARY_* or configure S3.',
      );
    }
    const folder: UploadFolder =
      type === 'video' ? 'review-videos' : 'review-photos';
    const params = provider.getSignedUploadParams(folder);
    return ApiResponseDto.ok(params);
  }

  @Post('register-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Register review media upload (auth required)' })
  async registerReview(@Body() dto: RegisterMediaDto) {
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
        `Review media register failed: ${err instanceof Error ? err.message : String(err)}`,
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

  @Post('upload-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Upload review media via server (auth; legacy fallback)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: REVIEW_LEGACY_MAX },
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
  async uploadReview(
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype: string; size: number }
      | undefined,
  ) {
    if (!file) {
      try {
        await this.mediaService.createFailedUpload({
          source: 'review',
          error: new Error('No file provided'),
        });
      } catch {
        // ignore
      }
      return ApiResponseDto.fail('No file provided');
    }
    const isVideo = file.mimetype.startsWith('video/');
    const max = isVideo ? REVIEW_VIDEO_MAX_BYTES : REVIEW_IMAGE_MAX_BYTES;
    if (file.size > max) {
      throw new BadRequestException(
        `File must be under ${Math.round(max / 1024 / 1024)}MB`,
      );
    }
    try {
      const { id } = await this.mediaService.createFromFileForReview({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      return ApiResponseDto.ok({ id }, 'Review media uploaded');
    } catch (err) {
      try {
        await this.mediaService.createFailedUpload({
          source: 'review',
          error: err as Error,
          filename: file.originalname,
        });
      } catch {
        // ignore
      }
      throw err;
    }
  }

  @Public()
  @Get('file/:folder/:filename')
  @ApiOperation({ summary: 'Serve local file (public)', security: [] })
  async serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const relativePath = `${folder}/${filename}`;
    const fullPath = this.mediaService.getFilePath(relativePath);
    if (!existsSync(fullPath)) {
      return res.status(404).send('Not found');
    }
    const ext = filename.split('.').pop()?.toLowerCase();
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : ext === 'gif'
              ? 'image/gif'
              : ext === 'mp4'
                ? 'video/mp4'
                : ext === 'webm'
                  ? 'video/webm'
                  : ext === 'mov'
                    ? 'video/quicktime'
                    : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    const stream = createReadStream(fullPath);
    stream.pipe(res);
  }
}
