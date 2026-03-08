import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { SettingsService } from '../../modules/settings/settings.service';
import { UpdateSettingDto } from '../../modules/settings/dto/update-setting.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('settings:read')
  async getAll() {
    const data = await this.settingsService.getAll();
    return ApiResponseDto.ok(data);
  }

  @Put()
  @RequirePermission('settings:write')
  async update(@Body() dto: UpdateSettingDto) {
    await this.settingsService.set(dto.key, dto.value);
    return ApiResponseDto.ok({ key: dto.key }, 'Settings updated');
  }
}
