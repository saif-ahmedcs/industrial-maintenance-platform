import { MaintenancePlan } from '../entities/maintenance-plan.entity';

export class MaintenancePlanResponseDto {
  id: string;
  assetId: string;
  name: string;
  intervalDays: number;
  lastCompletedAt: Date | null;
  nextDueAt: Date | null;
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
