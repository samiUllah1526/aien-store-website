import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from '../../modules/categories/categories.service';
import { CreateCategoryDto } from '../../modules/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../../modules/categories/dto/update-category.dto';
import { CategoryProductIdsDto } from '../../modules/categories/dto/category-product-ids.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-categories')
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermission('categories:read')
@ApiBearerAuth('bearer')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    const data = await this.categoriesService.findAll(search);
    return ApiResponseDto.ok(data);
  }

  @Get('landing')
  async findLanding() {
    const data = await this.categoriesService.findLandingCategories();
    return ApiResponseDto.ok(data);
  }

  @Post(':id/products/attach')
  @RequirePermission('categories:write')
  async attachProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CategoryProductIdsDto,
  ) {
    const data = await this.categoriesService.attachProducts(id, dto.productIds);
    return ApiResponseDto.ok(data, 'Products attached to category');
  }

  @Post(':id/products/detach')
  @RequirePermission('categories:write')
  async detachProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CategoryProductIdsDto,
  ) {
    const data = await this.categoriesService.detachProducts(id, dto.productIds);
    return ApiResponseDto.ok(data, 'Products removed from category');
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.categoriesService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Post()
  @RequirePermission('categories:write')
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.categoriesService.create(dto);
    return ApiResponseDto.ok(data, 'Category created');
  }

  @Put(':id')
  @RequirePermission('categories:write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.update(id, dto);
    return ApiResponseDto.ok(data, 'Category updated');
  }

  @Delete(':id')
  @RequirePermission('categories:write')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoriesService.remove(id);
    return ApiResponseDto.ok(null, 'Category deleted');
  }
}
