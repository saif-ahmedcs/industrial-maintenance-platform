import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryReading } from './entities/telemetry-reading.entity';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'telemetry-processing' }),
    TypeOrmModule.forFeature([TelemetryReading]),
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService],
})
export class TelemetryModule {}
