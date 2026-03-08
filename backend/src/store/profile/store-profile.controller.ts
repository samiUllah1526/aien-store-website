import { Controller, Get, Put, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from '../../modules/users/users.service';
import { UpdateProfileDto } from '../../modules/users/dto/update-profile.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@ApiTags('store-profile')
@Controller('store/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class StoreProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.usersService.findOne(userId);
    return ApiResponseDto.ok(data);
  }

  @Patch('me')
  async updateProfile(@Req() req: { user?: { userId: string } }, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.usersService.updateProfile(userId, dto);
    return ApiResponseDto.ok(data, 'Profile updated');
  }
}
