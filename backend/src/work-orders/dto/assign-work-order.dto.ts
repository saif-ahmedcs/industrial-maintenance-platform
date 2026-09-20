import { IsOptional, IsUUID } from 'class-validator';

export class AssignWorkOrderDto {
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
