import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'WorkOrder' })
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Null for system/auto-generated entries',
  })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({ example: 'COMPLETE' })
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({
    example: 'manual',
    description: '"manual" or "auto:condition-monitoring"',
  })
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601, inclusive lower bound on createdAt',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601, inclusive upper bound on createdAt',
  })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
