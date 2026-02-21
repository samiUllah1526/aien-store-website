import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { MovementsQueryDto } from './dto/movements-query.dto';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Paginated audit log of inventory movements for a product.
   * Use GET /products with stockFilter & sortBy=stockQuantity for the inventory list.
   */
  @Get('products/:productId/movements')
  @RequirePermission('products:read')
  @ApiBearerAuth('bearer')
  async getMovements(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: MovementsQueryDto,
  ) {
    const { data, total } = await this.inventoryService.getMovements(productId, {
      page: query.page,
      limit: query.limit,
    });
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }
}
