import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssetType } from '../../asset-types/entities/asset-type.entity';
import { Location } from '../../locations/entities/location.entity';

export enum AssetCriticality {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AssetStatus {
  OPERATIONAL = 'OPERATIONAL',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  CRITICAL = 'CRITICAL',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

@Entity('assets')
@Index(['locationId'])
@Index(['assetTypeId'])
@Index(['locationId', 'status'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AssetType, (assetType) => assetType.assets, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'asset_type_id' })
  assetType: AssetType;

  @Column({ name: 'asset_type_id', type: 'uuid' })
  assetTypeId: string;

  @ManyToOne(() => Location, (location) => location.assets, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId: string;

  @Column({ unique: true })
  tag: string;

  @Column({ type: 'varchar', nullable: true })
  manufacturer: string | null;

  @Column({ type: 'varchar', nullable: true })
  model: string | null;

  @Column({
    type: 'enum',
    enum: AssetCriticality,
    default: AssetCriticality.MEDIUM,
  })
  criticality: AssetCriticality;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.OPERATIONAL,
  })
  status: AssetStatus;

  @Column({ name: 'installed_at', type: 'timestamp', nullable: true })
  installedAt: Date | null;
}
