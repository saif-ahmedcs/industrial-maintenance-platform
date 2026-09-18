import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginationQueryDto } from './pagination-query.dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginateOptions {
  defaultSortBy: string;
  allowedSortFields: string[];
}

export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
  options: PaginateOptions,
): Promise<PaginatedResult<T>> {
  const { page, limit } = query;
  const sortDir: 'ASC' | 'DESC' =
    query.sortDir.toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const sortBy =
    query.sortBy && options.allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : options.defaultSortBy;

  qb.orderBy(sortBy, sortDir)
    .skip((page - 1) * limit)
    .take(limit);

  const [data, total] = await qb.getManyAndCount();

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
