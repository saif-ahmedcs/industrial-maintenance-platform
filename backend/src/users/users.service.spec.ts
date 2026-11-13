import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { RoleName } from './entities/role.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
  };
  let manager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let auditService: { record: jest.Mock };

  const actor: RequestUser = {
    id: 'actor-1',
    email: 'admin@example.com',
    roles: [RoleName.ADMIN],
  };

  const adminRole = { id: 'role-admin', name: RoleName.ADMIN };
  const supervisorRole = { id: 'role-supervisor', name: RoleName.SUPERVISOR };
  const viewerRole = { id: 'role-viewer', name: RoleName.VIEWER };

  /** The count query used by the last-active-admin guard. */
  function mockCountQuery(count: number) {
    manager.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(count),
    });
  }

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, plain) => plain),
      save: jest.fn(async (entity) => entity),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };
    auditService = { record: jest.fn(async () => ({})) };

    service = new UsersService(
      userRepo as any,
      dataSource as any,
      auditService as any,
    );
  });

  describe('findAllPaginated', () => {
    function mockListQuery(rows: { id: string }[], total: number) {
      const qb: any = {
        alias: 'user',
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    const baseQuery = { page: 1, limit: 20, sortDir: 'DESC' as const };

    it('applies the active filter and the role filter as a filter-only join', async () => {
      const qb = mockListQuery([], 0);

      await service.findAllPaginated({
        ...baseQuery,
        active: false,
        role: RoleName.SUPERVISOR,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('user.isActive = :active', {
        active: false,
      });
      expect(qb.innerJoin).toHaveBeenCalledWith(
        'user.roles',
        'roleFilter',
        'roleFilter.name = :role',
        { role: RoleName.SUPERVISOR },
      );
    });

    it('re-fetches the page by id so eager roles are hydrated, preserving order', async () => {
      mockListQuery([{ id: 'u2' }, { id: 'u1' }], 2);
      userRepo.find.mockResolvedValue([
        { id: 'u1', email: 'a@example.com', roles: [viewerRole] },
        { id: 'u2', email: 'b@example.com', roles: [adminRole] },
      ]);

      const result = await service.findAllPaginated(baseQuery as any);

      expect(result.data.map((u) => u.id)).toEqual(['u2', 'u1']);
      expect(result.data[0].roles).toEqual([adminRole]);
      expect(result.meta.total).toBe(2);
    });

    it('skips the re-fetch entirely when the page is empty', async () => {
      mockListQuery([], 0);

      const result = await service.findAllPaginated(baseQuery as any);

      expect(result.data).toEqual([]);
      expect(userRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    const dto = {
      email: 'new@example.com',
      name: 'New Person',
      roles: [RoleName.SUPERVISOR],
    };

    it('throws ConflictException if the email already exists', async () => {
      manager.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.createUser(dto as any, actor)).rejects.toThrow(
        ConflictException,
      );
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if a requested role is not seeded', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.find.mockResolvedValue([]); // no roles found

      await expect(service.createUser(dto as any, actor)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('generates and hashes a temporary password, and returns it in plain text exactly once', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.find.mockResolvedValue([supervisorRole]);

      const result = await service.createUser(dto as any, actor);

      expect(result.temporaryPassword).toHaveLength(16);
      expect(result.user.passwordHash).toBeDefined();
      expect(result.user.passwordHash).not.toBe(result.temporaryPassword);
      await expect(
        bcrypt.compare(result.temporaryPassword, result.user.passwordHash),
      ).resolves.toBe(true);
    });

    it('records a CREATE audit entry that never includes the password', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.find.mockResolvedValue([supervisorRole]);

      await service.createUser(dto as any, actor);

      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          actorUserId: 'actor-1',
          entityType: 'User',
          action: 'CREATE',
          before: null,
          after: {
            email: dto.email,
            name: dto.name,
            roles: [RoleName.SUPERVISOR],
          },
        }),
      );
      const [, params] = auditService.record.mock.calls[0];
      expect(JSON.stringify(params)).not.toMatch(/password/i);
    });
  });

  describe('updateProfile', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('missing', { name: 'X' } as any, actor),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates the name with no guard involved', async () => {
      manager.findOne.mockResolvedValue({
        id: 'user-1',
        name: 'Old Name',
        isActive: true,
        roles: [viewerRole],
      });

      const result = await service.updateProfile(
        'user-1',
        { name: 'New Name' } as any,
        actor,
      );

      expect(result.user.name).toBe('New Name');
      expect(result.justDeactivated).toBe(false);
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('deactivates a non-admin without consulting the last-admin guard', async () => {
      manager.findOne.mockResolvedValue({
        id: 'user-1',
        name: 'Tech',
        isActive: true,
        roles: [viewerRole],
      });

      const result = await service.updateProfile(
        'user-1',
        { active: false } as any,
        actor,
      );

      expect(result.user.isActive).toBe(false);
      expect(result.justDeactivated).toBe(true);
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('throws ConflictException deactivating the last active admin', async () => {
      manager.findOne.mockResolvedValue({
        id: 'admin-1',
        name: 'Admin',
        isActive: true,
        roles: [adminRole],
      });
      mockCountQuery(0);

      await expect(
        service.updateProfile('admin-1', { active: false } as any, actor),
      ).rejects.toThrow(
        new ConflictException('At least one active admin is required.'),
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('allows deactivating an admin when another active admin exists', async () => {
      manager.findOne.mockResolvedValue({
        id: 'admin-1',
        name: 'Admin',
        isActive: true,
        roles: [adminRole],
      });
      mockCountQuery(1);

      const result = await service.updateProfile(
        'admin-1',
        { active: false } as any,
        actor,
      );

      expect(result.justDeactivated).toBe(true);
      expect(result.user.isActive).toBe(false);
    });

    it('never guards a no-op or a reactivation', async () => {
      manager.findOne.mockResolvedValue({
        id: 'admin-1',
        name: 'Admin',
        isActive: false,
        roles: [adminRole],
      });

      const result = await service.updateProfile(
        'admin-1',
        { active: true } as any,
        actor,
      );

      expect(result.justDeactivated).toBe(false);
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('writes an UPDATE audit entry with accurate before/after values', async () => {
      manager.findOne.mockResolvedValue({
        id: 'user-1',
        name: 'Old Name',
        isActive: true,
        roles: [viewerRole],
      });

      await service.updateProfile(
        'user-1',
        { name: 'New Name', active: false } as any,
        actor,
      );

      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: 'UPDATE',
          before: { name: 'Old Name', isActive: true },
          after: { name: 'New Name', isActive: false },
        }),
      );
    });
  });

  describe('updateRoles', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.updateRoles('missing', { roles: [RoleName.VIEWER] } as any, actor),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when a requested role is not seeded', async () => {
      manager.findOne.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        roles: [viewerRole],
      });
      manager.find.mockResolvedValue([]);

      await expect(
        service.updateRoles(
          'user-1',
          { roles: [RoleName.TECHNICIAN] } as any,
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException removing ADMIN from the last active admin', async () => {
      manager.findOne.mockResolvedValue({
        id: 'admin-1',
        isActive: true,
        roles: [adminRole],
      });
      manager.find.mockResolvedValue([viewerRole]);
      mockCountQuery(0);

      await expect(
        service.updateRoles(
          'admin-1',
          { roles: [RoleName.VIEWER] } as any,
          actor,
        ),
      ).rejects.toThrow(
        new ConflictException('At least one active admin is required.'),
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('allows removing ADMIN when another active admin exists', async () => {
      manager.findOne.mockResolvedValue({
        id: 'admin-1',
        isActive: true,
        roles: [adminRole],
      });
      manager.find.mockResolvedValue([viewerRole]);
      mockCountQuery(1);

      const result = await service.updateRoles(
        'admin-1',
        { roles: [RoleName.VIEWER] } as any,
        actor,
      );

      expect(result.roles).toEqual([viewerRole]);
    });

    it('allows adding roles, keeping ADMIN, without consulting the guard', async () => {
      manager.findOne.mockResolvedValue({
        id: 'admin-1',
        isActive: true,
        roles: [adminRole],
      });
      manager.find.mockResolvedValue([adminRole, supervisorRole]);

      await service.updateRoles(
        'admin-1',
        { roles: [RoleName.ADMIN, RoleName.SUPERVISOR] } as any,
        actor,
      );

      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('never guards role changes on an already-inactive admin', async () => {
      manager.findOne.mockResolvedValue({
        id: 'admin-1',
        isActive: false,
        roles: [adminRole],
      });
      manager.find.mockResolvedValue([viewerRole]);

      await service.updateRoles(
        'admin-1',
        { roles: [RoleName.VIEWER] } as any,
        actor,
      );

      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('de-duplicates repeated role names before resolving them', async () => {
      manager.findOne.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        roles: [viewerRole],
      });
      manager.find.mockResolvedValue([supervisorRole]);

      await service.updateRoles(
        'user-1',
        { roles: [RoleName.SUPERVISOR, RoleName.SUPERVISOR] } as any,
        actor,
      );

      expect(manager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: { name: expect.anything() },
        }),
      );
    });

    it('writes a ROLES_UPDATE audit entry with accurate before/after values', async () => {
      manager.findOne.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        roles: [viewerRole],
      });
      manager.find.mockResolvedValue([supervisorRole]);

      await service.updateRoles(
        'user-1',
        { roles: [RoleName.SUPERVISOR] } as any,
        actor,
      );

      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: 'ROLES_UPDATE',
          before: { roles: [RoleName.VIEWER] },
          after: { roles: [RoleName.SUPERVISOR] },
        }),
      );
    });
  });
});
