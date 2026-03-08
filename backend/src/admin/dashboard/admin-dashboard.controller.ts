import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from '../../modules/dashboard/dashboard.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermission('admin:access')
@ApiBearerAuth('bearer')
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Query('days') days?: string) {
    const daysNum = days ? Math.min(90, Math.max(7, parseInt(days, 10) || 30)) : 30;
    const data = await this.dashboardService.getStats(daysNum);
    return ApiResponseDto.ok(data);
  }
}
