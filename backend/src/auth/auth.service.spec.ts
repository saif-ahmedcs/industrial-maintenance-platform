import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RoleName } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let config: { get: jest.Mock };
  let roleRepo: { findOne: jest.Mock };
  let refreshTokenRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  let lockQb: { setLock: jest.Mock; where: jest.Mock; getOne: jest.Mock };
  let manager: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    getRepository: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let rolledBack: boolean;

  const viewerRole = { id: 'role-viewer', name: RoleName.VIEWER };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn((partial) => partial),
      save: jest.fn(async (user) => ({ id: 'user-1', ...user })),
    };
    jwtService = { sign: jest.fn(() => 'signed.jwt.token') };
    config = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN_DAYS: 7,
        };
        return values[key];
      }),
    };
    roleRepo = { findOne: jest.fn(async () => viewerRole) };
    refreshTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn((partial) => partial),
      // Mimic TypeORM: save() assigns a generated id back onto the same
      // object reference when one isn't set yet, and always returns it.
      save: jest.fn(async (record) => {
        if (!record.id) {
          record.id = `generated-${Math.random().toString(36).slice(2)}`;
        }
        return record;
      }),
      update: jest.fn(async () => undefined),
    };

    lockQb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    manager = {
      createQueryBuilder: jest.fn(() => lockQb),
      findOne: jest.fn(),
      save: jest.fn(async (record) => record),
      getRepository: jest.fn(() => refreshTokenRepo),
    };
    rolledBack = false;
    dataSource = {
      transaction: jest.fn(async (cb) => {
        try {
          return await cb(manager);
        } catch (err) {
          rolledBack = true;
          throw err;
        }
      }),
    };

    service = new AuthService(
      usersService as any,
      jwtService as any,
      config as any,
      roleRepo as any,
      refreshTokenRepo as any,
      dataSource as any,
    );
  });

  describe('register', () => {
    it('hashes the password and never stores it in plaintext', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const user = await service.register('new@example.com', 'plaintext-pw');

      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('plaintext-pw');
      await expect(
        bcrypt.compare('plaintext-pw', user.passwordHash),
      ).resolves.toBe(true);
    });

    it('throws a ConflictException if the email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register('dup@example.com', 'password123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser (round-trip with register)', () => {
    it('accepts the correct password against a stored hash', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        passwordHash,
      });

      const result = await service.validateUser(
        'user@example.com',
        'correct-password',
      );
      expect(result?.id).toBe('user-1');
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        passwordHash,
      });

      const result = await service.validateUser(
        'user@example.com',
        'wrong-password',
      );
      expect(result).toBeNull();
    });

    it('rejects an inactive user even with the correct password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        isActive: false,
        passwordHash,
      });

      const result = await service.validateUser(
        'user@example.com',
        'correct-password',
      );
      expect(result).toBeNull();
    });
  });

  describe('refresh', () => {
    const activeUser = {
      id: 'user-1',
      isActive: true,
      email: 'user@example.com',
      roles: [viewerRole],
    };

    beforeEach(() => {
      manager.findOne.mockResolvedValue(activeUser);
    });

    it('rotates: issues a new token and revokes the old one, linked by replacedById', async () => {
      const existingRecord: any = {
        id: 'refresh-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };
      lockQb.getOne.mockResolvedValue(existingRecord);

      const result = await service.refresh('some-presented-token');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toBeDefined();
      expect(existingRecord.revokedAt).not.toBeNull();
      expect(existingRecord.replacedById).toBeDefined();
    });

    it('rejects and revokes the whole chain when a reused (already-revoked) refresh token is presented', async () => {
      const revokedRecord = {
        id: 'refresh-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };
      lockQb.getOne.mockResolvedValue(revokedRecord);

      await expect(service.refresh('stolen-reused-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', revokedAt: expect.anything() },
        { revokedAt: expect.any(Date) },
      );
    });

    it('rejects an expired refresh token', async () => {
      lockQb.getOne.mockResolvedValue({
        id: 'refresh-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token that does not exist at all', async () => {
      lockQb.getOne.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('locks the presented token row (pessimistic_write) inside a transaction', async () => {
      lockQb.getOne.mockResolvedValue({
        id: 'refresh-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await service.refresh('some-presented-token');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.createQueryBuilder).toHaveBeenCalledWith(
        RefreshToken,
        'token',
      );
      expect(lockQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'refresh-1',
          revokedAt: expect.any(Date),
        }),
      );
    });

    it('commits the family revocation on reuse instead of rolling it back', async () => {
      lockQb.getOne.mockResolvedValue({
        id: 'refresh-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('stolen-reused-token')).rejects.toThrow(
        'Refresh token has already been used',
      );

      expect(refreshTokenRepo.update).toHaveBeenCalled();
      // Throwing inside the transaction would roll the revocation back.
      expect(rolledBack).toBe(false);
    });

    it('loads the user separately and rejects an inactive account', async () => {
      lockQb.getOne.mockResolvedValue({
        id: 'refresh-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      manager.findOne.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(service.refresh('some-presented-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(manager.findOne).toHaveBeenCalledWith(User, {
        where: { id: 'user-1' },
      });
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
