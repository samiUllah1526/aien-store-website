import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { SaveShippingDto } from './dto/save-shipping.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Req } from '@nestjs/common';

interface RequestWithUser {
  user?: { userId: string };
}

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiBearerAuth('bearer')
  @Get('shipping')
  async getShipping(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.profileService.getSavedShipping(userId);
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth('bearer')
  @Put('shipping')
  async saveShipping(@Req() req: RequestWithUser, @Body() dto: SaveShippingDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.profileService.saveShipping(userId, dto);
    return ApiResponseDto.ok(data, 'Shipping information saved');
  }
}
