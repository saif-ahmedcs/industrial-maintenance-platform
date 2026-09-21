import { InventoryTransaction } from '../entities/inventory-transaction.entity';

export class InventoryTransactionResponseDto {
  id: string;
  sparePartId: string;
  deltaQuantity: number;
  reason: string;
  workOrderId: string | null;
  createdByUserId: string | null;
  resultingQuantity: number;
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
