import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JobsAdminService } from '../../modules/jobs/jobs-admin.service';
import { JobsQueryDto } from '../../modules/jobs/dto/jobs-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-jobs')
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminJobsController {
  constructor(private readonly jobsAdmin: JobsAdminService) {}

  @Get('queues')
  @RequirePermission('jobs:read')
  async getQueues() {
    const data = await this.jobsAdmin.getQueueStats();
    return ApiResponseDto.ok(data);
  }

  @Get()
  @RequirePermission('jobs:read')
  async findJobs(@Query() query: JobsQueryDto) {
    const { data, total } = await this.jobsAdmin.findJobs({
      queue: query.queue,
      state: query.state,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
    });
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Post(':queue/:id/retry')
  @RequirePermission('jobs:retry')
  async retry(@Param('queue') queue: string, @Param('id') id: string) {
    const result = await this.jobsAdmin.retryJob(queue, id);
    return ApiResponseDto.ok(result, result.message);
  }

  @Post(':queue/:id/cancel')
  @RequirePermission('jobs:cancel')
  async cancel(@Param('queue') queue: string, @Param('id') id: string) {
    const result = await this.jobsAdmin.cancelJob(queue, id);
    return ApiResponseDto.ok(result, result.message);
  }
}
