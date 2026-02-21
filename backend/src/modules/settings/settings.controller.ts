import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { SettingsService, type PublicSettingsDto } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  async getPublic(): Promise<ApiResponseDto<PublicSettingsDto>> {
    const data = await this.settingsService.getPublic();
    return ApiResponseDto.ok(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings:read')
  async getAll() {
    const data = await this.settingsService.getAll();
    return ApiResponseDto.ok(data);
  }

  @Put()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings:write')
  async update(@Body() dto: UpdateSettingDto) {
    await this.settingsService.set(dto.key, dto.value);
    return ApiResponseDto.ok({ key: dto.key }, 'Settings updated');
  }
}
