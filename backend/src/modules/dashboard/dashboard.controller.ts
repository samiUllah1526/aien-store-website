import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Query('days') days?: string) {
    const daysNum = days ? Math.min(90, Math.max(7, parseInt(days, 10) || 30)) : 30;
    const data = await this.dashboardService.getStats(daysNum);
    return ApiResponseDto.ok(data);
  }
}
