import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { RequestContext } from '../common/context/request-context';
import {
  RECORDED_AT_TOLERANCE_MS,
  TelemetryReadingDto,
} from './dto/telemetry-reading.dto';
import { TelemetryService } from './telemetry.service';

@Controller()
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  @EventPattern('factory/+/asset/+/telemetry')
  async handleTelemetry(@Payload() payload: unknown): Promise<void> {
    const correlationId = randomUUID();

    return RequestContext.run({ requestId: correlationId }, async () => {
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

      const driftMs = Math.abs(Date.now() - Date.parse(reading.recordedAt));
      if (driftMs > RECORDED_AT_TOLERANCE_MS) {
        this.logger.warn(
          `Rejected telemetry reading for asset ${reading.assetId}: recordedAt ` +
            `${reading.recordedAt} is ${driftMs}ms from the server clock, ` +
            `outside the ${RECORDED_AT_TOLERANCE_MS}ms tolerance — a publisher-controlled ` +
            `timestamp this far off cannot be trusted`,
        );
        return;
      }

      this.logger.log(
        `Ingesting telemetry reading for asset ${reading.assetId}`,
      );
      await this.telemetryService.ingest(reading, correlationId);
    });
  }
}
