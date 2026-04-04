import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';
import { GithubActionsService } from '../../modules/github/github-actions.service';
import { DeployMainWebsiteDto } from './dto/deploy-main-website.dto';

@ApiTags('admin-deploy')
@Controller('admin/deploy')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminDeployController {
  constructor(private readonly githubActions: GithubActionsService) {}

  @Post('main-website')
  @RequirePermission('deploy:website')
  async deployMainWebsite(@Body() dto: DeployMainWebsiteDto) {
    const data = await this.githubActions.dispatchMainWebsiteWorkflow(
      dto.reason,
    );
    return ApiResponseDto.ok(
      data,
      'Main website rebuild queued in GitHub Actions.',
    );
  }
}
