import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from '../../modules/categories/categories.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('store-categories')
@Controller('store/categories')
export class StoreCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List categories (public)', security: [] })
  async findAll(@Query('search') search?: string) {
    const data = await this.categoriesService.findAll(search);
    return ApiResponseDto.ok(data);
  }

  @Public()
  @Get('landing')
  @ApiOperation({ summary: 'Landing categories (public)', security: [] })
  async findLanding() {
    const data = await this.categoriesService.findLandingCategories();
    return ApiResponseDto.ok(data);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID (public)', security: [] })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.categoriesService.findOne(id);
    return ApiResponseDto.ok(data);
  }
}
