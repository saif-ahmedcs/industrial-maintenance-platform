import { Plant } from '../entities/plant.entity';

export class PlantResponseDto {
  id: string;
  name: string;
  address: string | null;

  static fromEntity(plant: Plant): PlantResponseDto {
    const dto = new PlantResponseDto();
    dto.id = plant.id;
    dto.name = plant.name;
    dto.address = plant.address;
    return dto;
  }
}
