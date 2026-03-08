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
import { UsersService } from '../../modules/users/users.service';
import { CreateUserDto } from '../../modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../../modules/users/dto/update-user.dto';
import { InviteUserDto } from '../../modules/users/dto/invite-user.dto';
import { UpdateProfileDto } from '../../modules/users/dto/update-profile.dto';
import { UserQueryDto } from '../../modules/users/dto/user-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @RequirePermission('admin:access')
  async getMe(@Req() req: { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.usersService.findOne(userId);
    return ApiResponseDto.ok(data);
  }

  @Patch('me')
  @RequirePermission('admin:access')
  async updateProfile(@Req() req: { user?: { userId: string } }, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.usersService.updateProfile(userId, dto);
    return ApiResponseDto.ok(data, 'Profile updated');
  }

  @Get()
  @RequirePermission('users:read')
  async findAll(@Query() query: UserQueryDto) {
    const { data, total } = await this.usersService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get('roles')
  @RequirePermission('users:read')
  async listRoles() {
    const data = await this.usersService.listRoles();
    return ApiResponseDto.ok(data);
  }

  @Get(':id')
  @RequirePermission('users:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Post()
  @RequirePermission('users:write')
  async create(@Body() dto: CreateUserDto) {
    const data = await this.usersService.create(dto);
    return ApiResponseDto.ok(data, 'User created');
  }

  @Post('invite')
  @RequirePermission('superadmin:manage')
  async invite(@Body() dto: InviteUserDto) {
    const data = await this.usersService.invite(dto);
    return ApiResponseDto.ok(data, 'Invitation sent');
  }

  @Post(':id/promote-super-admin')
  @RequirePermission('superadmin:manage')
  async promoteSuperAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.promoteSuperAdmin(id);
    return ApiResponseDto.ok(data, 'User promoted to Super Admin');
  }

  @Post(':id/demote-super-admin')
  @RequirePermission('superadmin:manage')
  async demoteSuperAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.demoteSuperAdmin(id);
    return ApiResponseDto.ok(data, 'User demoted from Super Admin');
  }

  @Put(':id')
  @RequirePermission('users:write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: { user?: { permissions?: string[] } },
  ) {
    const callerPermissions = (req.user?.permissions as string[] | undefined) ?? [];
    const data = await this.usersService.update(id, dto, callerPermissions);
    return ApiResponseDto.ok(data, 'User updated');
  }

  @Delete(':id')
  @RequirePermission('superadmin:manage')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
    return ApiResponseDto.ok(null, 'User deleted');
  }
}
