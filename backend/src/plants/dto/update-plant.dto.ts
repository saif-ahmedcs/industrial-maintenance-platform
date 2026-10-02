import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePlantDto {
  @ApiPropertyOptional({ example: 'Alexandria Plant' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: '123 Industrial Rd' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
