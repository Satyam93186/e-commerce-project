import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';

export interface RabbitMQConfig {
  url: string;
  exchanges?: Array<{
    name: string;
    type: 'direct' | 'topic' | 'fanout' | 'headers';
    options?: any;
  }>;
  queues?: Array<{
    name: string;
    options?: any;
  }>;
}

export class RabbitMQClient {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private config: RabbitMQConfig;

  constructor(config: RabbitMQConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

      // Setup exchanges
      if (this.config.exchanges) {
        for (const exchange of this.config.exchanges) {
          await this.channel.assertExchange(
            exchange.name,
            exchange.type,
            exchange.options || { durable: true }
          );
        }
      }

      // Setup queues
      if (this.config.queues) {
        for (const queue of this.config.queues) {
          await this.channel.assertQueue(
            queue.name,
            queue.options || { durable: true }
          );
        }
      }

      console.log('✅ RabbitMQ connected successfully');

      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
      });

    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: any,
    options?: any
  ): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      return this.channel.publish(
        exchange,
        routingKey,
        messageBuffer,
        options || { persistent: true }
      );
    } catch (error) {
      console.error('Failed to publish message:', error);
      throw error;
    }
  }

  async subscribe(
    queue: string,
    callback: (message: any) => Promise<void>,
    options?: any
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Reject and requeue on error
          this.channel!.nack(msg, false, true);
        }
      },
      options || { noAck: false }
    );
  }

  async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.bindQueue(queue, exchange, routingKey);
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}

// Export singleton instance factory
export const createRabbitMQClient = (config: RabbitMQConfig): RabbitMQClient => {
  return new RabbitMQClient(config);
};
