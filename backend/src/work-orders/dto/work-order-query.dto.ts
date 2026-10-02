import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import {
  WorkOrderSource,
  WorkOrderStatus,
} from '../entities/work-order.entity';

export class WorkOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({
    enum: WorkOrderStatus,
    description:
      'Filtering by status=COMPLETED together with assetId is the maintenance-history query for that asset',
  })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: WorkOrderSource })
  @IsOptional()
  @IsEnum(WorkOrderSource)
  source?: WorkOrderSource;
}
