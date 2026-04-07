import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsKafkaController } from './audit-logs.kafka.controller';
import { KafkaModule } from '../kafka/kafka.module';

@Global()
@Module({
  imports: [
<<<<<<< HEAD
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
    KafkaModule,
=======
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
>>>>>>> 4d37f9e4e8ae25e132ebd5a049c4910dd7c816bb
  ],
  controllers: [AuditLogsController, AuditLogsKafkaController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
