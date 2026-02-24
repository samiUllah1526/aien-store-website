import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JobsAdminService } from './jobs-admin.service';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('jobs')
@Controller('jobs')
export class JobsAdminController {
  constructor(private readonly jobsAdmin: JobsAdminService) {}

  @Get('queues')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:read')
  @ApiBearerAuth('bearer')
  async getQueues() {
    const data = await this.jobsAdmin.getQueueStats();
    return ApiResponseDto.ok(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:read')
  @ApiBearerAuth('bearer')
  async findJobs(@Query() query: JobsQueryDto) {
    const { data, total } = await this.jobsAdmin.findJobs({
      queue: query.queue,
      state: query.state,
      page: query.page,
      limit: query.limit,
    });
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Post(':queue/:id/retry')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:retry')
  @ApiBearerAuth('bearer')
  async retry(@Param('queue') queue: string, @Param('id') id: string) {
    const result = await this.jobsAdmin.retryJob(queue, id);
    return ApiResponseDto.ok(result, result.message);
  }

  @Post(':queue/:id/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:cancel')
  @ApiBearerAuth('bearer')
  async cancel(@Param('queue') queue: string, @Param('id') id: string) {
    const result = await this.jobsAdmin.cancelJob(queue, id);
    return ApiResponseDto.ok(result, result.message);
  }
}
