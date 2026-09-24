import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TelemetryReadingDto } from './dto/telemetry-reading.dto';
import { TelemetryService } from './telemetry.service';

@Controller()
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  @EventPattern('factory/+/asset/+/telemetry')
  async handleTelemetry(@Payload() payload: unknown): Promise<void> {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      this.logger.warn(
        `Rejected non-object telemetry payload: ${JSON.stringify(payload)}`,
      );
      return;
    }

    const reading = plainToInstance(TelemetryReadingDto, payload);
    const errors = await validate(reading, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      this.logger.warn(
        `Rejected malformed telemetry payload: ${JSON.stringify(payload)} — ${errors
          .map((e) => Object.values(e.constraints ?? {}).join(', '))
          .join('; ')}`,
      );
      return;
    }

    await this.telemetryService.ingest(reading);
  }
}
