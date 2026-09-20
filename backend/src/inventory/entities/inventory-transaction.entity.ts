import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkOrder } from '../../work-orders/entities/work-order.entity';
import { SparePart } from './spare-part.entity';

export enum InventoryTransactionReason {
  CONSUMED = 'CONSUMED',
  RESTOCK = 'RESTOCK',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('inventory_transactions')
@Index(['sparePartId'])
@Index(['workOrderId'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SparePart, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'spare_part_id' })
  sparePart: SparePart;

  @Column({ name: 'spare_part_id', type: 'uuid' })
  sparePartId: string;

  @Column({ name: 'delta_quantity', type: 'int' })
  deltaQuantity: number;

  @Column({ type: 'enum', enum: InventoryTransactionReason })
  reason: InventoryTransactionReason;

  @ManyToOne(() => WorkOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder | null;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ name: 'resulting_quantity', type: 'int' })
  resultingQuantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
