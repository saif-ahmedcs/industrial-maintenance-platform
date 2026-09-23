import { Controller, Inject, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { TelemetryReadingDto } from './dto/telemetry-reading.dto';

@Controller()
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue('telemetry-processing')
    private readonly telemetryQueue: Queue,
  ) {}

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

    try {
      await this.redis.set(
        `telemetry:latest:${reading.assetId}`,
        JSON.stringify(reading),
      );

      await this.telemetryQueue.add('reading', reading);
    } catch (err) {
      this.logger.error(
        `Failed to cache/enqueue telemetry reading for asset ${reading.assetId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
