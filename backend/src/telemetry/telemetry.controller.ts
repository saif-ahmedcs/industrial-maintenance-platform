import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TelemetryReadingDto } from './dto/telemetry-reading.dto';

@Controller()
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  @EventPattern('factory/+/asset/+/telemetry')
  async handleTelemetry(@Payload() payload: unknown): Promise<void> {
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

    this.logger.log(`Telemetry received: ${JSON.stringify(reading)}`);
  }
}
