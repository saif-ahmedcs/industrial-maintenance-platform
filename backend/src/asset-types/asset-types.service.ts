import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { CreateAssetTypeDto } from './dto/create-asset-type.dto';
import { UpdateAssetTypeDto } from './dto/update-asset-type.dto';
import { AssetType } from './entities/asset-type.entity';

const SORTABLE_FIELDS = ['assetType.name'];

@Injectable()
export class AssetTypesService {
  constructor(
    @InjectRepository(AssetType)
    private readonly assetTypeRepo: Repository<AssetType>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<AssetType>> {
    const qb = this.assetTypeRepo.createQueryBuilder('assetType');
    return paginate(qb, query, {
      defaultSortBy: 'assetType.name',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }

  async findOne(id: string): Promise<AssetType> {
    const assetType = await this.assetTypeRepo.findOneBy({ id });
    if (!assetType) {
      throw new NotFoundException(`Asset type ${id} not found`);
    }
    return assetType;
  }

  async create(
    dto: CreateAssetTypeDto,
    actor: RequestUser,
  ): Promise<AssetType> {
    return this.dataSource.transaction(async (manager) => {
      const assetType = manager.create(AssetType, dto);
      const saved = await manager.save(assetType);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'AssetType',
        entityId: saved.id,
        action: 'CREATE',
        before: null,
        after: { name: saved.name, category: saved.category },
        source: 'manual',
      });

      return saved;
    });
  }

  async update(
    id: string,
    dto: UpdateAssetTypeDto,
    actor: RequestUser,
  ): Promise<AssetType> {
    return this.dataSource.transaction(async (manager) => {
      const assetType = await manager.findOneBy(AssetType, { id });
      if (!assetType) {
        throw new NotFoundException(`Asset type ${id} not found`);
      }

      const before = { name: assetType.name, category: assetType.category };
      Object.assign(assetType, dto);
      const saved = await manager.save(assetType);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'AssetType',
        entityId: saved.id,
        action: 'UPDATE',
        before,
        after: { name: saved.name, category: saved.category },
        source: 'manual',
      });

      return saved;
    });
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const assetType = await manager.findOneBy(AssetType, { id });
      if (!assetType) {
        throw new NotFoundException(`Asset type ${id} not found`);
      }

      await manager.remove(assetType);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'AssetType',
        entityId: id,
        action: 'DELETE',
        before: { name: assetType.name, category: assetType.category },
        after: null,
        source: 'manual',
      });
    });
  }
}
