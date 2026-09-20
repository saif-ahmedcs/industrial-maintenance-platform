import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { MaintenancePlan } from './entities/maintenance-plan.entity';
import { daysFromNow } from '../common/utils/date.util';

const SORTABLE_FIELDS = ['plan.name', 'plan.nextDueAt', 'plan.intervalDays'];

@Injectable()
export class MaintenancePlansService {
  constructor(
    @InjectRepository(MaintenancePlan)
    private readonly planRepo: Repository<MaintenancePlan>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<MaintenancePlan>> {
    const qb = this.planRepo.createQueryBuilder('plan');
    return paginate(qb, query, {
      defaultSortBy: 'plan.name',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }

  async findDue(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<MaintenancePlan>> {
    const { page, limit } = query;
    const qb = this.planRepo
      .createQueryBuilder('plan')
      .where('plan.active = :active', { active: true })
      .andWhere('plan.nextDueAt <= :now', { now: new Date() })
      .orderBy('plan.nextDueAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<MaintenancePlan> {
    const plan = await this.planRepo.findOneBy({ id });
    if (!plan) {
      throw new NotFoundException(`Maintenance plan ${id} not found`);
    }
    return plan;
  }

  async create(
    dto: CreateMaintenancePlanDto,
    actor: RequestUser,
  ): Promise<MaintenancePlan> {
    return this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOneBy(Asset, { id: dto.assetId });
      if (!asset) {
        throw new NotFoundException(`Asset ${dto.assetId} not found`);
      }

      const plan = manager.create(MaintenancePlan, {
        assetId: dto.assetId,
        name: dto.name,
        intervalDays: dto.intervalDays,
        nextDueAt: dto.nextDueAt
          ? new Date(dto.nextDueAt)
          : daysFromNow(dto.intervalDays),
        lastCompletedAt: null,
        active: dto.active ?? true,
      });
      const saved = await manager.save(plan);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'MaintenancePlan',
        entityId: saved.id,
        action: 'CREATE',
        before: null,
        after: {
          assetId: saved.assetId,
          name: saved.name,
          intervalDays: saved.intervalDays,
          nextDueAt: saved.nextDueAt,
          active: saved.active,
        },
        source: 'manual',
      });

      return saved;
    });
  }

  async update(
    id: string,
    dto: UpdateMaintenancePlanDto,
    actor: RequestUser,
  ): Promise<MaintenancePlan> {
    return this.dataSource.transaction(async (manager) => {
      const plan = await manager.findOneBy(MaintenancePlan, { id });
      if (!plan) {
        throw new NotFoundException(`Maintenance plan ${id} not found`);
      }

      const before = {
        name: plan.name,
        intervalDays: plan.intervalDays,
        nextDueAt: plan.nextDueAt,
        active: plan.active,
      };

      if (dto.name !== undefined) plan.name = dto.name;
      if (dto.intervalDays !== undefined) plan.intervalDays = dto.intervalDays;
      if (dto.nextDueAt !== undefined) plan.nextDueAt = new Date(dto.nextDueAt);
      if (dto.active !== undefined) plan.active = dto.active;

      const saved = await manager.save(plan);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'MaintenancePlan',
        entityId: saved.id,
        action: 'UPDATE',
        before,
        after: {
          name: saved.name,
          intervalDays: saved.intervalDays,
          nextDueAt: saved.nextDueAt,
          active: saved.active,
        },
        source: 'manual',
      });

      return saved;
    });
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const plan = await manager.findOneBy(MaintenancePlan, { id });
      if (!plan) {
        throw new NotFoundException(`Maintenance plan ${id} not found`);
      }

      await manager.remove(plan);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'MaintenancePlan',
        entityId: id,
        action: 'DELETE',
        before: {
          assetId: plan.assetId,
          name: plan.name,
          intervalDays: plan.intervalDays,
        },
        after: null,
        source: 'manual',
      });
    });
  }
}
