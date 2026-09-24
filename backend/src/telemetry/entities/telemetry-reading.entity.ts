import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('telemetry_readings')
@Index(['assetId', 'recordedAt'])
export class TelemetryReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: decimalTransformer,
  })
  temperature: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: decimalTransformer,
  })
  vibration: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: decimalTransformer,
  })
  pressure: number;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'ingested_at', type: 'timestamptz' })
  ingestedAt: Date;
}
