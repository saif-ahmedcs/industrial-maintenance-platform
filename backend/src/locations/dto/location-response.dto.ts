import { Location } from '../entities/location.entity';

export class LocationResponseDto {
  id: string;
  plantId: string;
  name: string;
  parentLocationId: string | null;

  static fromEntity(location: Location): LocationResponseDto {
    const dto = new LocationResponseDto();
    dto.id = location.id;
    dto.plantId = location.plantId;
    dto.name = location.name;
    dto.parentLocationId = location.parentLocationId;
    return dto;
  }
}
