import { RequestUser } from '../auth/interfaces/request-user.interface';
import { RoleName } from './entities/role.entity';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    findAllPaginated: jest.Mock;
    createUser: jest.Mock;
    updateProfile: jest.Mock;
    updateRoles: jest.Mock;
    resetPassword: jest.Mock;
  };
  let authService: { revokeAllForUser: jest.Mock };

  const actor: RequestUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    roles: [RoleName.ADMIN],
  };

  const viewerRole = { id: 'role-viewer', name: RoleName.VIEWER };

  beforeEach(() => {
    usersService = {
      findAllPaginated: jest.fn(),
      createUser: jest.fn(),
      updateProfile: jest.fn(),
      updateRoles: jest.fn(),
      resetPassword: jest.fn(),
    };
    authService = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };

    controller = new UsersController(usersService as any, authService as any);
  });

  describe('findAll', () => {
    it('maps each row to UserResponseDto and passes meta through unchanged', async () => {
      usersService.findAllPaginated.mockResolvedValue({
        data: [
          {
            id: 'user-1',
            email: 'a@example.com',
            name: 'A',
            isActive: true,
            roles: [viewerRole],
            createdAt: new Date('2026-01-01'),
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const query = { page: 1, limit: 20, sortDir: 'DESC' } as any;
      const result = await controller.findAll(query);

      expect(usersService.findAllPaginated).toHaveBeenCalledWith(query);
      expect(result.data).toEqual([
        {
          id: 'user-1',
          email: 'a@example.com',
          name: 'A',
          isActive: true,
          roles: [RoleName.VIEWER],
          createdAt: new Date('2026-01-01'),
        },
      ]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('create', () => {
    it('returns the created user plus the one-time temporary password, and never calls revokeAllForUser', async () => {
      usersService.createUser.mockResolvedValue({
        user: {
          id: 'user-2',
          email: 'new@example.com',
          name: 'New Person',
          isActive: true,
          roles: [viewerRole],
          createdAt: new Date('2026-01-01'),
        },
        temporaryPassword: 'Abcdef123456!@',
      });
      const dto = {
        email: 'new@example.com',
        name: 'New Person',
        roles: [RoleName.VIEWER],
      };

      const result = await controller.create(dto as any, actor);

      expect(usersService.createUser).toHaveBeenCalledWith(dto, actor);
      expect(result.temporaryPassword).toBe('Abcdef123456!@');
      expect(result.id).toBe('user-2');
      expect(authService.revokeAllForUser).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('does not revoke tokens for a plain profile update', async () => {
      usersService.updateProfile.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'a@example.com',
          name: 'New Name',
          isActive: true,
          roles: [viewerRole],
          createdAt: new Date('2026-01-01'),
        },
        justDeactivated: false,
      });

      const result = await controller.update(
        'user-1',
        { name: 'New Name' } as any,
        actor,
      );

      expect(authService.revokeAllForUser).not.toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('revokes all refresh tokens exactly when the service reports justDeactivated', async () => {
      usersService.updateProfile.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'a@example.com',
          name: 'A',
          isActive: false,
          roles: [viewerRole],
          createdAt: new Date('2026-01-01'),
        },
        justDeactivated: true,
      });

      await controller.update('user-1', { active: false } as any, actor);

      expect(authService.revokeAllForUser).toHaveBeenCalledWith('user-1');
      expect(authService.revokeAllForUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword (B3)', () => {
    it('returns the user plus the one-time temporary password, and does not separately call revokeAllForUser (revocation is atomic inside the service)', async () => {
      usersService.resetPassword.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'a@example.com',
          name: 'A',
          isActive: true,
          mustChangePassword: true,
          roles: [viewerRole],
          createdAt: new Date('2026-01-01'),
        },
        temporaryPassword: 'Xyz12345678!@',
      });

      const result = await controller.resetPassword('user-1', actor);

      expect(usersService.resetPassword).toHaveBeenCalledWith('user-1', actor);
      expect(result.temporaryPassword).toBe('Xyz12345678!@');
      expect(result.id).toBe('user-1');
      expect(authService.revokeAllForUser).not.toHaveBeenCalled();
    });
  });

  describe('updateRoles', () => {
    it('delegates to the service and maps the result to UserResponseDto', async () => {
      usersService.updateRoles.mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        name: 'A',
        isActive: true,
        roles: [viewerRole],
        createdAt: new Date('2026-01-01'),
      });
      const dto = { roles: [RoleName.VIEWER] };

      const result = await controller.updateRoles('user-1', dto as any, actor);

      expect(usersService.updateRoles).toHaveBeenCalledWith(
        'user-1',
        dto,
        actor,
      );
      expect(result.roles).toEqual([RoleName.VIEWER]);
    });
  });
});
