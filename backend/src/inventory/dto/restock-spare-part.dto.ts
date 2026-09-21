import { IsInt, Max, Min } from 'class-validator';

export class RestockSparePartDto {
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity: number;
}
