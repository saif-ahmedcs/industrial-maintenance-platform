import { ApiProperty } from '@nestjs/swagger';
import { SparePart } from '../entities/spare-part.entity';

export class SparePartResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description:
      'Current stock, reconstructable by summing inventory_transactions deltas',
  })
  quantityOnHand: number;

  @ApiProperty()
  reorderThreshold: number;

  @ApiProperty()
  unitCost: number;

  @ApiProperty({ description: 'Derived: quantityOnHand <= reorderThreshold' })
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
