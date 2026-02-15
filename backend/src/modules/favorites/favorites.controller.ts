import { Controller, Get, Post, Delete, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Req } from '@nestjs/common';

interface RequestWithUser {
  user?: { userId: string };
}

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const products = await this.favoritesService.getFavoriteProducts(userId);
    return ApiResponseDto.ok(products);
  }

  @Get('ids')
  async getIds(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const ids = await this.favoritesService.getProductIds(userId);
    return ApiResponseDto.ok(ids);
  }

  @Post(':productId')
  async add(@Req() req: RequestWithUser, @Param('productId', ParseUUIDPipe) productId: string) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const result = await this.favoritesService.add(userId, productId);
    return ApiResponseDto.ok(result, 'Added to favorites');
  }

  @Delete(':productId')
  async remove(@Req() req: RequestWithUser, @Param('productId', ParseUUIDPipe) productId: string) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const result = await this.favoritesService.remove(userId, productId);
    return ApiResponseDto.ok(result, 'Removed from favorites');
  }
}
