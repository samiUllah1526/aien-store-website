import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesCampaignsService } from '../../modules/sales-campaigns/sales-campaigns.service';
import { CreateSalesCampaignDto } from '../../modules/sales-campaigns/dto/create-sales-campaign.dto';
import { UpdateSalesCampaignDto } from '../../modules/sales-campaigns/dto/update-sales-campaign.dto';
import { SalesCampaignQueryDto } from '../../modules/sales-campaigns/dto/sales-campaign-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-sales-campaigns')
@Controller('admin/sales-campaigns')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminSalesCampaignsController {
  constructor(
    private readonly salesCampaignsService: SalesCampaignsService,
  ) {}

  @Post()
  @RequirePermission('sales-campaigns:write')
  async create(
    @Body() dto: CreateSalesCampaignDto,
    @Req() req: { user?: { userId: string } },
  ) {
    const data = await this.salesCampaignsService.create(
      dto,
      req.user?.userId,
    );
    return ApiResponseDto.ok(data, 'Campaign created');
  }

  @Get()
  @RequirePermission('sales-campaigns:read')
  async findAll(@Query() query: SalesCampaignQueryDto) {
    const { data, total } = await this.salesCampaignsService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get(':id')
  @RequirePermission('sales-campaigns:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.salesCampaignsService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Patch(':id')
  @RequirePermission('sales-campaigns:write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesCampaignDto,
  ) {
    const data = await this.salesCampaignsService.update(id, dto);
    return ApiResponseDto.ok(data, 'Campaign updated');
  }

  @Post(':id/publish')
  @RequirePermission('sales-campaigns:write')
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.salesCampaignsService.publish(id);
    return ApiResponseDto.ok(data, 'Campaign published');
  }

  @Post(':id/pause')
  @RequirePermission('sales-campaigns:write')
  async pause(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.salesCampaignsService.pause(id);
    return ApiResponseDto.ok(data, 'Campaign paused');
  }

  @Post(':id/resume')
  @RequirePermission('sales-campaigns:write')
  async resume(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.salesCampaignsService.resume(id);
    return ApiResponseDto.ok(data, 'Campaign resumed');
  }

  @Post(':id/duplicate')
  @RequirePermission('sales-campaigns:write')
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user?: { userId: string } },
  ) {
    const data = await this.salesCampaignsService.duplicate(
      id,
      req.user?.userId,
    );
    return ApiResponseDto.ok(data, 'Campaign duplicated');
  }

  @Delete(':id')
  @RequirePermission('sales-campaigns:write')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.salesCampaignsService.softDelete(id);
    return ApiResponseDto.ok(null, 'Campaign deleted');
  }
}
