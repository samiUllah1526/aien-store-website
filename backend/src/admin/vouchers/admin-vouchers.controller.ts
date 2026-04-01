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
import { VouchersService } from '../../modules/vouchers/vouchers.service';
import { CreateVoucherDto } from '../../modules/vouchers/dto/create-voucher.dto';
import { UpdateVoucherDto } from '../../modules/vouchers/dto/update-voucher.dto';
import { VoucherQueryDto } from '../../modules/vouchers/dto/voucher-query.dto';
import { VoucherAuditQueryDto } from '../../modules/vouchers/dto/voucher-audit-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-vouchers')
@Controller('admin/vouchers')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  private getRequestId(headers?: { 'x-request-id'?: string }): string {
    const id = headers?.['x-request-id'];
    if (id?.trim()) return id.trim();
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  @Post()
  @RequirePermission('vouchers:write')
  async create(
    @Body() dto: CreateVoucherDto,
    @Req()
    req: { user?: { userId: string }; headers?: { 'x-request-id'?: string } },
  ) {
    const ctx = {
      actorId: req.user?.userId ?? null,
      requestId: this.getRequestId(req.headers),
    };
    const data = await this.vouchersService.create(dto, ctx);
    return ApiResponseDto.ok(data, 'Voucher created');
  }

  @Get()
  @RequirePermission('vouchers:read')
  async findAll(@Query() query: VoucherQueryDto) {
    const { data, total } = await this.vouchersService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get('audit-logs')
  @RequirePermission('vouchers:read')
  async findAllAuditLogs(@Query() query: VoucherAuditQueryDto) {
    const { data, total } = await this.vouchersService.findAuditLogs(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get(':id/stats')
  @RequirePermission('vouchers:read')
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.vouchersService.getStats(id);
    return ApiResponseDto.ok(data);
  }

  @Get(':id/audit-logs')
  @RequirePermission('vouchers:read')
  async findVoucherAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: VoucherAuditQueryDto,
  ) {
    const { data, total } = await this.vouchersService.findAuditLogsByVoucher(
      id,
      query,
    );
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get(':id')
  @RequirePermission('vouchers:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.vouchersService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Put(':id')
  @RequirePermission('vouchers:write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
    @Req()
    req: { user?: { userId: string }; headers?: { 'x-request-id'?: string } },
  ) {
    const ctx = {
      actorId: req.user?.userId ?? null,
      requestId: this.getRequestId(req.headers),
    };
    const data = await this.vouchersService.update(id, dto, ctx);
    return ApiResponseDto.ok(data, 'Voucher updated');
  }

  @Patch(':id/status')
  @RequirePermission('vouchers:write')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive: boolean },
    @Req()
    req: { user?: { userId: string }; headers?: { 'x-request-id'?: string } },
  ) {
    const ctx = {
      actorId: req.user?.userId ?? null,
      requestId: this.getRequestId(req.headers),
    };
    const data = await this.vouchersService.updateStatus(
      id,
      body.isActive ?? false,
      ctx,
    );
    return ApiResponseDto.ok(
      data,
      body.isActive ? 'Voucher activated' : 'Voucher deactivated',
    );
  }

  @Delete(':id')
  @RequirePermission('vouchers:write')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req()
    req: { user?: { userId: string }; headers?: { 'x-request-id'?: string } },
  ) {
    const ctx = {
      actorId: req.user?.userId ?? null,
      requestId: this.getRequestId(req.headers),
    };
    await this.vouchersService.remove(id, ctx);
    return ApiResponseDto.ok(null, 'Voucher deleted');
  }
}
