import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async add(userId: string, productId: string): Promise<{ added: boolean }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    await this.prisma.userFavorite.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: { userId, productId },
      update: {},
    });
    return { added: true };
  }

  async remove(userId: string, productId: string): Promise<{ removed: boolean }> {
    const deleted = await this.prisma.userFavorite.deleteMany({
      where: { userId, productId },
    });
    return { removed: deleted.count > 0 };
  }

  async getProductIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.userFavorite.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => r.productId);
  }

  /** Returns full product DTOs for the user's favorites (storefront). */
  async getFavoriteProducts(userId: string) {
    const productIds = await this.getProductIds(userId);
    if (productIds.length === 0) return [];
    return this.productsService.findByIds(productIds);
  }

  async isFavorite(userId: string, productId: string): Promise<boolean> {
    const fav = await this.prisma.userFavorite.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { productId: true },
    });
    return !!fav;
  }
}
