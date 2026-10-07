import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class MaintenancePlanQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter to plans for a single asset',
  })
  @IsOptional()
  @IsUUID()
  assetId?: string;
}
