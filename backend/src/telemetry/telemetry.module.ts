import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsModule } from '../assets/assets.module';
import { TelemetryController } from './telemetry.controller';
import { TelemetryReadingsController } from './telemetry-readings.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryReading } from './entities/telemetry-reading.entity';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'telemetry-processing' }),
    TypeOrmModule.forFeature([TelemetryReading]),
    AssetsModule,
  ],
  controllers: [TelemetryController, TelemetryReadingsController],
  providers: [TelemetryService],
})
export class TelemetryModule {}
