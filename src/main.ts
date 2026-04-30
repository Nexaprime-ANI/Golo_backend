import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { json, urlencoded } from 'express';
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
import * as dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value?: string): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
});

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const kafkaEnabled = parseBoolean(process.env.ENABLE_KAFKA);
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
async function bootstrap() {
  const logger = new Logger('Bootstrap');
dotenv.config();

  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);
const parseBoolean = (value?: string): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

  // Allow larger payloads for banner image submissions (base64 data URLs).
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }));
const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
});

  app.useGlobalPipes(validationPipe);

  if (kafkaEnabled) {
    const brokers = (process.env.KAFKA_BROKERS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (brokers.length === 0) {
      throw new Error(
        'ENABLE_KAFKA=true but KAFKA_BROKERS is empty. Set KAFKA_BROKERS in .env.',
      );
    }
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  const kafkaConfig = configService.get('config.kafka');
  const corsOrigins = configService.get<string[]>('config.cors.origins') || [];
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const kafkaEnabled = parseBoolean(process.env.ENABLE_KAFKA);

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: process.env.KAFKA_CLIENT_ID || 'golo-backend',
          brokers,
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  if (kafkaConfig?.enabled) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: kafkaConfig.clientId,
          brokers: kafkaConfig.brokers,

  if (kafkaEnabled) {
    const brokers = (process.env.KAFKA_BROKERS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (brokers.length === 0) {
      throw new Error(
        'ENABLE_KAFKA=true but KAFKA_BROKERS is empty. Set KAFKA_BROKERS in .env.',
      );
    }

    const microservice =
      await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_CLIENT_ID || 'golo-backend-server',
            brokers,
          },
          consumer: {
            groupId: process.env.KAFKA_GROUP_ID || 'golo-consumer-group-server',
          },
          producer: {
            allowAutoTopicCreation: true,
          },
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID || 'golo-consumer-group',
        },
        producer: {
          allowAutoTopicCreation: true,
        },
      },
    });
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
        consumer: {
          groupId: kafkaConfig.groupId,
        },
        producer: {
          allowAutoTopicCreation: true,
        },
      },
    });
      });

    await app.startAllMicroservices();
    logger.log(`Kafka mode enabled. Brokers: ${brokers.join(', ')}`);
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
    await app.startAllMicroservices();
    logger.log(`Kafka enabled. Brokers: ${kafkaConfig.brokers.join(', ')}`);
  } else {
    logger.warn('Kafka is disabled via ENABLE_KAFKA=false');
    microservice.useGlobalPipes(validationPipe);
    await microservice.listen();
    logger.log(`Kafka mode enabled. Brokers: ${brokers.join(', ')}`);
    return;
  }

  const corsOrigins = configService.get<string[]>('config.cors.origins') || [];
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  app.useGlobalPipes(validationPipe);

  const corsOrigins = configService.get<string[]>('config.cors.origins') || [];
  app.enableCors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = configService.get('config.service.port');
  await app.listen(port);
  logger.log(`HTTP mode enabled. Ads microservice is running on port ${port}`);
}

void bootstrap();
