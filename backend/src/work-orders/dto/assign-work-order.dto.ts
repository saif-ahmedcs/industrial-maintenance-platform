import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignWorkOrderDto {
  @ApiPropertyOptional({ description: 'Defaults to the caller if omitted' })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
