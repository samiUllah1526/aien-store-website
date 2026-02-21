import { Controller, Get, Post, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { EmailLogsService } from './email-logs.service';
import { EmailLogQueryDto } from './dto/email-log-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('email-logs')
export class EmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('emaillogs:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.emailLogsService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('emaillogs:read')
  async findAll(@Query() query: EmailLogQueryDto) {
    const { data, total } = await this.emailLogsService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('emaillogs:resend')
  async resend(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.emailLogsService.resend(id);
    return ApiResponseDto.ok(result, result.message);
  }
}
