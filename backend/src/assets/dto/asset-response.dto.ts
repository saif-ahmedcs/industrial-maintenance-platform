import { Asset } from '../entities/asset.entity';

export class AssetResponseDto {
  id: string;
  assetTypeId: string;
  locationId: string;
  tag: string;
  manufacturer: string | null;
  model: string | null;
  criticality: string;
  status: string;
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
