import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty()
  @IsUUID()
  sparePartId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantityUsed: number;
}

export class CompleteWorkOrderDto {
  @ApiPropertyOptional({
    type: () => CompleteWorkOrderPartDto,
    isArray: true,
    description:
      'Spare parts consumed to complete this work order. Each is locked and decremented inside the same transaction as the completion; insufficient stock on any part rolls back the whole completion.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteWorkOrderPartDto)
  parts?: CompleteWorkOrderPartDto[];
}
