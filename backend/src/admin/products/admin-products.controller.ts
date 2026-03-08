import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from '../../modules/products/products.service';
import { CreateProductDto } from '../../modules/products/dto/create-product.dto';
import { UpdateProductDto } from '../../modules/products/dto/update-product.dto';
import { AdjustStockDto } from '../../modules/products/dto/adjust-stock.dto';
import { ProductQueryDto } from '../../modules/products/dto/product-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { InventoryService } from '../../modules/inventory/inventory.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-products')
@Controller('admin/products')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Post()
  @RequirePermission('products:write')
  async create(@Body() dto: CreateProductDto) {
    const data = await this.productsService.create(dto);
    return ApiResponseDto.ok(data, 'Product created');
  }

  @Get()
  @RequirePermission('products:read')
  async findAll(@Query() query: ProductQueryDto) {
    const { data, total } = await this.productsService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get('slug/:slug')
  @RequirePermission('products:read')
  async findBySlug(@Param('slug') slug: string) {
    const data = await this.productsService.findBySlug(slug);
    return ApiResponseDto.ok(data);
  }

  @Get(':id')
  @RequirePermission('products:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productsService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Patch(':id/stock')
  @RequirePermission('products:write')
  async adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @Req() req: { user?: { userId: string } },
  ) {
    await this.inventoryService.adjust(
      id,
      dto.quantityDelta,
      dto.reference ?? 'Admin adjustment',
      req.user?.userId,
    );
    const data = await this.productsService.findOne(id);
    return ApiResponseDto.ok(data, 'Stock updated');
  }

  @Put(':id')
  @RequirePermission('products:write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.productsService.update(id, dto);
    return ApiResponseDto.ok(data, 'Product updated');
  }

  @Delete(':id')
  @RequirePermission('products:write')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.remove(id);
    return ApiResponseDto.ok(null, 'Product deleted');
  }
}
