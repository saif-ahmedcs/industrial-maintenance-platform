import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('spare_parts')
@Check('CHK_spare_parts_quantity_non_negative', '"quantity_on_hand" >= 0')
@Check(
  'CHK_spare_parts_reorder_threshold_non_negative',
  '"reorder_threshold" >= 0',
)
@Check('CHK_spare_parts_unit_cost_non_negative', '"unit_cost" >= 0')
export class SparePart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column({ name: 'quantity_on_hand', type: 'int', default: 0 })
  quantityOnHand: number;

  @Column({ name: 'reorder_threshold', type: 'int', default: 0 })
  reorderThreshold: number;

  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitCost: number;
}
