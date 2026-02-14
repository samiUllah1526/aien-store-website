import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
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
  async checkout(@Body() dto: CreateOrderDto, @Req() req: { headers: { authorization?: string } }) {
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
    const data = await this.ordersService.create(dto, customerUserId);
    return ApiResponseDto.ok(data, 'Order placed');
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
