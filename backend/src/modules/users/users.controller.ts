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
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

interface RequestWithUser {
  user?: { userId: string; permissions?: string[] };
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

  @Post('invite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('superadmin:manage')
  @ApiBearerAuth('bearer')
  async invite(@Body() dto: InviteUserDto) {
    const data = await this.usersService.invite(dto);
    return ApiResponseDto.ok(data, 'Invitation sent');
  }

  @Post(':id/promote-super-admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('superadmin:manage')
  @ApiBearerAuth('bearer')
  async promoteSuperAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.promoteSuperAdmin(id);
    return ApiResponseDto.ok(data, 'User promoted to Super Admin');
  }

  @Post(':id/demote-super-admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('superadmin:manage')
  @ApiBearerAuth('bearer')
  async demoteSuperAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.demoteSuperAdmin(id);
    return ApiResponseDto.ok(data, 'User demoted from Super Admin');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users:write')
  @ApiBearerAuth('bearer')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    const callerPermissions = (req.user?.permissions as string[] | undefined) ?? [];
    const data = await this.usersService.update(id, dto, callerPermissions);
    return ApiResponseDto.ok(data, 'User updated');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('superadmin:manage')
  @ApiBearerAuth('bearer')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
    return ApiResponseDto.ok(null, 'User deleted');
  }
}
