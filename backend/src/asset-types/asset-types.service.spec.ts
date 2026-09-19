import { NotFoundException } from '@nestjs/common';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { RoleName } from '../users/entities/role.entity';
import { AssetTypesService } from './asset-types.service';

describe('AssetTypesService', () => {
  let service: AssetTypesService;
  let assetTypeRepo: { findOneBy: jest.Mock; createQueryBuilder: jest.Mock };
  let manager: {
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let auditService: { record: jest.Mock };

  const actor: RequestUser = {
    id: 'user-1',
    email: 'admin@example.com',
    roles: [RoleName.ADMIN],
  };

  beforeEach(() => {
    assetTypeRepo = { findOneBy: jest.fn(), createQueryBuilder: jest.fn() };
    manager = {
      findOneBy: jest.fn(),
      create: jest.fn((_entity, plain) => plain),
      save: jest.fn(async (entity) => ({ ...entity, id: 'asset-type-1' })),
      remove: jest.fn(async (entity) => entity),
    };
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };
    auditService = { record: jest.fn(async () => ({})) };

    service = new AssetTypesService(
      assetTypeRepo as any,
      dataSource as any,
      auditService as any,
    );
  });

  describe('findOne', () => {
    it('throws NotFoundException when no asset type matches', async () => {
      assetTypeRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('saves the asset type and records a CREATE audit entry', async () => {
      const result = await service.create(
        { name: 'Pump', category: 'Rotating equipment' } as any,
        actor,
      );

      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          entityType: 'AssetType',
          action: 'CREATE',
          before: null,
          after: { name: 'Pump', category: 'Rotating equipment' },
        }),
      );
      expect(result.id).toBe('asset-type-1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the asset type does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'X' } as any, actor),
      ).rejects.toThrow(NotFoundException);
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the asset type does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(service.remove('missing-id', actor)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.remove).not.toHaveBeenCalled();
    });

    it('removes the asset type and records a DELETE audit entry', async () => {
      const existing = { id: 'at-1', name: 'Pump', category: null };
      manager.findOneBy.mockResolvedValue(existing);

      await service.remove('at-1', actor);

      expect(manager.remove).toHaveBeenCalledWith(existing);
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ action: 'DELETE', after: null }),
      );
    });
  });
});
