import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  VouchersService,
  ValidateVoucherResult,
} from '../../modules/vouchers/vouchers.service';
import { ValidateVoucherDto } from '../../modules/vouchers/dto/validate-voucher.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';

@ApiTags('store-vouchers')
@Controller('store/vouchers')
export class StoreVouchersController {
  constructor(
    private readonly vouchersService: VouchersService,
    private readonly jwtService: JwtService,
  ) {}

  private getRequestId(headers?: { 'x-request-id'?: string }): string {
    const id = headers?.['x-request-id'];
    if (id?.trim()) return id.trim();
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  @Public()
  @Post('validate')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @ApiOperation({ summary: 'Validate voucher (public)', security: [] })
  async validate(
    @Body() dto: ValidateVoucherDto,
    @Req()
    req: { headers?: { authorization?: string; 'x-request-id'?: string } },
  ) {
    let customerUserId: string | undefined;
    const authHeader = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    if (token) {
      try {
        const payload = this.jwtService.verify<{ sub: string }>(token);
        if (payload?.sub) customerUserId = payload.sub;
      } catch {
        // proceed without user
      }
    }
    const result = await this.vouchersService.validate(
      { ...dto, customerUserId: customerUserId ?? dto.customerUserId },
      {
        actorId: customerUserId ?? null,
        requestId: this.getRequestId(req.headers),
      },
    );
    if (result.valid) {
      return ApiResponseDto.ok(result);
    }
    return {
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    };
  }
}
