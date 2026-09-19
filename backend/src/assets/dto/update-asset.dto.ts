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

export class UpdateAssetDto {
  @IsOptional()
  @IsUUID()
  assetTypeId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @IsOptional()
  @IsDateString()
  installedAt?: string;
}
