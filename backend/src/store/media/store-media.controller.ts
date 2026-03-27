import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, Res, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { MediaService } from '../../modules/media/media.service';
import { StorageProviderFactory } from '../../modules/media/storage/storage-provider.factory';
import { RegisterMediaDto } from '../../modules/media/dto/register-media.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
  @ApiOperation({ summary: 'Get payment proof upload params (public)', security: [] })
  getUploadParamsPaymentProof() {
    const provider = this.storageFactory.getRemoteProvider();
    if (!provider) {
      throw new BadRequestException('No remote storage configured. Set CLOUDINARY_* or configure S3.');
    }
    const params = provider.getSignedUploadParams('payment-proofs');
    return ApiResponseDto.ok(params);
  }

  @Public()
  @Post('register-payment-proof')
  @ApiOperation({ summary: 'Register payment proof upload (public)', security: [] })
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
      this.logger.error(`Payment proof register failed: ${err instanceof Error ? err.message : String(err)}`);
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
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type. Use JPEG, PNG, WebP or GIF.'), false);
      },
    }),
  )
  async uploadPaymentProof(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined,
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
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    const stream = createReadStream(fullPath);
    stream.pipe(res);
  }
}
