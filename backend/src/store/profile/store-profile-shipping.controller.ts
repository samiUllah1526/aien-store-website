import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from '../../modules/profile/profile.service';
import { SaveShippingDto } from '../../modules/profile/dto/save-shipping.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@ApiTags('store-profile')
@Controller('store/profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class StoreProfileShippingController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('shipping')
  async getShipping(@Req() req: { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.profileService.getSavedShipping(userId);
    return ApiResponseDto.ok(data);
  }

  @Put('shipping')
  async saveShipping(@Req() req: { user?: { userId: string } }, @Body() dto: SaveShippingDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.profileService.saveShipping(userId, dto);
    return ApiResponseDto.ok(data, 'Shipping information saved');
  }
}
