import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';

export class AdjustSparePartDto {
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  @NotEquals(0)
  delta: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
