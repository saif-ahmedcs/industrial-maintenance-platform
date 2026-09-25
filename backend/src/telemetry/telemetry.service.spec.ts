import { Logger, NotFoundException } from '@nestjs/common';
import { TelemetryReadingDto } from './dto/telemetry-reading.dto';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let readingRepo: { insert: jest.Mock; findOne: jest.Mock };
  let redis: { set: jest.Mock; get: jest.Mock };
  let queue: { add: jest.Mock };

  const reading: TelemetryReadingDto = {
    assetId: 'd57d9ca9-0d4a-4151-ad92-88c8ab13b930',
    temperature: 45,
    vibration: 2.2,
    pressure: 6,
    recordedAt: '2026-09-24T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    readingRepo = { insert: jest.fn(async () => ({})), findOne: jest.fn() };
    redis = { set: jest.fn(async () => 'OK'), get: jest.fn() };
    queue = { add: jest.fn(async () => ({})) };

    service = new TelemetryService(
      readingRepo as any,
      redis as any,
      queue as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists, caches and enqueues a valid reading', async () => {
    await service.ingest(reading);

    expect(readingRepo.insert).toHaveBeenCalledWith({
      assetId: reading.assetId,
      temperature: reading.temperature,
      vibration: reading.vibration,
      pressure: reading.pressure,
      recordedAt: new Date(reading.recordedAt),
    });
    expect(redis.set).toHaveBeenCalledWith(
      `telemetry:latest:${reading.assetId}`,
      JSON.stringify(reading),
    );
    expect(queue.add).toHaveBeenCalledWith('reading', reading);
  });

  it('writes to Postgres before Redis and the queue', async () => {
    const order: string[] = [];
    readingRepo.insert.mockImplementation(async () => {
      order.push('db');
    });
    redis.set.mockImplementation(async () => {
      order.push('redis');
    });
    queue.add.mockImplementation(async () => {
      order.push('queue');
    });

    await service.ingest(reading);

    expect(order).toEqual(['db', 'redis', 'queue']);
  });

  it('drops a reading for an unknown asset without caching or enqueueing it', async () => {
    readingRepo.insert.mockRejectedValue(
      Object.assign(new Error('fk violation'), { code: '23503' }),
    );

    await expect(service.ingest(reading)).resolves.toBeUndefined();

    expect(redis.set).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not cache or enqueue when the insert fails for another reason, and does not throw', async () => {
    readingRepo.insert.mockRejectedValue(new Error('connection lost'));

    await expect(service.ingest(reading)).resolves.toBeUndefined();

    expect(redis.set).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not throw when Redis fails, and the reading stays persisted', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));

    await expect(service.ingest(reading)).resolves.toBeUndefined();

    expect(readingRepo.insert).toHaveBeenCalledTimes(1);
  });

  describe('getLatest', () => {
    const dbRow = {
      id: 'row-1',
      assetId: reading.assetId,
      temperature: 44.9,
      vibration: 2.1,
      pressure: 5.9,
      recordedAt: new Date('2026-09-24T09:59:59.000Z'),
      ingestedAt: new Date('2026-09-24T10:00:00.000Z'),
    };
    const dbRowResponse = {
      assetId: reading.assetId,
      temperature: 44.9,
      vibration: 2.1,
      pressure: 5.9,
      recordedAt: '2026-09-24T09:59:59.000Z',
    };

    it('returns the cached reading without touching Postgres', async () => {
      redis.get.mockResolvedValue(JSON.stringify(reading));

      const result = await service.getLatest(reading.assetId);

      expect(redis.get).toHaveBeenCalledWith(
        `telemetry:latest:${reading.assetId}`,
      );
      expect(result).toEqual(reading);
      expect(readingRepo.findOne).not.toHaveBeenCalled();
    });

    it('falls back to the newest Postgres row on a cold cache', async () => {
      redis.get.mockResolvedValue(null);
      readingRepo.findOne.mockResolvedValue(dbRow);

      const result = await service.getLatest(reading.assetId);

      expect(readingRepo.findOne).toHaveBeenCalledWith({
        where: { assetId: reading.assetId },
        order: { recordedAt: 'DESC' },
      });
      expect(result).toEqual(dbRowResponse);
    });

    it('falls back to Postgres when Redis throws', async () => {
      redis.get.mockRejectedValue(new Error('redis down'));
      readingRepo.findOne.mockResolvedValue(dbRow);

      await expect(service.getLatest(reading.assetId)).resolves.toEqual(
        dbRowResponse,
      );
    });

    it('falls back to Postgres when the cached value is not valid JSON', async () => {
      redis.get.mockResolvedValue('{not json');
      readingRepo.findOne.mockResolvedValue(dbRow);

      await expect(service.getLatest(reading.assetId)).resolves.toEqual(
        dbRowResponse,
      );
    });

    it('throws NotFoundException when there is no cache and no stored reading', async () => {
      redis.get.mockResolvedValue(null);
      readingRepo.findOne.mockResolvedValue(null);

      await expect(service.getLatest(reading.assetId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
