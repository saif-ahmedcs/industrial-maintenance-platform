import { ApiProperty } from '@nestjs/swagger';
import { Asset } from '../entities/asset.entity';

export class AssetResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  assetTypeId: string;

  @ApiProperty()
  locationId: string;

  @ApiProperty()
  tag: string;

  @ApiProperty({ nullable: true })
  manufacturer: string | null;

  @ApiProperty({ nullable: true })
  model: string | null;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  criticality: string;

  @ApiProperty({
    enum: ['OPERATIONAL', 'UNDER_MAINTENANCE', 'CRITICAL', 'DECOMMISSIONED'],
  })
  status: string;

  @ApiProperty({ nullable: true })
  installedAt: Date | null;

  static fromEntity(asset: Asset): AssetResponseDto {
    const dto = new AssetResponseDto();
    dto.id = asset.id;
    dto.assetTypeId = asset.assetTypeId;
    dto.locationId = asset.locationId;
    dto.tag = asset.tag;
    dto.manufacturer = asset.manufacturer;
    dto.model = asset.model;
    dto.criticality = asset.criticality;
    dto.status = asset.status;
    dto.installedAt = asset.installedAt;
    return dto;
  }
}
