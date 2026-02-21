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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { InventoryService } from '../inventory/inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
  @ApiBearerAuth('bearer')
  async create(@Body() dto: CreateProductDto) {
    const data = await this.productsService.create(dto);
    return ApiResponseDto.ok(data, 'Product created');
  }

  @Get()
  @ApiOperation({ summary: 'List products (public)', security: [] })
  async findAll(@Query() query: ProductQueryDto) {
    const { data, total } = await this.productsService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug (public)', security: [] })
  async findBySlug(@Param('slug') slug: string) {
    const data = await this.productsService.findBySlug(slug);
    return ApiResponseDto.ok(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (public)', security: [] })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productsService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
  @ApiBearerAuth('bearer')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
  @ApiBearerAuth('bearer')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.productsService.update(id, dto);
    return ApiResponseDto.ok(data, 'Product updated');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('products:write')
  @ApiBearerAuth('bearer')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.remove(id);
    return ApiResponseDto.ok(null, 'Product deleted');
  }
}
