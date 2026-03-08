import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { SettingsService, type PublicSettingsDto } from '../../modules/settings/settings.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('store-settings')
@Controller('store/settings')
export class StoreSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public settings (public)', security: [] })
  async getPublic(): Promise<ApiResponseDto<PublicSettingsDto>> {
    const data = await this.settingsService.getPublic();
    return ApiResponseDto.ok(data);
  }
}
