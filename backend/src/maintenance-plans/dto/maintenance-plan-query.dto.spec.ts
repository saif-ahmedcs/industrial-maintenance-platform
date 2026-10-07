import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MaintenancePlanQueryDto } from './maintenance-plan-query.dto';

const validAssetId = 'd57d9ca9-0d4a-4151-ad92-88c8ab13b930';

async function invalidFields(
  plain: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(MaintenancePlanQueryDto, plain);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
}

describe('MaintenancePlanQueryDto', () => {
  it('accepts a query with no assetId', async () => {
    expect(await invalidFields({})).toEqual([]);
  });

  it('accepts a valid assetId', async () => {
    expect(await invalidFields({ assetId: validAssetId })).toEqual([]);
  });

  it.each(['not-a-uuid', '123', ''])(
    'rejects the malformed assetId %p',
    async (assetId) => {
      expect(await invalidFields({ assetId })).toEqual(['assetId']);
    },
  );

  it('still validates the inherited pagination fields alongside assetId', async () => {
    expect(await invalidFields({ assetId: validAssetId, page: 0 })).toEqual([
      'page',
    ]);
  });

  it('rejects unknown query parameters', async () => {
    expect(await invalidFields({ unknown: 'x' })).toEqual(['unknown']);
  });
});
