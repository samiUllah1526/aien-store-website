import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from '../../modules/products/products.service';
import { ProductQueryDto } from '../../modules/products/dto/product-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('store-products')
@Controller('store/products')
export class StoreProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products (public)', security: [] })
  async findAll(@Query() query: ProductQueryDto) {
    const { data, total } = await this.productsService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug (public)', security: [] })
  async findBySlug(@Param('slug') slug: string) {
    const data = await this.productsService.findBySlug(slug);
    return ApiResponseDto.ok(data);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (public)', security: [] })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productsService.findOne(id);
    return ApiResponseDto.ok(data);
  }
}
