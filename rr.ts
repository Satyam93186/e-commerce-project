import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto);
  }

  @Get(':id')
  getOrder(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.orderService.getOrderById(id, userId);
  }

  @Get('user/:userId')
  getUserOrders(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orderService.getUserOrders(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.orderService.cancelOrder(id, userId);
  }
}
