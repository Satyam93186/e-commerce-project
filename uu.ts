import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRabbitMQClient, RabbitMQClient } from '@ecommerce/rabbitmq-client';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private client: RabbitMQClient;

  constructor(private config: ConfigService) {
    this.client = createRabbitMQClient({
      url: this.config.get('RABBITMQ_URL') || 'amqp://localhost:5672',
      exchanges: [
        { name: 'orders.exchange', type: 'topic' },
        { name: 'inventory.exchange', type: 'topic' },
        { name: 'payments.exchange', type: 'topic' },
      ],
      queues: [
        { name: 'inventory.reserved' },
        { name: 'inventory.failed' },
        { name: 'payment.completed' },
        { name: 'payment.failed' },
      ],
    });
  }

  async onModuleInit() {
    await this.client.connect();

    // Bind queues to exchanges
    await this.client.bindQueue('inventory.reserved', 'inventory.exchange', 'inventory.reserved');
    await this.client.bindQueue('inventory.failed', 'inventory.exchange', 'inventory.failed');
    await this.client.bindQueue('payment.completed', 'payments.exchange', 'payment.completed');
    await this.client.bindQueue('payment.failed', 'payments.exchange', 'payment.failed');
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  async publish(exchange: string, routingKey: string, message: any) {
    return this.client.publish(exchange, routingKey, message);
  }

  async subscribe(queue: string, callback: (message: any) => Promise<void>) {
    return this.client.subscribe(queue, callback);
  }
}
