import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssetStatus } from '../entities/asset.entity';
import { AssetQueryDto } from './asset-query.dto';

async function invalidFields(
  plain: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(AssetQueryDto, plain);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
}

describe('AssetQueryDto', () => {
  it('accepts a query with no status', async () => {
    expect(await invalidFields({})).toEqual([]);
  });

  it.each(Object.values(AssetStatus))('accepts status %s', async (status) => {
    expect(await invalidFields({ status })).toEqual([]);
  });

  it.each(['critical', 'BROKEN', ''])(
    'rejects the invalid status %p',
    async (status) => {
      expect(await invalidFields({ status })).toEqual(['status']);
    },
  );

  it('still validates the inherited pagination fields alongside status', async () => {
    expect(await invalidFields({ status: 'CRITICAL', page: 0 })).toEqual([
      'page',
    ]);
    expect(await invalidFields({ status: 'CRITICAL', limit: 101 })).toEqual([
      'limit',
    ]);
  });

  it('rejects unknown query parameters', async () => {
    expect(await invalidFields({ unknown: 'x' })).toEqual(['unknown']);
  });
});
