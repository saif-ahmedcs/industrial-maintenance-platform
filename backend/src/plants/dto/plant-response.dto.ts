import { ApiProperty } from '@nestjs/swagger';
import { Plant } from '../entities/plant.entity';

export class PlantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  address: string | null;

  static fromEntity(plant: Plant): PlantResponseDto {
    const dto = new PlantResponseDto();
    dto.id = plant.id;
    dto.name = plant.name;
    dto.address = plant.address;
    return dto;
  }
}
