import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { MediaService } from './media.service';
import { StorageProviderFactory } from './storage/storage-provider.factory';
import type { UploadFolder } from './storage/storage-provider.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RegisterMediaDto } from './dto/register-media.dto';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly storageFactory: StorageProviderFactory,
  ) {}

  /** @deprecated Use GET /media/upload-params */
  @Get('cloudinary/signed-params')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
  getSignedUploadParamsLegacy(@Query('folder') folder?: string) {
    return this.getUploadParams(folder);
  }

  /** Get signed upload params (provider-agnostic). Admin product images. */
  @Get('upload-params')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
  getUploadParams(@Query('folder') folder?: string) {
    const provider = this.storageFactory.getRemoteProvider();
    if (!provider) {
      this.logger.warn(
        'No remote storage provider configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env',
      );
      throw new BadRequestException(
        'No remote storage configured. Set CLOUDINARY_* or configure S3.',
      );
    }
    const f = (folder === 'payment-proofs' ? 'payment-proofs' : 'products') as UploadFolder;
    const params = provider.getSignedUploadParams(f);
    return ApiResponseDto.ok(params);
  }

  /** @deprecated Use POST /media/register with provider-agnostic payload */
  @Post('cloudinary/register')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
  async registerLegacy(@Body() body: { publicId?: string; secureUrl?: string; filename?: string; mimeType?: string; bytes?: number }) {
    return this.register({
      provider: 'cloudinary',
      storageKey: body.publicId,
      deliveryUrl: body.secureUrl,
      filename: body.filename,
      mimeType: body.mimeType,
      bytes: body.bytes,
      providerResponse: body.publicId && body.secureUrl ? { public_id: body.publicId, secure_url: body.secureUrl } : undefined,
    });
  }

  /** Register upload after frontend completes direct upload. Admin products. */
  @Post('register')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
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
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  /** @deprecated Use GET /media/upload-params-payment-proof */
  @Public()
  @Get('cloudinary/signed-params-payment-proof')
  getUploadParamsPaymentProofLegacy() {
    return this.getUploadParamsPaymentProof();
  }

  /** Get signed params for payment proof (public). */
  @Public()
  @Get('upload-params-payment-proof')
  getUploadParamsPaymentProof() {
    const provider = this.storageFactory.getRemoteProvider();
    if (!provider) {
      this.logger.warn(
        'No remote storage provider configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env',
      );
      throw new BadRequestException(
        'No remote storage configured. Set CLOUDINARY_* or configure S3.',
      );
    }
    const params = provider.getSignedUploadParams('payment-proofs');
    return ApiResponseDto.ok(params);
  }

  /** @deprecated Use POST /media/register-payment-proof */
  @Public()
  @Post('cloudinary/register-payment-proof')
  async registerPaymentProofLegacy(@Body() body: { publicId?: string; secureUrl?: string; filename?: string; mimeType?: string; bytes?: number }) {
    return this.registerPaymentProof({
      provider: 'cloudinary',
      storageKey: body.publicId,
      deliveryUrl: body.secureUrl,
      filename: body.filename,
      mimeType: body.mimeType,
      bytes: body.bytes,
      providerResponse: body.publicId && body.secureUrl ? { public_id: body.publicId, secure_url: body.secureUrl } : undefined,
    });
  }

  /** Register payment proof upload (public). */
  @Public()
  @Post('register-payment-proof')
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
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      },
    }),
  )
  async upload(@UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined) {
    if (!file) {
      this.logger.warn('File upload failed: no file provided');
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
      this.logger.error(
        `File upload failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  /** Public: upload payment proof (legacy server upload when no remote storage). */
  @Public()
  @Post('upload-payment-proof')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Use JPEG, PNG, WebP or GIF.'), false);
        }
      },
    }),
  )
  async uploadPaymentProof(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined,
  ) {
    if (!file) {
      this.logger.warn('Payment proof upload failed: no file provided');
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
      this.logger.error(
        `Payment proof upload failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  @Public()
  @Get('file/:folder/:filename')
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
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    const stream = createReadStream(fullPath);
    stream.pipe(res);
  }
}
