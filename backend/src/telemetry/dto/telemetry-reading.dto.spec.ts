import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TELEMETRY_RANGES, TelemetryReadingDto } from './telemetry-reading.dto';

const validReading = {
  assetId: 'd57d9ca9-0d4a-4151-ad92-88c8ab13b930',
  temperature: 45,
  vibration: 2.2,
  pressure: 6,
  recordedAt: '2026-09-24T10:00:00.000Z',
};

async function invalidFields(
  overrides: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(TelemetryReadingDto, {
    ...validReading,
    ...overrides,
  });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
}

describe('TelemetryReadingDto', () => {
  it('accepts a valid reading', async () => {
    expect(await invalidFields({})).toEqual([]);
  });

  it.each(['temperature', 'vibration', 'pressure'] as const)(
    'accepts %s exactly on both range boundaries',
    async (field) => {
      const { min, max } = TELEMETRY_RANGES[field];
      expect(await invalidFields({ [field]: min })).toEqual([]);
      expect(await invalidFields({ [field]: max })).toEqual([]);
    },
  );

  it.each(['temperature', 'vibration', 'pressure'] as const)(
    'rejects %s just outside either range boundary',
    async (field) => {
      const { min, max } = TELEMETRY_RANGES[field];
      expect(await invalidFields({ [field]: min - 0.01 })).toEqual([field]);
      expect(await invalidFields({ [field]: max + 0.01 })).toEqual([field]);
    },
  );

  it.each(['temperature', 'vibration', 'pressure'] as const)(
    'rejects a non-numeric %s',
    async (field) => {
      expect(await invalidFields({ [field]: 'hot' })).toEqual([field]);
    },
  );

  it('rejects a non-UUID assetId', async () => {
    expect(await invalidFields({ assetId: 'not-a-uuid' })).toEqual(['assetId']);
  });

  it('rejects an impossible calendar date in recordedAt', async () => {
    expect(
      await invalidFields({ recordedAt: '2026-02-30T00:00:00.000Z' }),
    ).toEqual(['recordedAt']);
  });

  it('rejects unknown extra fields', async () => {
    expect(await invalidFields({ humidity: 40 })).toEqual(['humidity']);
  });
});
