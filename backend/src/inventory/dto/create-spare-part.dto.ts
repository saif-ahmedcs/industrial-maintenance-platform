import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSparePartDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sku: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  initialQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  reorderThreshold?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  unitCost: number;
}
