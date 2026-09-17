import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { Role, RoleName } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async register(email: string, password: string): Promise<User> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const defaultRole = await this.roleRepo.findOne({
      where: { name: RoleName.VIEWER },
    });
    if (!defaultRole) {
      throw new Error('Default role VIEWER is not seeded');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = this.usersService.create({
      email,
      passwordHash,
      isActive: true,
      roles: [defaultRole],
    });

    return this.usersService.save(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? user : null;
  }

  async login(user: User): Promise<AuthTokens> {
    const accessToken = this.signAccessToken(user);
    const { token: refreshToken } = await this.issueRefreshToken(user.id);
    return { accessToken, refreshToken };
  }

  async refresh(presentedToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(presentedToken);
    const existing = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.revokeAllForUser(existing.userId);
      throw new UnauthorizedException('Refresh token has already been used');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = existing.user;
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is no longer active');
    }

    const { token: newRefreshToken, record: newRecord } =
      await this.issueRefreshToken(user.id);

    existing.revokedAt = new Date();
    existing.replacedById = newRecord.id;
    await this.refreshTokenRepo.save(existing);

    const accessToken = this.signAccessToken(user);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(presentedToken: string): Promise<void> {
    const tokenHash = this.hashToken(presentedToken);
    let current = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
    if (!current) return;

    while (current.revokedAt && current.replacedById) {
      const next = await this.refreshTokenRepo.findOne({
        where: { id: current.replacedById },
      });
      if (!next) break;
      current = next;
    }

    if (!current.revokedAt) {
      current.revokedAt = new Date();
      await this.refreshTokenRepo.save(current);
    }
  }

  private signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
    };
    return this.jwtService.sign(payload, {
      expiresIn: this.config.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as StringValue,
    });
  }

  private async issueRefreshToken(
    userId: string,
  ): Promise<{ token: string; record: RefreshToken }> {
    const token = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(token);
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const record = this.refreshTokenRepo.create({
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      replacedById: null,
    });
    await this.refreshTokenRepo.save(record);

    return { token, record };
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
