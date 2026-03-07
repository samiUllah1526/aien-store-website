import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/create-permission.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('superadmin:manage')
@ApiBearerAuth('bearer')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll() {
    const data = await this.rolesService.findAll();
    return ApiResponseDto.ok(data);
  }

  @Get('permissions/grouped')
  async listPermissionsGrouped() {
    const data = await this.rolesService.listPermissionsGrouped();
    return ApiResponseDto.ok(data);
  }

  @Post('permissions')
  async createPermission(@Body() dto: CreatePermissionDto) {
    const data = await this.rolesService.createPermission(dto);
    return ApiResponseDto.ok(data, 'Permission created');
  }

  @Patch('permissions/:id')
  async updatePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    const data = await this.rolesService.updatePermission(id, dto);
    return ApiResponseDto.ok(data, 'Permission updated');
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.rolesService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Post()
  async create(@Body() dto: CreateRoleDto) {
    const data = await this.rolesService.create(dto);
    return ApiResponseDto.ok(data, 'Role created');
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const data = await this.rolesService.update(id, dto);
    return ApiResponseDto.ok(data, 'Role updated');
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.rolesService.remove(id);
    return ApiResponseDto.ok(null, 'Role deleted');
  }
}
