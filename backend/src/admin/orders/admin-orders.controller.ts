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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from '../../modules/orders/orders.service';
import { CreateOrderDto } from '../../modules/orders/dto/create-order.dto';
import { UpdateOrderDto } from '../../modules/orders/dto/update-order.dto';
import { OrderQueryDto } from '../../modules/orders/dto/order-query.dto';
import { AssignOrderDto } from '../../modules/orders/dto/assign-order.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequirePermission('orders:write')
  async create(@Body() dto: CreateOrderDto) {
    const data = await this.ordersService.create(dto);
    return ApiResponseDto.ok(data, 'Order created');
  }

  @Get()
  @RequirePermission('orders:read')
  async findAll(@Query() query: OrderQueryDto) {
    const { data, total } = await this.ordersService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Get(':id')
  @RequirePermission('orders:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.ordersService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Put(':id')
  @RequirePermission('orders:write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    const data = await this.ordersService.update(id, dto);
    return ApiResponseDto.ok(data, 'Order updated');
  }

  @Patch(':id/assign')
  @RequirePermission('orders:write')
  async assignStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignOrderDto,
  ) {
    const data = await this.ordersService.assignStaff(id, body.userId ?? null);
    return ApiResponseDto.ok(data, 'Order assignment updated');
  }
}
