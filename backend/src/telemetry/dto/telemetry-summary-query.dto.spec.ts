import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TelemetrySummaryQueryDto } from './telemetry-summary-query.dto';

async function invalidFields(
  plain: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(TelemetrySummaryQueryDto, plain);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
}

describe('TelemetrySummaryQueryDto', () => {
  it('accepts a valid ISO 8601 since', async () => {
    expect(
      await invalidFields({ since: '2026-01-01T00:00:00.000Z' }),
    ).toEqual([]);
  });

  it('rejects a missing since — there is no default range', async () => {
    expect(await invalidFields({})).toEqual(['since']);
  });

  it.each(['', 'not-a-date', '2026-13-40', '1700000000', '2026/01/01'])(
    'rejects the invalid since %p',
    async (since) => {
      expect(await invalidFields({ since })).toEqual(['since']);
    },
  );

  it('rejects unknown query parameters', async () => {
    expect(
      await invalidFields({
        since: '2026-01-01T00:00:00.000Z',
        unknown: 'x',
      }),
    ).toEqual(['unknown']);
  });
});
