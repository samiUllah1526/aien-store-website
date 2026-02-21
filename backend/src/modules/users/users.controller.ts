import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

interface RequestWithUser {
  user?: { userId: string };
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async getMe(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.usersService.findOne(userId);
    return ApiResponseDto.ok(data);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async updateProfile(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.usersService.updateProfile(userId, dto);
    return ApiResponseDto.ok(data, 'Profile updated');
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users:read')
  @ApiBearerAuth('bearer')
  async findAll(@Query() query: UserQueryDto) {
    const { data, total } = await this.usersService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users:read')
  @ApiBearerAuth('bearer')
  async listRoles() {
    const data = await this.usersService.listRoles();
    return ApiResponseDto.ok(data);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users:read')
  @ApiBearerAuth('bearer')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users:write')
  @ApiBearerAuth('bearer')
  async create(@Body() dto: CreateUserDto) {
    const data = await this.usersService.create(dto);
    return ApiResponseDto.ok(data, 'User created');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users:write')
  @ApiBearerAuth('bearer')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const data = await this.usersService.update(id, dto);
    return ApiResponseDto.ok(data, 'User updated');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users:write')
  @ApiBearerAuth('bearer')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
    return ApiResponseDto.ok(null, 'User deleted');
  }
}
