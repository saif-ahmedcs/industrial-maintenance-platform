import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAssetTypeDto {
  @ApiProperty({ example: 'Pump' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Rotating equipment' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  category?: string;
}
