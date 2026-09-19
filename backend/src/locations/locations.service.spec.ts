import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Plant } from '../plants/entities/plant.entity';
import { RoleName } from '../users/entities/role.entity';
import { Location } from './entities/location.entity';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  let locationRepo: { findOneBy: jest.Mock; createQueryBuilder: jest.Mock };
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
    locationRepo = { findOneBy: jest.fn(), createQueryBuilder: jest.fn() };
    manager = {
      findOneBy: jest.fn(),
      create: jest.fn((_entity, plain) => plain),
      save: jest.fn(async (entity) => ({ ...entity, id: 'location-1' })),
      remove: jest.fn(async (entity) => entity),
    };
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };
    auditService = { record: jest.fn(async () => ({})) };

    service = new LocationsService(
      locationRepo as any,
      dataSource as any,
      auditService as any,
    );
  });

  describe('create', () => {
    it('throws NotFoundException when the plant does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(
          { plantId: 'missing-plant', name: 'Area A' } as any,
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the parent location does not exist', async () => {
      manager.findOneBy.mockImplementation(
        async (entity: unknown, where: { id: string }) => {
          if (entity === Plant && where.id === 'plant-1') {
            return { id: 'plant-1' };
          }
          return null;
        },
      );

      await expect(
        service.create(
          {
            plantId: 'plant-1',
            name: 'Sub-area',
            parentLocationId: 'missing-parent',
          } as any,
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the parent belongs to a different plant', async () => {
      manager.findOneBy.mockImplementation(
        async (entity: unknown, where: { id: string }) => {
          if (entity === Plant && where.id === 'plant-1') {
            return { id: 'plant-1' };
          }
          if (entity === Location && where.id === 'parent-1') {
            return { id: 'parent-1', plantId: 'plant-OTHER' };
          }
          return null;
        },
      );

      await expect(
        service.create(
          {
            plantId: 'plant-1',
            name: 'Sub-area',
            parentLocationId: 'parent-1',
          } as any,
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('creates the location and records a CREATE audit entry when the plant exists and there is no parent', async () => {
      manager.findOneBy.mockImplementation(async (entity: unknown) => {
        if (entity === Plant) return { id: 'plant-1' };
        return null;
      });

      const result = await service.create(
        { plantId: 'plant-1', name: 'Area A' } as any,
        actor,
      );

      expect(manager.save).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          entityType: 'Location',
          action: 'CREATE',
          after: expect.objectContaining({ plantId: 'plant-1' }),
        }),
      );
      expect(result.id).toBe('location-1');
    });

    it('accepts a valid parent that belongs to the same plant', async () => {
      manager.findOneBy.mockImplementation(
        async (entity: unknown, where: { id: string }) => {
          if (entity === Plant && where.id === 'plant-1') {
            return { id: 'plant-1' };
          }
          if (entity === Location && where.id === 'parent-1') {
            return { id: 'parent-1', plantId: 'plant-1' };
          }
          return null;
        },
      );

      await service.create(
        {
          plantId: 'plant-1',
          name: 'Sub-area',
          parentLocationId: 'parent-1',
        } as any,
        actor,
      );

      expect(auditService.record).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the location does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'X' } as any, actor),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when trying to set a location as its own parent', async () => {
      manager.findOneBy.mockResolvedValue({
        id: 'loc-1',
        plantId: 'plant-1',
        name: 'A',
      });

      await expect(
        service.update('loc-1', { parentLocationId: 'loc-1' } as any, actor),
      ).rejects.toThrow(BadRequestException);
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the new parent belongs to a different plant', async () => {
      manager.findOneBy.mockImplementation(
        async (entity: unknown, where: { id: string }) => {
          if (where.id === 'loc-1') {
            return { id: 'loc-1', plantId: 'plant-1', name: 'A' };
          }
          if (where.id === 'parent-2') {
            return { id: 'parent-2', plantId: 'plant-OTHER' };
          }
          return null;
        },
      );

      await expect(
        service.update('loc-1', { parentLocationId: 'parent-2' } as any, actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows detaching a location from its parent by passing parentLocationId: null', async () => {
      manager.findOneBy.mockResolvedValue({
        id: 'loc-1',
        plantId: 'plant-1',
        name: 'A',
        parentLocationId: 'old-parent',
      });
      manager.save.mockImplementation(async (entity) => entity);

      const result = await service.update(
        'loc-1',
        { parentLocationId: null } as any,
        actor,
      );

      expect(result.parentLocationId).toBeNull();
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ action: 'UPDATE' }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the location does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(service.remove('missing-id', actor)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.remove).not.toHaveBeenCalled();
    });
  });
});
