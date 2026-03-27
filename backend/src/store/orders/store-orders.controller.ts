import { Controller, Get, Post, Body, Param, Query, Headers, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from '../../modules/orders/orders.service';
import { CreateOrderDto } from '../../modules/orders/dto/create-order.dto';
import { QuoteOrderDto } from '../../modules/orders/dto/quote-order.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';

@ApiTags('store-orders')
@Controller('store/orders')
export class StoreOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('quote')
  @ApiOperation({ summary: 'Get order quote (public)', security: [] })
  async quote(@Body() dto: QuoteOrderDto) {
    const data = await this.ordersService.quote(dto.items, dto.voucherCode);
    return ApiResponseDto.ok(data);
  }

  @Public()
  @Post('checkout')
  @ApiOperation({ summary: 'Checkout (public; optional JWT)', security: [] })
  async checkout(
    @Body() dto: CreateOrderDto,
    @Req() req: { headers: { authorization?: string } },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    let customerUserId: string | null = null;
    const authHeader = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (token) {
      try {
        const payload = this.jwtService.verify<{ sub: string }>(token);
        if (payload?.sub) customerUserId = payload.sub;
      } catch {
        // proceed as guest
      }
    }
    const data = await this.ordersService.create(dto, customerUserId, idempotencyKey);
    return ApiResponseDto.ok(data, 'Order placed');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List my orders' })
  async findMyOrders(
    @Req() req: { user?: { userId: string } },
    @Query('page') page?: string | number,
    @Query('limit') limit?: string | number,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const { data, total } = await this.ordersService.findMyOrders(userId, { page: pageNum, limit: limitNum });
    return ApiResponseDto.list(data, { total, page: pageNum, limit: limitNum });
  }

  @Get('me/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get my order by ID' })
  async findMyOrder(@Req() req: { user?: { userId: string } }, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.ordersService.findOneByCustomer(userId, id);
    return ApiResponseDto.ok(data);
  }
}
