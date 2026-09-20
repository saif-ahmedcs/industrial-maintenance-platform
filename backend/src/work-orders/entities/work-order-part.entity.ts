import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { SparePart } from '../../inventory/entities/spare-part.entity';
import { WorkOrder } from './work-order.entity';

@Entity('work_order_parts')
@Index(['workOrderId'])
@Index(['sparePartId'])
export class WorkOrderPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkOrder, (workOrder) => workOrder.workOrderParts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId: string;

  @ManyToOne(() => SparePart, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'spare_part_id' })
  sparePart: SparePart;

  @Column({ name: 'spare_part_id', type: 'uuid' })
  sparePartId: string;

  @Column({ name: 'quantity_used', type: 'int' })
  quantityUsed: number;

  @Column({
    name: 'unit_cost_at_completion',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitCostAtCompletion: number;
}
