import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

interface KafkaConfigType {
  enabled: boolean;
  clientId: string;
  brokers: string[];
  groupId: string;
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const kafkaEnabled = parseBoolean(process.env.ENABLE_KAFKA);

  if (kafkaEnabled) {
    const brokers = (process.env.KAFKA_BROKERS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

<<<<<<< HEAD
    if (brokers.length === 0) {
      throw new Error(
        'ENABLE_KAFKA=true but KAFKA_BROKERS is empty. Set KAFKA_BROKERS in .env.',
      );
    }

    const microservice = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_CLIENT_ID || 'golo-backend',
            brokers,
          },
          consumer: {
            groupId: process.env.KAFKA_GROUP_ID || 'golo-consumer-group',
          },
          producer: {
            allowAutoTopicCreation: true,
          },
=======
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const kafkaConfig = configService.get<KafkaConfigType>('config.kafka');

  if (kafkaConfig?.enabled) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: kafkaConfig.clientId,
          brokers: kafkaConfig.brokers,
        },
        consumer: {
          groupId: kafkaConfig.groupId,
        },
        producer: {
          allowAutoTopicCreation: true,
>>>>>>> 4d37f9e4e8ae25e132ebd5a049c4910dd7c816bb
        },
      },
    );

    microservice.useGlobalPipes(validationPipe);
    await microservice.listen();
    logger.log(`Kafka mode enabled. Brokers: ${brokers.join(', ')}`);
    return;
  }

<<<<<<< HEAD
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  app.useGlobalPipes(validationPipe);

  const corsOrigins = configService.get<string[]>('config.cors.origins') || [];

=======
  // Always allow localhost:3001 for CORS in development
>>>>>>> 4d37f9e4e8ae25e132ebd5a049c4910dd7c816bb
  app.enableCors({
    origin: ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

<<<<<<< HEAD
  const port = configService.get('config.service.port');
=======
  // const port = configService.get('config.service.port');
  const port = 3002;
>>>>>>> 4d37f9e4e8ae25e132ebd5a049c4910dd7c816bb
  await app.listen(port);
  logger.log(`HTTP mode enabled. Ads microservice is running on port ${port}`);
}

void bootstrap();
