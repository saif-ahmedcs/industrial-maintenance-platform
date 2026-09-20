import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { MaintenancePlan } from '../../maintenance-plans/entities/maintenance-plan.entity';
import { User } from '../../users/entities/user.entity';
import { WorkOrderPart } from './work-order-part.entity';

export enum WorkOrderStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum WorkOrderSource {
  MANUAL = 'MANUAL',
  PLANNED = 'PLANNED',
  AUTO = 'AUTO',
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('work_orders')
@Index(['assetId'])
@Index(['assetId', 'status'])
@Index(['status'])
@Index(['assignedToUserId'])
@Index(['maintenancePlanId'])
export class WorkOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @ManyToOne(() => MaintenancePlan, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maintenance_plan_id' })
  maintenancePlan: MaintenancePlan | null;

  @Column({ name: 'maintenance_plan_id', type: 'uuid', nullable: true })
  maintenancePlanId: string | null;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    default: WorkOrderStatus.OPEN,
  })
  status: WorkOrderStatus;

  @Column({
    type: 'enum',
    enum: WorkOrderSource,
    default: WorkOrderSource.MANUAL,
  })
  source: WorkOrderSource;

  @Column({
    type: 'enum',
    enum: WorkOrderPriority,
    default: WorkOrderPriority.MEDIUM,
  })
  priority: WorkOrderPriority;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser: User | null;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn({ name: 'opened_at' })
  openedAt: Date;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({
    name: 'total_cost',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalCost: number | null;

  @OneToMany(() => WorkOrderPart, (part) => part.workOrder)
  workOrderParts: WorkOrderPart[];
}
