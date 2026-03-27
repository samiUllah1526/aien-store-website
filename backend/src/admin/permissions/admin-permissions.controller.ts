import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { RolesService } from '../../modules/roles/roles.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-permissions')
@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermission('admin:access')
@ApiBearerAuth('bearer')
export class AdminPermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async list() {
    const data = await this.rolesService.listPermissions();
    return ApiResponseDto.ok(data);
  }
}
