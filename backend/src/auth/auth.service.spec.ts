import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RoleName } from '../users/entities/role.entity';

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

    service = new AuthService(
      usersService as any,
      jwtService as any,
      config as any,
      roleRepo as any,
      refreshTokenRepo as any,
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

    it('rotates: issues a new token and revokes the old one, linked by replacedById', async () => {
      const existingRecord: any = {
        id: 'refresh-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: activeUser,
      };
      refreshTokenRepo.findOne.mockResolvedValue(existingRecord);

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
        user: activeUser,
      };
      refreshTokenRepo.findOne.mockResolvedValue(revokedRecord);

      await expect(service.refresh('stolen-reused-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', revokedAt: expect.anything() },
        { revokedAt: expect.any(Date) },
      );
    });

    it('rejects an expired refresh token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 'refresh-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: activeUser,
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token that does not exist at all', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
