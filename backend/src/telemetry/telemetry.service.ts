import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.module';
import { TelemetryReadingDto } from './dto/telemetry-reading.dto';
import { TelemetryReading } from './entities/telemetry-reading.entity';

const POSTGRES_FOREIGN_KEY_VIOLATION = '23503';

function isForeignKeyViolation(err: unknown): boolean {
  const e = err as { code?: string; driverError?: { code?: string } } | null;
  return (
    e?.code === POSTGRES_FOREIGN_KEY_VIOLATION ||
    e?.driverError?.code === POSTGRES_FOREIGN_KEY_VIOLATION
  );
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @InjectRepository(TelemetryReading)
    private readonly readings: Repository<TelemetryReading>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue('telemetry-processing')
    private readonly telemetryQueue: Queue,
  ) {}

  async ingest(reading: TelemetryReadingDto): Promise<void> {
    const persisted = await this.persist(reading);
    if (!persisted) {
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

  private async persist(reading: TelemetryReadingDto): Promise<boolean> {
    try {
      await this.readings.insert({
        assetId: reading.assetId,
        temperature: reading.temperature,
        vibration: reading.vibration,
        pressure: reading.pressure,
        recordedAt: new Date(reading.recordedAt),
      });
      return true;
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        this.logger.warn(
          `Dropped telemetry reading for unknown asset ${reading.assetId}`,
        );
      } else {
        this.logger.error(
          `Failed to persist telemetry reading for asset ${reading.assetId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
      return false;
    }
  }
}
