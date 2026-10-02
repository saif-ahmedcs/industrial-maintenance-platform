import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AssetCriticality } from '../entities/asset.entity';

export class CreateAssetDto {
  @ApiProperty()
  @IsUUID()
  assetTypeId: string;

  @ApiProperty()
  @IsUUID()
  locationId: string;

  @ApiProperty({ example: 'PUMP-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  tag: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @ApiPropertyOptional({
    enum: AssetCriticality,
    default: AssetCriticality.MEDIUM,
  })
  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  installedAt?: string;
}
