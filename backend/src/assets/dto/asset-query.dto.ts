import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'Case-insensitive partial match against the asset tag',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter to assets at this location' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Filter to assets of this asset type' })
  @IsOptional()
  @IsUUID()
  assetTypeId?: string;
}
