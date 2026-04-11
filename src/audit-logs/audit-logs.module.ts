import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaModule } from '../kafka/kafka.module';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsKafkaController } from './audit-logs.kafka.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    KafkaModule,
  ],
  controllers: [AuditLogsController, AuditLogsKafkaController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
