import { Controller, Get, Post, Delete, Param, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from '../../modules/favorites/favorites.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@ApiTags('store-favorites')
@Controller('store/favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class StoreFavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async list(@Req() req: { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const products = await this.favoritesService.getFavoriteProducts(userId);
    return ApiResponseDto.ok(products);
  }

  @Get('ids')
  async getIds(@Req() req: { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.favoritesService.getProductIds(userId);
    return ApiResponseDto.ok(data);
  }

  @Post(':productId')
  async add(@Req() req: { user?: { userId: string } }, @Param('productId', ParseUUIDPipe) productId: string) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.favoritesService.add(userId, productId);
    return ApiResponseDto.ok(data, 'Added to favorites');
  }

  @Delete(':productId')
  async remove(@Req() req: { user?: { userId: string } }, @Param('productId', ParseUUIDPipe) productId: string) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    await this.favoritesService.remove(userId, productId);
    return ApiResponseDto.ok(null, 'Removed from favorites');
  }
}
