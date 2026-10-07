import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { AssetStatus } from '../entities/asset.entity';

export class AssetQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: AssetStatus,
    description: 'Filter to assets with this status',
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}
