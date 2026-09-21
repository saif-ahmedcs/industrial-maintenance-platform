import { SparePart } from '../entities/spare-part.entity';

export class SparePartResponseDto {
  id: string;
  sku: string;
  name: string;
  quantityOnHand: number;
  reorderThreshold: number;
  unitCost: number;
  isLowStock: boolean;

  static fromEntity(part: SparePart): SparePartResponseDto {
    const dto = new SparePartResponseDto();
    dto.id = part.id;
    dto.sku = part.sku;
    dto.name = part.name;
    dto.quantityOnHand = part.quantityOnHand;
    dto.reorderThreshold = part.reorderThreshold;
    dto.unitCost = part.unitCost;
    dto.isLowStock = part.quantityOnHand <= part.reorderThreshold;
    return dto;
  }
}
