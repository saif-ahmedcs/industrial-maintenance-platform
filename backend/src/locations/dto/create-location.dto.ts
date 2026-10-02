import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLocationDto {
  @ApiProperty()
  @IsUUID()
  plantId: string;

  @ApiProperty({ example: 'Main Hall' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Parent location, for nested areas' })
  @IsOptional()
  @IsUUID()
  parentLocationId?: string;
}
