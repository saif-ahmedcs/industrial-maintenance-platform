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

  @ApiProperty({ nullable: true })
  createdByUserId: string | null;

  @ApiProperty({
    description: 'quantityOnHand snapshot immediately after this transaction',
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
    dto.resultingQuantity = tx.resultingQuantity;
    dto.createdAt = tx.createdAt;
    return dto;
  }
}
