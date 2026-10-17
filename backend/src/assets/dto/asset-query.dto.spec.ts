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

  it('accepts a search string', async () => {
    expect(await invalidFields({ search: 'PUMP' })).toEqual([]);
  });

  it('rejects a search string longer than 100 characters', async () => {
    expect(await invalidFields({ search: 'x'.repeat(101) })).toEqual([
      'search',
    ]);
  });

  it('accepts a valid locationId and assetTypeId', async () => {
    const uuid = '11111111-1111-1111-1111-111111111111';
    expect(await invalidFields({ locationId: uuid })).toEqual([]);
    expect(await invalidFields({ assetTypeId: uuid })).toEqual([]);
  });

  it.each(['not-a-uuid', ''])(
    'rejects an invalid locationId %p',
    async (locationId) => {
      expect(await invalidFields({ locationId })).toEqual(['locationId']);
    },
  );

  it.each(['not-a-uuid', ''])(
    'rejects an invalid assetTypeId %p',
    async (assetTypeId) => {
      expect(await invalidFields({ assetTypeId })).toEqual(['assetTypeId']);
    },
  );

  it('accepts status, search, location, and asset type together', async () => {
    const uuid = '11111111-1111-1111-1111-111111111111';
    expect(
      await invalidFields({
        status: 'CRITICAL',
        search: 'PUMP',
        locationId: uuid,
        assetTypeId: uuid,
      }),
    ).toEqual([]);
  });
});
