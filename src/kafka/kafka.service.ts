import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '../common/constants/kafka-topics';

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

  constructor(private readonly configService: ConfigService) {
    this.initializeKafkaClient();
  }

  private initializeKafkaClient(): void {
    const kafkaConfig = this.configService.get<KafkaConfig>('config.kafka');

    if (!kafkaConfig?.enabled) {
      this.logger.log('Kafka is disabled via ENABLE_KAFKA=false');
      this.kafkaClient = null;
      return;
    }

    if (!kafkaConfig.brokers || kafkaConfig.brokers.length === 0) {
      this.logger.error('Kafka is enabled but no brokers configured');
      this.kafkaClient = null;
      return;
    }

    const options: Record<string, unknown> = {
      client: {
        clientId: kafkaConfig.clientId || 'golo-backend-client',
        brokers: kafkaConfig.brokers,
        retry: {
          initialRetryTime: 300,
          retries: 8,
          maxRetryTime: 30000,
        },
        connectionTimeout: 5000,
        authenticationTimeout: 5000,
      },
      consumer: {
        groupId: `${kafkaConfig.groupId || 'golo-consumer-group'}-client`,
        allowAutoTopicCreation: true,
        sessionTimeout: 30000,
        rebalanceTimeout: 60000,
      },
      producer: {
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      },
    };

    if (kafkaConfig.sasl?.username && kafkaConfig.sasl?.password) {
      this.logger.log('Configuring SASL authentication for Railway Kafka');
      const clientOptions = options.client as Record<string, unknown>;
      clientOptions.sasl = {
        mechanism: kafkaConfig.sasl.mechanism || 'plain',
        username: kafkaConfig.sasl.username,
        password: kafkaConfig.sasl.password,
      };
      clientOptions.ssl = false;
    } else {
      this.logger.warn(
        'No SASL credentials provided for Kafka - connection may fail',
      );
    }

    this.logger.log(
      `Kafka client initialized with brokers: ${kafkaConfig.brokers.join(', ')}`,
    );
    this.kafkaClient = new ClientKafka(options as never);
  }

  async onModuleInit(): Promise<void> {
    if (!this.kafkaClient) {
      this.logger.log('Kafka client not initialized, skipping connection');
      return;
    }

    try {
      const topics = [
        KAFKA_TOPICS.AD_CREATE,
        KAFKA_TOPICS.AD_UPDATE,
        KAFKA_TOPICS.AD_DELETE,
        KAFKA_TOPICS.AD_GET,
        KAFKA_TOPICS.AD_GET_BY_CATEGORY,
        KAFKA_TOPICS.AD_GET_BY_USER,
        KAFKA_TOPICS.AD_SEARCH,
        KAFKA_TOPICS.AD_GET_NEARBY,
        KAFKA_TOPICS.CHAT_START_CONVERSATION,
        KAFKA_TOPICS.CHAT_LIST_CONVERSATIONS,
        KAFKA_TOPICS.CHAT_LIST_MESSAGES,
        KAFKA_TOPICS.CHAT_SEND_MESSAGE,
        KAFKA_TOPICS.CHAT_DELETE_CONVERSATION,
        KAFKA_TOPICS.CALL_GET_HISTORY,
        KAFKA_TOPICS.CALL_GET_BY_ID,
        KAFKA_TOPICS.CALL_CREATE_INVITE,
        KAFKA_TOPICS.CALL_ACCEPT,
        KAFKA_TOPICS.CALL_REJECT,
        KAFKA_TOPICS.CALL_END,
        KAFKA_TOPICS.ANALYTICS_DEVICE_BREAKDOWN,
        KAFKA_TOPICS.ANALYTICS_TOP_REGIONS,
        KAFKA_TOPICS.ANALYTICS_TOP_PAGES,
        KAFKA_TOPICS.ANALYTICS_EVENTS,
        KAFKA_TOPICS.ANALYTICS_RECENT_ACTIVITY,
        KAFKA_TOPICS.AUDIT_LOG_CREATE,
        KAFKA_TOPICS.AUDIT_LOG_LIST,
        KAFKA_TOPICS.REPORTS_STATUS,
      ];

      topics.forEach((topic) => this.kafkaClient?.subscribeToResponseOf(topic));

      this.logger.log('Attempting to connect to Kafka...');
      await this.kafkaClient.connect();
      this.logger.log('✅ Kafka client connected successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to connect to Kafka: ${errorMsg}`);
      this.logger.warn(
        'Continuing without Kafka connection - some features may be limited',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.kafkaClient) return;

    try {
      await this.kafkaClient.close();
      this.logger.log('Kafka client disconnected');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error disconnecting Kafka: ${errorMsg}`);
    }
  }

  async emit(
    topic: string,
    data: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
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

      await this.kafkaClient
        .emit(topic, { value: message, headers })
        .toPromise();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit to topic ${topic}: ${errorMsg}`);
      await this.sendToDLQ(topic, data, error as Error, correlationId).catch(
        () => undefined,
      );
    }
  }

  async send(
    topic: string,
    data: Record<string, unknown>,
    correlationId?: string,
  ): Promise<unknown> {
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

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  getClient(): ClientKafka | null {
    return this.kafkaClient;
  }

  isConnected(): boolean {
    return this.kafkaClient !== null;
  }
}
