import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMaintenancePlanDto {
  @IsUUID()
  assetId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsInt()
  @Min(1)
  @Max(3650)
  intervalDays: number;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
