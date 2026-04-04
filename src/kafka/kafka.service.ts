import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { KAFKA_TOPICS } from '../common/constants/kafka-topics';

// Type definitions for Kafka configuration
interface KafkaSaslConfig {
  mechanism: string;
  username: string;
  password: string;
}

interface KafkaConfig {
  enabled: boolean;
  brokers: string[];
  clientId: string;
  groupId: string;
  sasl?: KafkaSaslConfig;
  ssl?: boolean;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafkaClient: ClientKafka | null = null;
  private readonly kafkaEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.kafkaEnabled = process.env.ENABLE_KAFKA === 'true';

    if (this.kafkaEnabled) {
      this.initializeKafkaClient();
    } else {
      this.logger.log('Kafka is disabled via ENABLE_KAFKA=false');
    }
  }

  // ==================== INITIALIZATION WITH RAILWAY SUPPORT ====================
  private initializeKafkaClient(): void {
    const kafkaConfig = this.configService.get<KafkaConfig>('config.kafka');

    // Check if Kafka is enabled
    if (!kafkaConfig?.enabled) {
      this.logger.log('Kafka is disabled, skipping client initialization');
      this.kafkaClient = null;
      return;
    }

    // Validate brokers
    if (!kafkaConfig?.brokers || kafkaConfig.brokers.length === 0) {
      this.logger.error('Kafka is enabled but no brokers configured');
      this.kafkaClient = null;
      return;
    }

    const clientId: string = kafkaConfig.clientId ?? 'golo-backend';
    const groupId: string = kafkaConfig.groupId ?? 'golo-consumer-group';
    const brokers: string[] = kafkaConfig.brokers;

    const options: Record<string, unknown> = {
      client: {
        clientId,
        brokers,
        retry: {
          initialRetryTime: 300,
          retries: 8,
          maxRetryTime: 30000,
        },
        connectionTimeout: 5000,
        authenticationTimeout: 5000,
      },
      consumer: {
        groupId,
        allowAutoTopicCreation: true,
        sessionTimeout: 30000,
        rebalanceTimeout: 60000,
      },
      producer: {
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      },
    };

    // 🔴 IMPORTANT: Add SASL authentication for Railway
    if (kafkaConfig.sasl?.username && kafkaConfig.sasl?.password) {
      this.logger.log('Configuring SASL authentication for Railway Kafka');
      const clientOptions = options.client as Record<string, unknown>;
      clientOptions.sasl = {
        mechanism: kafkaConfig.sasl.mechanism || 'plain',
        username: kafkaConfig.sasl.username,
        password: kafkaConfig.sasl.password,
      };
      clientOptions.ssl = false; // Railway uses plaintext internally
    } else {
      this.logger.warn(
        'No SASL credentials provided for Kafka - connection may fail',
      );
    }

    this.logger.log(
      `Kafka client initialized with brokers: ${brokers.join(', ')}`,
    );
    this.kafkaClient = new ClientKafka(options as never);
  }

  // ==================== LIFECYCLE HOOKS ====================

  async onModuleInit() {
    // Skip if Kafka is disabled or client not initialized
    if (!this.kafkaClient) {
      this.logger.log('Kafka client not initialized, skipping connection');
      return;
    }

    try {
      // Subscribe to response topics
      const topics = [
        KAFKA_TOPICS.AD_RESPONSE,
        KAFKA_TOPICS.AD_ERROR,
        KAFKA_TOPICS.AD_CREATED,
        KAFKA_TOPICS.AD_UPDATED,
        KAFKA_TOPICS.AD_DELETED,
      ];

      topics.forEach((topic) => {
        this.kafkaClient.subscribeToResponseOf(topic);
      });

      this.logger.log('Attempting to connect to Kafka...');
      await this.kafkaClient.connect();
      this.logger.log('✅ Kafka client connected successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to connect to Kafka: ${errorMsg}`);
      // Don't throw - allow app to continue without Kafka
      this.logger.warn(
        'Continuing without Kafka connection - some features may be limited',
      );
    }
  }

  async onModuleDestroy() {
    if (this.kafkaClient) {
      try {
        await this.kafkaClient.close();
        this.logger.log('Kafka client disconnected');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error disconnecting Kafka: ${errorMsg}`);
      }
    }
  }

  // ==================== MESSAGE EMITTING ====================

  async emit(
    topic: string,
    data: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    // Skip if Kafka is disabled
    if (!this.kafkaClient) {
      this.logger.debug(`Kafka disabled, skipping emit to ${topic}`);
      return;
    }

    try {
      const serviceName =
        this.configService.get<string>('config.service.name') ?? 'ads-service';
      const message = {
        ...data,
        timestamp: new Date().toISOString(),
        service: serviceName,
      };

      const headers: Record<string, string> = {
        correlationId: correlationId || this.generateCorrelationId(),
        source: serviceName,
        timestamp: Date.now().toString(),
      };

      this.logger.debug(`Emitting to topic ${topic}`);

      await this.kafkaClient
        .emit(topic, { value: message, headers })
        .toPromise();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit to topic ${topic}: ${errorMsg}`);

      // Try to send to DLQ if available
      await this.sendToDLQ(topic, data, error as Error, correlationId).catch(
        (e) => {
          const dlqErrorMsg = e instanceof Error ? e.message : String(e);
          this.logger.error(`Failed to send to DLQ: ${dlqErrorMsg}`);
        },
      );
    }
  }

  async send(
    topic: string,
    data: Record<string, unknown>,
    correlationId?: string,
  ): Promise<unknown> {
    // Skip if Kafka is disabled
    if (!this.kafkaClient) {
      this.logger.debug(`Kafka disabled, skipping send to ${topic}`);
      return null;
    }

    try {
      const serviceName =
        this.configService.get<string>('config.service.name') ?? 'ads-service';
      const message = {
        ...data,
        timestamp: new Date().toISOString(),
        service: serviceName,
      };

      const headers: Record<string, string> = {
        correlationId: correlationId || this.generateCorrelationId(),
        source: serviceName,
        timestamp: Date.now().toString(),
      };

      this.logger.debug(`Sending to topic ${topic}`);

      return await this.kafkaClient
        .send(topic, { value: message, headers })
        .toPromise();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send to topic ${topic}: ${errorMsg}`);

      await this.sendToDLQ(topic, data, error as Error, correlationId);
      throw error;
    }
  }

  // ==================== DEAD LETTER QUEUE ====================

  private async sendToDLQ(
    originalTopic: string,
    data: Record<string, unknown>,
    error: Error,
    correlationId?: string,
  ): Promise<void> {
    if (!this.kafkaClient) return;

    try {
      await this.kafkaClient
        .emit(KAFKA_TOPICS.AD_DLQ, {
          value: {
            originalTopic,
            originalMessage: data,
            error: {
              message: error.message,
              stack: error.stack,
            },
            timestamp: new Date().toISOString(),
            correlationId: correlationId || this.generateCorrelationId(),
          },
        })
        .toPromise();
    } catch (dlqError) {
      const dlqErrorMsg =
        dlqError instanceof Error ? dlqError.message : String(dlqError);
      this.logger.error(`Failed to send to DLQ: ${dlqErrorMsg}`);
    }
  }

  // ==================== UTILITIES ====================

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getClient(): ClientKafka | null {
    return this.kafkaClient;
  }

  // ==================== HEALTH CHECK ====================

  isConnected(): boolean {
    return this.kafkaClient !== null;
  }
}
