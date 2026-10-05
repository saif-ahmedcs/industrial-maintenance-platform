import { Logger } from '@nestjs/common';
import { RECORDED_AT_TOLERANCE_MS } from './dto/telemetry-reading.dto';
import { TelemetryController } from './telemetry.controller';

describe('TelemetryController', () => {
  let controller: TelemetryController;
  let telemetryService: { ingest: jest.Mock };

  const validPayload = {
    assetId: 'd57d9ca9-0d4a-4151-ad92-88c8ab13b930',
    temperature: 45,
    vibration: 2.2,
    pressure: 6,
    recordedAt: '',
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    telemetryService = { ingest: jest.fn(async () => undefined) };
    controller = new TelemetryController(telemetryService as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ingests a reading whose recordedAt matches the server clock', async () => {
    await controller.handleTelemetry({
      ...validPayload,
      recordedAt: new Date().toISOString(),
    });

    expect(telemetryService.ingest).toHaveBeenCalledTimes(1);
  });

  it('ingests a reading just inside the tolerance window', async () => {
    const justInside = new Date(
      Date.now() + RECORDED_AT_TOLERANCE_MS - 1000,
    ).toISOString();

    await controller.handleTelemetry({
      ...validPayload,
      recordedAt: justInside,
    });

    expect(telemetryService.ingest).toHaveBeenCalledTimes(1);
  });

  it('drops a reading whose recordedAt is forged far in the future, without ingesting it', async () => {
    const farFuture = new Date(
      Date.now() + RECORDED_AT_TOLERANCE_MS + 60_000,
    ).toISOString();

    await controller.handleTelemetry({
      ...validPayload,
      recordedAt: farFuture,
    });

    expect(telemetryService.ingest).not.toHaveBeenCalled();
  });

  it('drops a reading whose recordedAt is far in the past, without ingesting it', async () => {
    const farPast = new Date(
      Date.now() - RECORDED_AT_TOLERANCE_MS - 60_000,
    ).toISOString();

    await controller.handleTelemetry({ ...validPayload, recordedAt: farPast });

    expect(telemetryService.ingest).not.toHaveBeenCalled();
  });

  it('still drops a malformed payload before the recordedAt check ever runs', async () => {
    await controller.handleTelemetry({
      ...validPayload,
      recordedAt: new Date().toISOString(),
      temperature: 'hot',
    });

    expect(telemetryService.ingest).not.toHaveBeenCalled();
  });

  it('still drops a non-object payload', async () => {
    await controller.handleTelemetry('not-an-object');

    expect(telemetryService.ingest).not.toHaveBeenCalled();
  });
});
