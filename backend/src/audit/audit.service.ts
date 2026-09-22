import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditLog } from './entities/audit-log.entity';

export interface RecordAuditLogParams {
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  source: string;
}

const SORTABLE_FIELDS = ['audit.createdAt', 'audit.entityType', 'audit.action'];

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async record(
    manager: EntityManager,
    params: RecordAuditLogParams,
  ): Promise<AuditLog> {
    const entry = manager.create(AuditLog, {
      actorUserId: params.actorUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      before: params.before ?? null,
      after: params.after ?? null,
      source: params.source,
    });

    return manager.save(entry);
  }

  async findAll(query: AuditQueryDto): Promise<PaginatedResult<AuditLog>> {
    const qb = this.auditLogRepo.createQueryBuilder('audit');

    if (query.entityType) {
      qb.andWhere('audit.entityType = :entityType', {
        entityType: query.entityType,
      });
    }
    if (query.entityId) {
      qb.andWhere('audit.entityId = :entityId', { entityId: query.entityId });
    }
    if (query.actorUserId) {
      qb.andWhere('audit.actorUserId = :actorUserId', {
        actorUserId: query.actorUserId,
      });
    }
    if (query.action) {
      qb.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.source) {
      qb.andWhere('audit.source = :source', { source: query.source });
    }
    if (query.dateFrom) {
      qb.andWhere('audit.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo) {
      qb.andWhere('audit.createdAt <= :dateTo', { dateTo: query.dateTo });
    }

    return paginate(qb, query, {
      defaultSortBy: 'audit.createdAt',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }
}
