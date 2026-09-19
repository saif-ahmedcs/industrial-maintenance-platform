import { AssetType } from '../entities/asset-type.entity';

export class AssetTypeResponseDto {
  id: string;
  name: string;
  category: string | null;

  static fromEntity(assetType: AssetType): AssetTypeResponseDto {
    const dto = new AssetTypeResponseDto();
    dto.id = assetType.id;
    dto.name = assetType.name;
    dto.category = assetType.category;
    return dto;
  }
}
