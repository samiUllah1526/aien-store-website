import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QuoteOrderDto } from './dto/quote-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';

interface RequestWithUser {
  user?: { userId: string };
}

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
  ) {}

  /** Public: get server-computed quote (no order created). Source of truth for totals. */
  @Public()
  @Post('quote')
  async quote(@Body() dto: QuoteOrderDto) {
    const data = await this.ordersService.quote(dto.items);
    return ApiResponseDto.ok(data);
  }

  /** Public checkout: guest or optional JWT to link order to customer. */
  @Public()
  @Post('checkout')
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
        // Invalid or expired token: proceed as guest
      }
    }
    const data = await this.ordersService.create(dto, customerUserId, idempotencyKey);
    return ApiResponseDto.ok(data, 'Order placed');
  }

  /** Customer-facing: list my orders (JWT required, ownership enforced). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async findMyOrders(
    @Req() req: RequestWithUser,
    @Query('page') page?: string | number,
    @Query('limit') limit?: string | number,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const { data, total } = await this.ordersService.findMyOrders(userId, {
      page: pageNum,
      limit: limitNum,
    });
    return ApiResponseDto.list(data, { total, page: pageNum, limit: limitNum });
  }

  /** Customer-facing: get one of my orders by id (ownership enforced). */
  @Get('me/:id')
  @UseGuards(JwtAuthGuard)
  async findMyOrder(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('User not authenticated');
    const data = await this.ordersService.findOneByCustomer(userId, id);
    return ApiResponseDto.ok(data);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('orders:write')
  async create(@Body() dto: CreateOrderDto) {
    const data = await this.ordersService.create(dto);
    return ApiResponseDto.ok(data, 'Order created');
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('orders:read')
  async findAll(@Query() query: OrderQueryDto) {
    const { data, total } = await this.ordersService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('orders:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.ordersService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('orders:write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    const data = await this.ordersService.update(id, dto);
    return ApiResponseDto.ok(data, 'Order updated');
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('orders:write')
  async assignStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignOrderDto,
  ) {
    const data = await this.ordersService.assignStaff(id, body.userId ?? null);
    return ApiResponseDto.ok(data, 'Order assignment updated');
  }
}
