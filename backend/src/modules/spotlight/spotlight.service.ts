import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SpotlightMediaDto {
  id: string;
  url: string;
  mimeType: string;
  kind: 'image' | 'video';
}

export interface SpotlightItemDto {
  id: string;
  mediaId: string;
  caption: string | null;
  sortOrder: number;
  isActive: boolean;
  autoplay: boolean;
  createdAt: Date;
  updatedAt: Date;
  media: SpotlightMediaDto;
}

@Injectable()
export class SpotlightService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(limit = 24): Promise<SpotlightItemDto[]> {
    const take = Math.min(40, Math.max(1, limit));
    const rows = await this.prisma.customerSpotlightItem.findMany({
      where: { isActive: true },
      include: {
        media: {
          select: {
            id: true,
            path: true,
            deliveryUrl: true,
            mimeType: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take,
    });
    return rows.map((r) => this.toDto(r));
  }

  async listAdmin(): Promise<SpotlightItemDto[]> {
    const rows = await this.prisma.customerSpotlightItem.findMany({
      include: {
        media: {
          select: {
            id: true,
            path: true,
            deliveryUrl: true,
            mimeType: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(input: {
    mediaId: string;
    caption?: string;
    sortOrder?: number;
    isActive?: boolean;
    autoplay?: boolean;
  }): Promise<SpotlightItemDto> {
    await this.ensureMedia(input.mediaId);
    const maxSort = await this.prisma.customerSpotlightItem.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder =
      typeof input.sortOrder === 'number'
        ? input.sortOrder
        : (maxSort._max.sortOrder ?? -1) + 1;

    const row = await this.prisma.customerSpotlightItem.create({
      data: {
        mediaId: input.mediaId,
        caption: input.caption?.trim() || null,
        sortOrder,
        isActive: input.isActive ?? true,
        autoplay: input.autoplay ?? true,
      },
      include: {
        media: {
          select: {
            id: true,
            path: true,
            deliveryUrl: true,
            mimeType: true,
          },
        },
      },
    });
    return this.toDto(row);
  }

  async update(
    id: string,
    input: {
      caption?: string | null;
      sortOrder?: number;
      isActive?: boolean;
      autoplay?: boolean;
    },
  ): Promise<SpotlightItemDto> {
    await this.ensureExists(id);
    const data: Prisma.CustomerSpotlightItemUpdateInput = {};
    if (input.caption !== undefined) {
      data.caption =
        typeof input.caption === 'string'
          ? input.caption.trim() || null
          : null;
    }
    if (typeof input.sortOrder === 'number') data.sortOrder = input.sortOrder;
    if (typeof input.isActive === 'boolean') data.isActive = input.isActive;
    if (typeof input.autoplay === 'boolean') data.autoplay = input.autoplay;

    const row = await this.prisma.customerSpotlightItem.update({
      where: { id },
      data,
      include: {
        media: {
          select: {
            id: true,
            path: true,
            deliveryUrl: true,
            mimeType: true,
          },
        },
      },
    });
    return this.toDto(row);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.customerSpotlightItem.delete({ where: { id } });
  }

  async reorder(orderedIds: string[]): Promise<SpotlightItemDto[]> {
    if (!orderedIds.length) return this.listAdmin();
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.customerSpotlightItem.updateMany({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.listAdmin();
  }

  private async ensureExists(id: string): Promise<void> {
    const row = await this.prisma.customerSpotlightItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException(`Spotlight item ${id} not found`);
  }

  private async ensureMedia(mediaId: string): Promise<void> {
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        uploadError: { equals: Prisma.DbNull },
      },
      select: { id: true },
    });
    if (!media) {
      throw new BadRequestException('Spotlight media not found or failed upload.');
    }
  }

  private toDto(row: {
    id: string;
    mediaId: string;
    caption: string | null;
    sortOrder: number;
    isActive: boolean;
    autoplay: boolean;
    createdAt: Date;
    updatedAt: Date;
    media: {
      id: string;
      path: string;
      deliveryUrl: string | null;
      mimeType: string;
    };
  }): SpotlightItemDto {
    const url = row.media.deliveryUrl
      ? row.media.deliveryUrl
      : row.media.path.startsWith('http')
        ? row.media.path
        : `/media/file/${row.media.path}`;
    return {
      id: row.id,
      mediaId: row.mediaId,
      caption: row.caption,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      autoplay: row.autoplay,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      media: {
        id: row.media.id,
        url,
        mimeType: row.media.mimeType,
        kind: row.media.mimeType.startsWith('video/') ? 'video' : 'image',
      },
    };
  }
}
