import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService {
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
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
