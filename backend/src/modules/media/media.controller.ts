import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

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
      return ApiResponseDto.fail('No file provided');
    }
    const { id } = await this.mediaService.createFromFile({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    return ApiResponseDto.ok({ id }, 'File uploaded');
  }

  @Public()
  @Get('file/:path')
  async serveFile(
    @Param('path') path: string,
    @Res() res: Response,
  ) {
    const fullPath = this.mediaService.getFilePath(path);
    if (!existsSync(fullPath)) {
      return res.status(404).send('Not found');
    }
    const stream = createReadStream(fullPath);
    stream.pipe(res);
  }
}
