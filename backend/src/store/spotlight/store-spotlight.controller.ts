import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SpotlightService } from '../../modules/spotlight/spotlight.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('store-spotlight')
@Controller('store/spotlight')
export class StoreSpotlightController {
  constructor(private readonly spotlightService: SpotlightService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Active Customer Spotlight items for the homepage carousel',
    security: [],
  })
  async list(@Query('limit') limit?: string) {
    const limitNum = Math.min(40, Math.max(1, Number(limit) || 24));
    const data = await this.spotlightService.listPublic(limitNum);
    return ApiResponseDto.ok(data);
  }
}
