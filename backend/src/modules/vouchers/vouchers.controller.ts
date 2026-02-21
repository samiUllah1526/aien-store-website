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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { VouchersService, ValidateVoucherResult } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';

interface RequestWithUser {
  user?: { userId: string };
  headers?: { authorization?: string };
}

@Controller('vouchers')
export class VouchersController {
  constructor(
    private readonly vouchersService: VouchersService,
    private readonly jwtService: JwtService,
  ) {}

  /** Public: validate voucher for checkout (optional JWT for per-user limit check). */
  @Public()
  @Post('validate')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async validate(
    @Body() dto: ValidateVoucherDto,
    @Req() req: RequestWithUser,
  ) {
    let customerUserId: string | undefined;
    const authHeader = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (token) {
      try {
        const payload = this.jwtService.verify<{ sub: string }>(token);
        if (payload?.sub) customerUserId = payload.sub;
      } catch {
        // Invalid token: proceed without user
      }
    }
    const result = await this.vouchersService.validate({
      ...dto,
      customerUserId: customerUserId ?? dto.customerUserId,
    });
    if (result.valid) {
      return ApiResponseDto.ok(result as ValidateVoucherResult);
    }
    return {
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('vouchers:write')
  async create(@Body() dto: CreateVoucherDto) {
    const data = await this.vouchersService.create(dto);
    return ApiResponseDto.ok(data, 'Voucher created');
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('vouchers:read')
  async findAll(@Query() query: VoucherQueryDto) {
    const { data, total } = await this.vouchersService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('vouchers:read')
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.vouchersService.getStats(id);
    return ApiResponseDto.ok(data);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('vouchers:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.vouchersService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('vouchers:write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    const data = await this.vouchersService.update(id, dto);
    return ApiResponseDto.ok(data, 'Voucher updated');
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('vouchers:write')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive: boolean },
  ) {
    const data = await this.vouchersService.updateStatus(id, body.isActive ?? false);
    return ApiResponseDto.ok(data, body.isActive ? 'Voucher activated' : 'Voucher deactivated');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('vouchers:write')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.vouchersService.remove(id);
    return ApiResponseDto.ok(null, 'Voucher deleted');
  }
}
