import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class RestockSparePartDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity: number;
}
