import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Plant } from '../../plants/entities/plant.entity';
import { Asset } from '../../assets/entities/asset.entity';

@Entity('locations')
@Index(['plantId'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Plant, (plant) => plant.locations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plant_id' })
  plant: Plant;

  @Column({ name: 'plant_id', type: 'uuid' })
  plantId: string;

  @Column()
  name: string;

  @ManyToOne(() => Location, (location) => location.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_location_id' })
  parentLocation: Location | null;

  @Column({ name: 'parent_location_id', type: 'uuid', nullable: true })
  parentLocationId: string | null;

  @OneToMany(() => Location, (location) => location.parentLocation)
  children: Location[];

  @OneToMany(() => Asset, (asset) => asset.location)
  assets: Asset[];
}
