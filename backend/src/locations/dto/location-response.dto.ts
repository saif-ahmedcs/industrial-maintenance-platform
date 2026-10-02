import { ApiProperty } from '@nestjs/swagger';
import { Location } from '../entities/location.entity';

export class LocationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  plantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    nullable: true,
    description: 'Parent location, for nested areas',
  })
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
