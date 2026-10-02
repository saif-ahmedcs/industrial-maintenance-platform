import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({
    description:
      'Signed change to apply, e.g. -3 for a correction found during a stock count',
  })
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  @NotEquals(0)
  delta: number;

  @ApiProperty({
    example: 'Physical count discrepancy found during cycle count',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
