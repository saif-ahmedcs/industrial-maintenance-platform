import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CompleteWorkOrderPartDto {
  @IsUUID()
  sparePartId: string;

  @IsInt()
  @Min(1)
  quantityUsed: number;
}

export class CompleteWorkOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteWorkOrderPartDto)
  parts?: CompleteWorkOrderPartDto[];
}
