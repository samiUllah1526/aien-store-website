import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import type {
  RegisterUploadPayload,
  StorageProviderType,
} from './storage/storage-provider.interface';
import { StorageProviderFactory } from './storage/storage-provider.factory';

export interface RegisterMediaInput {
  provider: string;
  storageKey?: string;
  deliveryUrl?: string;
  providerResponse?: Record<string, unknown>;
  filename?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

/** Sanitize filename: remove path separators, control chars, limit length. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?:*"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 200) || 'file';
}

@Injectable()
export class MediaService {
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageFactory: StorageProviderFactory,
    private readonly config: ConfigService,
  ) {
    this.uploadDir =
      this.config.get<string>('storage.uploadDir') ?? join(process.cwd(), 'uploads');
  }

  /**
   * Register a remote upload in the database. Accepts either normalized fields
   * or providerResponse; parses providerResponse when needed.
   */
  async registerUpload(
    input: RegisterMediaInput,
    source: 'product' | 'payment_proof',
  ): Promise<{ id: string }> {
    let payload: RegisterUploadPayload;
    if (input.storageKey && input.deliveryUrl) {
      payload = {
        provider: input.provider as StorageProviderType,
        storageKey: input.storageKey,
        deliveryUrl: input.deliveryUrl,
        filename: input.filename,
        mimeType: input.mimeType,
        bytes: input.bytes,
        width: input.width,
        height: input.height,
      };
    } else if (input.providerResponse) {
      const provider = this.storageFactory.getByType(input.provider as StorageProviderType);
      if (!provider) {
        throw new BadRequestException(`Unknown storage provider: ${input.provider}`);
      }
      const parsed = provider.parseUploadResponse(input.providerResponse);
      if (!parsed) {
        throw new BadRequestException('Invalid provider response');
      }
      payload = {
        ...parsed,
        filename: input.filename ?? parsed.filename,
        mimeType: input.mimeType ?? parsed.mimeType,
      };
    } else {
      throw new BadRequestException('Provide storageKey/deliveryUrl or providerResponse');
    }

    const filename = payload.filename
      ? sanitizeFilename(payload.filename)
      : `${payload.storageKey.split('/').pop() || 'file'}.${payload.deliveryUrl.split('.').pop()?.split('?')[0] || 'jpg'}`;
    const mimeType = payload.mimeType || 'image/jpeg';
    const sizeBytes = payload.bytes ?? 0;

    const media = await this.prisma.media.create({
      data: {
        filename,
        mimeType,
        sizeBytes,
        path: payload.storageKey,
        storageProvider: payload.provider,
        storageKey: payload.storageKey,
        deliveryUrl: payload.deliveryUrl,
        source,
      },
    });
    return { id: media.id };
  }

  async createFromFile(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<{ id: string }> {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const relativePath = `products/${filename}`;
    const fullPath = join(this.uploadDir, relativePath);
    await mkdir(join(this.uploadDir, 'products'), { recursive: true });
    await writeFile(fullPath, file.buffer);
    const media = await this.prisma.media.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        path: relativePath,
        storageProvider: 'local',
        source: 'product',
      },
    });
    return { id: media.id };
  }

  /** Store payment proof image for checkout (public upload). Path: payment-proofs/uuid.ext */
  async createFromFileForPaymentProof(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<{ id: string }> {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const relativePath = `payment-proofs/${filename}`;
    const fullPath = join(this.uploadDir, relativePath);
    await mkdir(join(this.uploadDir, 'payment-proofs'), { recursive: true });
    await writeFile(fullPath, file.buffer);
    const media = await this.prisma.media.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        path: relativePath,
        storageProvider: 'local',
        source: 'payment_proof',
      },
    });
    return { id: media.id };
  }

  async getById(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new BadRequestException('Media not found');
    }
    return media;
  }

  getFilePath(relativePath: string): string {
    return join(this.uploadDir, relativePath);
  }
}
