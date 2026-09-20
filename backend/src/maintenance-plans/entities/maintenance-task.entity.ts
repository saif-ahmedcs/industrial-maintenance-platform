import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MaintenancePlan } from './maintenance-plan.entity';

@Entity('maintenance_tasks')
@Index(['planId'])
export class MaintenanceTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MaintenancePlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: MaintenancePlan;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @Column()
  description: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;
}
