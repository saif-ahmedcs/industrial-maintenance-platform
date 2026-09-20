import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';

@Entity('maintenance_plans')
@Index(['assetId'])
@Index(['nextDueAt'])
export class MaintenancePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @Column()
  name: string;

  @Column({ name: 'interval_days', type: 'int' })
  intervalDays: number;

  @Column({ name: 'last_completed_at', type: 'timestamp', nullable: true })
  lastCompletedAt: Date | null;

  @Column({ name: 'next_due_at', type: 'timestamp', nullable: true })
  nextDueAt: Date | null;

  @Column({ default: true })
  active: boolean;
}
