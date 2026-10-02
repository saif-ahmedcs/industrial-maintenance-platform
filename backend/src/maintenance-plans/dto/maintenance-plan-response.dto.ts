import { ApiProperty } from '@nestjs/swagger';
import { MaintenancePlan } from '../entities/maintenance-plan.entity';

export class MaintenancePlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  assetId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Days between completions' })
  intervalDays: number;

  @ApiProperty({ nullable: true })
  lastCompletedAt: Date | null;

  @ApiProperty({ nullable: true })
  nextDueAt: Date | null;

  @ApiProperty()
  active: boolean;

  static fromEntity(plan: MaintenancePlan): MaintenancePlanResponseDto {
    const dto = new MaintenancePlanResponseDto();
    dto.id = plan.id;
    dto.assetId = plan.assetId;
    dto.name = plan.name;
    dto.intervalDays = plan.intervalDays;
    dto.lastCompletedAt = plan.lastCompletedAt;
    dto.nextDueAt = plan.nextDueAt;
    dto.active = plan.active;
    return dto;
  }
}
