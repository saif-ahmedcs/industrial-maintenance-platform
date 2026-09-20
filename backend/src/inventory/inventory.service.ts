import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  InventoryTransaction,
  InventoryTransactionReason,
} from './entities/inventory-transaction.entity';
import { SparePart } from './entities/spare-part.entity';

export interface ConsumeContext {
  workOrderId?: string | null;
  createdByUserId: string | null;
}

export interface ConsumeResult {
  sparePart: SparePart;
  transaction: InventoryTransaction;
}

@Injectable()
export class InventoryService {
  async consume(
    manager: EntityManager,
    sparePartId: string,
    quantity: number,
    context: ConsumeContext,
  ): Promise<ConsumeResult> {
    const sparePart = await manager
      .createQueryBuilder(SparePart, 'part')
      .setLock('pessimistic_write')
      .where('part.id = :id', { id: sparePartId })
      .getOne();

    if (!sparePart) {
      throw new NotFoundException(`Spare part ${sparePartId} not found`);
    }

    if (sparePart.quantityOnHand < quantity) {
      throw new ConflictException(
        `Insufficient stock for spare part ${sparePart.sku}: requested ${quantity}, available ${sparePart.quantityOnHand}`,
      );
    }

    sparePart.quantityOnHand -= quantity;
    const savedPart = await manager.save(sparePart);

    const transaction = manager.create(InventoryTransaction, {
      sparePartId: savedPart.id,
      deltaQuantity: -quantity,
      reason: InventoryTransactionReason.CONSUMED,
      workOrderId: context.workOrderId ?? null,
      createdByUserId: context.createdByUserId,
      resultingQuantity: savedPart.quantityOnHand,
    });
    const savedTransaction = await manager.save(transaction);

    return { sparePart: savedPart, transaction: savedTransaction };
  }
}
