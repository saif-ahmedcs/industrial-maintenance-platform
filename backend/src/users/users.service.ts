import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { generateTemporaryPassword } from '../common/utils/generate-temporary-password';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { Role, RoleName } from './entities/role.entity';
import { User } from './entities/user.entity';

const BCRYPT_SALT_ROUNDS = 10;

const SORTABLE_FIELDS = ['user.email', 'user.name', 'user.createdAt'];

export interface CreatedUser {
  user: User;
  temporaryPassword: string;
}

export interface UpdatedProfile {
  user: User;
  justDeactivated: boolean;
}

export interface ResetPasswordResult {
  user: User;
  temporaryPassword: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  create(partial: Partial<User>): User {
    return this.userRepo.create(partial);
  }

  save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  /* GET /users */
  async findAllPaginated(query: UserQueryDto): Promise<PaginatedResult<User>> {
    const qb = this.userRepo.createQueryBuilder('user');

    if (query.active !== undefined) {
      qb.andWhere('user.isActive = :active', { active: query.active });
    }
    if (query.role) {
      qb.innerJoin('user.roles', 'roleFilter', 'roleFilter.name = :role', {
        role: query.role,
      });
    }

    const result = await paginate(qb, query, {
      defaultSortBy: 'user.email',
      allowedSortFields: SORTABLE_FIELDS,
    });

    return { ...result, data: await this.withRoles(result.data) };
  }

  private async withRoles(users: User[]): Promise<User[]> {
    if (users.length === 0) {
      return users;
    }
    const ids = users.map((user) => user.id);
    const fullyLoaded = await this.userRepo.find({ where: { id: In(ids) } });
    const byId = new Map(fullyLoaded.map((user) => [user.id, user]));
    return ids.map((id) => byId.get(id)!);
  }

  /* POST /users */
  async createUser(
    dto: CreateUserDto,
    actor: RequestUser,
  ): Promise<CreatedUser> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(User, {
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      const roles = await this.resolveRoles(manager, dto.roles);

      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(
        temporaryPassword,
        BCRYPT_SALT_ROUNDS,
      );

      const user = manager.create(User, {
        email: dto.email,
        name: dto.name,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        roles,
      });
      const saved = await manager.save(user);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'User',
        entityId: saved.id,
        action: 'CREATE',
        before: null,
        after: {
          email: saved.email,
          name: saved.name,
          roles: roles.map((role) => role.name),
        },
        source: 'manual',
      });

      return { user: saved, temporaryPassword };
    });
  }

  /* PATCH /users/:id */
  async updateProfile(
    id: string,
    dto: UpdateUserDto,
    actor: RequestUser,
  ): Promise<UpdatedProfile> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id } });
      if (!user) {
        throw new NotFoundException(`User ${id} not found`);
      }

      const willDeactivate = dto.active === false && user.isActive;
      if (willDeactivate) {
        await this.assertNotLastActiveAdmin(manager, user);
      }

      const before = { name: user.name, isActive: user.isActive };
      if (dto.name !== undefined) {
        user.name = dto.name;
      }
      if (dto.active !== undefined) {
        user.isActive = dto.active;
      }
      const saved = await manager.save(user);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'User',
        entityId: saved.id,
        action: 'UPDATE',
        before,
        after: { name: saved.name, isActive: saved.isActive },
        source: 'manual',
      });

      return { user: saved, justDeactivated: willDeactivate };
    });
  }

  /* POST /users/:id/reset-password */
  async resetPassword(
    id: string,
    actor: RequestUser,
  ): Promise<ResetPasswordResult> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id } });
      if (!user) {
        throw new NotFoundException(`User ${id} not found`);
      }

      const temporaryPassword = generateTemporaryPassword();
      user.passwordHash = await bcrypt.hash(
        temporaryPassword,
        BCRYPT_SALT_ROUNDS,
      );
      user.mustChangePassword = true;
      const saved = await manager.save(user);

      await manager
        .getRepository(RefreshToken)
        .update(
          { userId: saved.id, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'User',
        entityId: saved.id,
        action: 'PASSWORD_RESET',
        before: null,
        after: { mustChangePassword: true },
        source: 'manual',
      });

      return { user: saved, temporaryPassword };
    });
  }

  /* PUT /users/:id/roles */
  async updateRoles(
    id: string,
    dto: UpdateUserRolesDto,
    actor: RequestUser,
  ): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id } });
      if (!user) {
        throw new NotFoundException(`User ${id} not found`);
      }

      const uniqueRoleNames = Array.from(new Set(dto.roles));
      const newRoles = await this.resolveRoles(manager, uniqueRoleNames);

      const willRemoveAdmin =
        user.isActive && !uniqueRoleNames.includes(RoleName.ADMIN);
      if (willRemoveAdmin) {
        await this.assertNotLastActiveAdmin(manager, user);
      }

      const before = { roles: user.roles.map((role) => role.name) };
      user.roles = newRoles;
      const saved = await manager.save(user);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'User',
        entityId: saved.id,
        action: 'ROLES_UPDATE',
        before,
        after: { roles: saved.roles.map((role) => role.name) },
        source: 'manual',
      });

      return saved;
    });
  }

  private async resolveRoles(
    manager: EntityManager,
    roleNames: RoleName[],
  ): Promise<Role[]> {
    const uniqueRoleNames = Array.from(new Set(roleNames));
    const roles = await manager.find(Role, {
      where: { name: In(uniqueRoleNames) },
    });
    if (roles.length !== uniqueRoleNames.length) {
      throw new NotFoundException(
        'One or more roles are not seeded. Run migrations first.',
      );
    }
    return roles;
  }

  /* Guard */
  private async assertNotLastActiveAdmin(
    manager: EntityManager,
    user: User,
  ): Promise<void> {
    const isCurrentlyActiveAdmin =
      user.isActive && user.roles.some((role) => role.name === RoleName.ADMIN);
    if (!isCurrentlyActiveAdmin) {
      return;
    }

    const otherActiveAdmins = await this.countActiveAdmins(manager, user.id);
    if (otherActiveAdmins === 0) {
      throw new ConflictException('At least one active admin is required.');
    }
  }

  private async countActiveAdmins(
    manager: EntityManager,
    excludeUserId?: string,
  ): Promise<number> {
    const qb = manager
      .createQueryBuilder(User, 'user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :adminRole', { adminRole: RoleName.ADMIN })
      .andWhere('user.isActive = true');

    if (excludeUserId) {
      qb.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    return qb.getCount();
  }
}
