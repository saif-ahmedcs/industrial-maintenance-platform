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
  @IsUUID()
  assetId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsUUID()
  maintenancePlanId?: string;
}
