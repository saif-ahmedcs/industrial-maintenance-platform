import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asset, AssetStatus } from '../../assets/entities/asset.entity';
import { User } from '../../users/entities/user.entity';

@Entity('asset_state_history')
@Index(['assetId'])
@Index(['assetId', 'changedAt'])
export class AssetStateHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @Column({ name: 'previous_status', type: 'enum', enum: AssetStatus })
  previousStatus: AssetStatus;

  @Column({ name: 'new_status', type: 'enum', enum: AssetStatus })
  newStatus: AssetStatus;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser: User | null;

  @Column({ name: 'changed_by_user_id', type: 'uuid', nullable: true })
  changedByUserId: string | null;

  @Column()
  source: string;
}
