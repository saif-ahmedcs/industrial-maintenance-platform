import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WorkOrderPriority } from '../entities/work-order.entity';

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({ example: 'Pump bearing making unusual noise' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    enum: WorkOrderPriority,
    default: WorkOrderPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({
    description: 'If set, this work order is created with source=PLANNED',
  })
  @IsOptional()
  @IsUUID()
  maintenancePlanId?: string;
}
