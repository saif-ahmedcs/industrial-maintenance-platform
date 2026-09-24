import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryController } from './telemetry.controller';
import { TelemetryReading } from './entities/telemetry-reading.entity';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'telemetry-processing' }),
    TypeOrmModule.forFeature([TelemetryReading]),
  ],
  controllers: [TelemetryController],
})
export class TelemetryModule {}
