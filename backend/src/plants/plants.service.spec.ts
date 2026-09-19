import { NotFoundException } from '@nestjs/common';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { RoleName } from '../users/entities/role.entity';
import { PlantsService } from './plants.service';

describe('PlantsService', () => {
  let service: PlantsService;
  let plantRepo: { findOneBy: jest.Mock; createQueryBuilder: jest.Mock };
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
    plantRepo = { findOneBy: jest.fn(), createQueryBuilder: jest.fn() };
    manager = {
      findOneBy: jest.fn(),
      create: jest.fn((_entity, plain) => plain),
      save: jest.fn(async (entity) => ({ ...entity, id: 'plant-1' })),
      remove: jest.fn(async (entity) => entity),
    };
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };
    auditService = { record: jest.fn(async () => ({})) };

    service = new PlantsService(
      plantRepo as any,
      dataSource as any,
      auditService as any,
    );
  });

  describe('findOne', () => {
    it('throws NotFoundException when no plant matches', async () => {
      plantRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('saves the plant and records a CREATE audit entry in the same transaction', async () => {
      const dto = { name: 'Plant One', address: '1 Main St' };

      const result = await service.create(dto as any, actor);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.save).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          actorUserId: 'user-1',
          entityType: 'Plant',
          action: 'CREATE',
          before: null,
          after: { name: 'Plant One', address: '1 Main St' },
          source: 'manual',
        }),
      );
      expect(result.id).toBe('plant-1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the plant does not exist, and never touches audit', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'X' } as any, actor),
      ).rejects.toThrow(NotFoundException);
      expect(auditService.record).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('records accurate before/after values on a successful update', async () => {
      const existing = {
        id: 'plant-1',
        name: 'Old Name',
        address: 'Old Addr',
      };
      manager.findOneBy.mockResolvedValue(existing);
      manager.save.mockImplementation(async (entity) => entity);

      await service.update('plant-1', { name: 'New Name' } as any, actor);

      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: 'UPDATE',
          before: { name: 'Old Name', address: 'Old Addr' },
          after: { name: 'New Name', address: 'Old Addr' },
        }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the plant does not exist, and never removes/audits', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(service.remove('missing-id', actor)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.remove).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('removes the plant and records a DELETE audit entry with the prior values', async () => {
      const existing = { id: 'plant-1', name: 'Plant One', address: null };
      manager.findOneBy.mockResolvedValue(existing);

      await service.remove('plant-1', actor);

      expect(manager.remove).toHaveBeenCalledWith(existing);
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: 'DELETE',
          before: { name: 'Plant One', address: null },
          after: null,
        }),
      );
    });
  });
});
