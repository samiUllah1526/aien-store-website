import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmailLogsService } from '../../modules/email-logs/email-logs.service';
import { EmailLogQueryDto } from '../../modules/email-logs/dto/email-log-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-email-logs')
@Controller('admin/email-logs')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminEmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) {}

  @Get(':id')
  @RequirePermission('emaillogs:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.emailLogsService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Get()
  @RequirePermission('emaillogs:read')
  async findAll(@Query() query: EmailLogQueryDto) {
    const { data, total } = await this.emailLogsService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Post(':id/resend')
  @RequirePermission('emaillogs:resend')
  async resend(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.emailLogsService.resend(id);
    return ApiResponseDto.ok(result, result.message);
  }
}
