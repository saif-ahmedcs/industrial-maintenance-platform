import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { REDIS_CLIENT } from '../redis/redis.module';
import { TelemetryReadingDto } from './dto/telemetry-reading.dto';
import { TelemetryReadingResponseDto } from './dto/telemetry-reading-response.dto';
import { TelemetryReading } from './entities/telemetry-reading.entity';

const POSTGRES_FOREIGN_KEY_VIOLATION = '23503';
const TELEMETRY_SORTABLE_FIELDS = ['reading.recordedAt'];

const latestCacheKey = (assetId: string) => `telemetry:latest:${assetId}`;

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
        latestCacheKey(reading.assetId),
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

  async getLatest(assetId: string): Promise<TelemetryReadingResponseDto> {
    const cached = await this.readLatestFromCache(assetId);
    if (cached) {
      return cached;
    }

    const latest = await this.readings.findOne({
      where: { assetId },
      order: { recordedAt: 'DESC' },
    });
    if (!latest) {
      throw new NotFoundException(
        `No telemetry readings found for asset ${assetId}`,
      );
    }
    return TelemetryReadingResponseDto.fromEntity(latest);
  }

  async findHistory(
    assetId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<TelemetryReadingResponseDto>> {
    const qb = this.readings
      .createQueryBuilder('reading')
      .where('reading.assetId = :assetId', { assetId });

    const result = await paginate(qb, query, {
      defaultSortBy: 'reading.recordedAt',
      allowedSortFields: TELEMETRY_SORTABLE_FIELDS,
    });

    return {
      data: result.data.map((r) => TelemetryReadingResponseDto.fromEntity(r)),
      meta: result.meta,
    };
  }

  private async readLatestFromCache(
    assetId: string,
  ): Promise<TelemetryReadingResponseDto | null> {
    try {
      const raw = await this.redis.get(latestCacheKey(assetId));
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as TelemetryReadingResponseDto;
      return {
        assetId: parsed.assetId,
        temperature: parsed.temperature,
        vibration: parsed.vibration,
        pressure: parsed.pressure,
        recordedAt: parsed.recordedAt,
      };
    } catch (err) {
      this.logger.warn(
        `Latest-reading cache unavailable for asset ${assetId}, falling back to Postgres: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
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
