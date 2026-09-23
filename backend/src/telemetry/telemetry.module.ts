import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TelemetryController } from './telemetry.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'telemetry-processing' })],
  controllers: [TelemetryController],
})
export class TelemetryModule {}
