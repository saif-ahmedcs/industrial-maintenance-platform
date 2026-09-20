import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import {
  WorkOrderSource,
  WorkOrderStatus,
} from '../entities/work-order.entity';

export class WorkOrderQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsEnum(WorkOrderSource)
  source?: WorkOrderSource;
}
