import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RabbitMQService } from '../../common/rabbitmq/rabbitmq.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderCreatedEvent,
  OrderStatus,
  InventoryReservedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '@ecommerce/shared-types';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private rabbitmq: RabbitMQService,
  ) {}

  async onModuleInit() {
    // Subscribe to inventory events
    await this.rabbitmq.subscribe(
      'inventory.reserved',
      this.handleInventoryReserved.bind(this),
    );
    
    await this.rabbitmq.subscribe(
      'inventory.failed',
      this.handleInventoryFailed.bind(this),
    );

    // Subscribe to payment events
    await this.rabbitmq.subscribe(
      'payment.completed',
      this.handlePaymentCompleted.bind(this),
    );
    
    await this.rabbitmq.subscribe(
      'payment.failed',
      this.handlePaymentFailed.bind(this),
    );
  }

  async createOrder(dto: CreateOrderDto) {
    // Validate products exist and calculate total
    let totalAmount = 0;
    const productIds = dto.items.map(item => item.productId);
    
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { stock: true },
    });

    if (products.length !== dto.items.length) {
      throw new NotFoundException('Some products not found');
    }

    // Calculate total and validate stock
    for (const item of dto.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (!product.stock || product.stock.quantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      totalAmount += Number(product.price) * item.quantity;
    }

    // Create order with PENDING status
    const order = await this.prisma.order.create({
      data: {
        userId: dto.userId,
        status: OrderStatus.PENDING,
        totalAmount,
        shippingAddressId: dto.shippingAddressId,
        items: {
          create: dto.items.map(item => {
            const product = products.find(p => p.id === item.productId)!;
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: product.price,
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
    });

    // Publish order.created event
    const event: OrderCreatedEvent = {
      orderId: order.id,
      userId: order.userId,
      items: dto.items,
      totalAmount,
      timestamp: new Date(),
    };

    await this.rabbitmq.publish('orders.exchange', 'order.created', event);

    console.log(`✅ Order ${order.id} created and event published`);

    return order;
  }

  async getOrderById(orderId: string, userId?: string) {
    const where: any = { id: orderId };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.order.findUnique({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
        transaction: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelOrder(orderId: string, userId?: string) {
    const order = await this.getOrderById(orderId, userId);

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    // Publish order.cancelled event to release inventory
    await this.rabbitmq.publish('orders.exchange', 'order.cancelled', {
      orderId,
      reason: 'Cancelled by user',
      timestamp: new Date(),
    });

    return updatedOrder;
  }

  // Event Handlers (Saga Pattern)

  private async handleInventoryReserved(event: InventoryReservedEvent) {
    console.log(`📦 Inventory reserved for order ${event.orderId}`);

    if (event.success) {
      // Update order status to CONFIRMED
      await this.prisma.order.update({
        where: { id: event.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      // Trigger payment processing
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
      });

      if (order) {
        await this.rabbitmq.publish('payments.exchange', 'payment.initiate', {
          orderId: order.id,
          amount: Number(order.totalAmount),
          timestamp: new Date(),
        });
      }
    } else {
      // Inventory reservation failed, cancel order
      await this.prisma.order.update({
        where: { id: event.orderId },
        data: { status: OrderStatus.FAILED },
      });

      console.error(`❌ Order ${event.orderId} failed: ${event.message}`);
    }
  }

  private async handleInventoryFailed(event: any) {
    console.error(`❌ Inventory failed for order ${event.orderId}: ${event.reason}`);

    await this.prisma.order.update({
      where: { id: event.orderId },
      data: { status: OrderStatus.FAILED },
    });
  }

  private async handlePaymentCompleted(event: PaymentCompletedEvent) {
    console.log(`💳 Payment completed for order ${event.orderId}`);

    await this.prisma.order.update({
      where: { id: event.orderId },
      data: { status: OrderStatus.PROCESSING },
    });

    // Publish order.confirmed event for notifications
    await this.rabbitmq.publish('orders.exchange', 'order.confirmed', {
      orderId: event.orderId,
      transactionId: event.transactionId,
      timestamp: new Date(),
    });
  }

  private async handlePaymentFailed(event: PaymentFailedEvent) {
    console.error(`❌ Payment failed for order ${event.orderId}: ${event.reason}`);

    await this.prisma.order.update({
      where: { id: event.orderId },
      data: { status: OrderStatus.FAILED },
    });

    // Release inventory
    await this.rabbitmq.publish('inventory.exchange', 'inventory.release', {
      orderId: event.orderId,
      timestamp: new Date(),
    });
  }
}
