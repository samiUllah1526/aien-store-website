import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from '../../modules/inventory/inventory.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';
import { MovementsQueryDto } from '../../modules/inventory/dto/movements-query.dto';

@ApiTags('admin-inventory')
@Controller('admin/inventory')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermission('inventory:read')
@ApiBearerAuth('bearer')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products/:productId/movements')
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
