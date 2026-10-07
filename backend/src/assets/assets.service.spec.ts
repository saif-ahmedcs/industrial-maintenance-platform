import { NotFoundException } from '@nestjs/common';
import { AssetType } from '../asset-types/entities/asset-type.entity';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Location } from '../locations/entities/location.entity';
import { RoleName } from '../users/entities/role.entity';
import { AssetsService } from './assets.service';
import { AssetQueryDto } from './dto/asset-query.dto';
import { AssetStatus } from './entities/asset.entity';

describe('AssetsService', () => {
  let service: AssetsService;
  let assetRepo: { findOneBy: jest.Mock; createQueryBuilder: jest.Mock };
  let manager: {
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let auditService: { record: jest.Mock };
  let assetHistoryService: { record: jest.Mock };

  const actor: RequestUser = {
    id: 'user-1',
    email: 'admin@example.com',
    roles: [RoleName.ADMIN],
  };

  beforeEach(() => {
    assetRepo = { findOneBy: jest.fn(), createQueryBuilder: jest.fn() };
    manager = {
      findOneBy: jest.fn(),
      create: jest.fn((_entity, plain) => plain),
      save: jest.fn(async (entity) => ({ ...entity, id: 'asset-1' })),
      remove: jest.fn(async (entity) => entity),
    };
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };
    auditService = { record: jest.fn(async () => ({})) };
    assetHistoryService = { record: jest.fn(async () => ({})) };

    service = new AssetsService(
      assetRepo as any,
      dataSource as any,
      auditService as any,
      assetHistoryService as any,
    );
  });

  describe('findAll', () => {
    let qb: {
      alias: string;
      andWhere: jest.Mock;
      orderBy: jest.Mock;
      addOrderBy: jest.Mock;
      skip: jest.Mock;
      take: jest.Mock;
      getManyAndCount: jest.Mock;
    };

    const query = (overrides: Partial<AssetQueryDto> = {}): AssetQueryDto =>
      ({ page: 1, limit: 20, sortDir: 'DESC', ...overrides }) as AssetQueryDto;

    beforeEach(() => {
      qb = {
        alias: 'asset',
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      assetRepo.createQueryBuilder.mockReturnValue(qb);
    });

    it('applies no status condition when no status is given', async () => {
      await service.findAll(query());

      expect(assetRepo.createQueryBuilder).toHaveBeenCalledWith('asset');
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('adds a parameterised status condition when a status is given', async () => {
      await service.findAll(query({ status: AssetStatus.CRITICAL }));

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('asset.status = :status', {
        status: AssetStatus.CRITICAL,
      });
    });

    it('still paginates and sorts a status-filtered query', async () => {
      await service.findAll(
        query({ status: AssetStatus.OPERATIONAL, page: 2, limit: 10 }),
      );

      expect(qb.orderBy).toHaveBeenCalledWith('asset.tag', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the asset type does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(
          {
            assetTypeId: 'missing-type',
            locationId: 'loc-1',
            tag: 'PUMP-001',
          } as any,
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the location does not exist', async () => {
      manager.findOneBy.mockImplementation(
        async (entity: unknown, where: { id: string }) => {
          if (entity === AssetType && where.id === 'type-1') {
            return { id: 'type-1' };
          }
          return null;
        },
      );

      await expect(
        service.create(
          {
            assetTypeId: 'type-1',
            locationId: 'missing-location',
            tag: 'PUMP-001',
          } as any,
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('creates the asset and records a CREATE audit entry when both references exist', async () => {
      manager.findOneBy.mockImplementation(async (entity: unknown) => {
        if (entity === AssetType) return { id: 'type-1' };
        if (entity === Location) return { id: 'loc-1' };
        return null;
      });

      const result = await service.create(
        {
          assetTypeId: 'type-1',
          locationId: 'loc-1',
          tag: 'PUMP-001',
        } as any,
        actor,
      );

      expect(manager.save).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ entityType: 'Asset', action: 'CREATE' }),
      );
      expect(result.id).toBe('asset-1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the asset does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { tag: 'X' } as any, actor),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when reassigning to a nonexistent asset type', async () => {
      manager.findOneBy.mockImplementation(
        async (entity: unknown, where: { id: string }) => {
          if (entity !== AssetType && where.id === 'asset-1') {
            return {
              id: 'asset-1',
              assetTypeId: 'type-1',
              locationId: 'loc-1',
              tag: 'PUMP-001',
            };
          }
          if (entity === AssetType) return null;
          return null;
        },
      );

      await expect(
        service.update(
          'asset-1',
          { assetTypeId: 'missing-type' } as any,
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the asset does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          'missing-id',
          { status: AssetStatus.CRITICAL } as any,
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('records a STATUS_CHANGE audit entry and a matching history row', async () => {
      manager.findOneBy.mockResolvedValue({
        id: 'asset-1',
        status: AssetStatus.OPERATIONAL,
      });
      manager.save.mockImplementation(async (entity) => entity);

      const result = await service.updateStatus(
        'asset-1',
        { status: AssetStatus.CRITICAL } as any,
        actor,
      );

      expect(result.status).toBe(AssetStatus.CRITICAL);
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          entityType: 'Asset',
          action: 'STATUS_CHANGE',
          before: { status: AssetStatus.OPERATIONAL },
          after: { status: AssetStatus.CRITICAL },
        }),
      );
      expect(assetHistoryService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          assetId: 'asset-1',
          previousStatus: AssetStatus.OPERATIONAL,
          newStatus: AssetStatus.CRITICAL,
          changedByUserId: actor.id,
        }),
      );
    });

    it('skips the audit and history writes when the status is unchanged', async () => {
      manager.findOneBy.mockResolvedValue({
        id: 'asset-1',
        status: AssetStatus.OPERATIONAL,
      });

      const result = await service.updateStatus(
        'asset-1',
        { status: AssetStatus.OPERATIONAL } as any,
        actor,
      );

      expect(result.status).toBe(AssetStatus.OPERATIONAL);
      expect(manager.save).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
      expect(assetHistoryService.record).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the asset does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(service.remove('missing-id', actor)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.remove).not.toHaveBeenCalled();
    });
  });
});
