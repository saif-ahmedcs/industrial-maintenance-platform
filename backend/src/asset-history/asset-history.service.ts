import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { AssetStatus } from '../assets/entities/asset.entity';
import { AssetStateHistory } from './entities/asset-state-history.entity';

export interface RecordAssetStateChangeParams {
  assetId: string;
  previousStatus: AssetStatus;
  newStatus: AssetStatus;
  changedByUserId: string | null;
  source: string;
}

const SORTABLE_FIELDS = ['history.changedAt'];

@Injectable()
export class AssetHistoryService {
  constructor(
    @InjectRepository(AssetStateHistory)
    private readonly historyRepo: Repository<AssetStateHistory>,
  ) {}

  async record(
    manager: EntityManager,
    params: RecordAssetStateChangeParams,
  ): Promise<AssetStateHistory> {
    const entry = manager.create(AssetStateHistory, {
      assetId: params.assetId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      changedByUserId: params.changedByUserId,
      source: params.source,
    });

    return manager.save(entry);
  }

  async findByAsset(
    assetId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<AssetStateHistory>> {
    const qb = this.historyRepo
      .createQueryBuilder('history')
      .where('history.assetId = :assetId', { assetId });

    return paginate(qb, query, {
      defaultSortBy: 'history.changedAt',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }
}
