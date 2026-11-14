import { ApiProperty } from '@nestjs/swagger';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';

export class InventoryTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sparePartId: string;

  @ApiProperty({
    description: 'Positive for restock, negative for consumption',
  })
  deltaQuantity: number;

  @ApiProperty({ enum: ['CONSUMED', 'RESTOCK', 'ADJUSTMENT'] })
  reason: string;

  @ApiProperty({ nullable: true })
  workOrderId: string | null;

  @ApiProperty({
    nullable: true,
    description: 'User who performed this stock movement',
  })
  createdByUserId: string | null;

  @ApiProperty({
    description: 'quantityOnHand immediately before this transaction',
  })
  quantityBefore: number;

  @ApiProperty({
    description: 'quantityOnHand immediately after this transaction',
  })
  quantityAfter: number;

  @ApiProperty({
    description:
      'Deprecated alias for quantityAfter, retained for existing API consumers',
  })
  resultingQuantity: number;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(tx: InventoryTransaction): InventoryTransactionResponseDto {
    const dto = new InventoryTransactionResponseDto();
    dto.id = tx.id;
    dto.sparePartId = tx.sparePartId;
    dto.deltaQuantity = tx.deltaQuantity;
    dto.reason = tx.reason;
    dto.workOrderId = tx.workOrderId;
    dto.createdByUserId = tx.createdByUserId;
    dto.quantityBefore = tx.resultingQuantity - tx.deltaQuantity;
    dto.quantityAfter = tx.resultingQuantity;
    dto.resultingQuantity = tx.resultingQuantity;
    dto.createdAt = tx.createdAt;
    return dto;
  }
}
