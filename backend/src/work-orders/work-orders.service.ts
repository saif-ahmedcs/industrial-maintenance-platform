import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Asset, AssetStatus } from '../assets/entities/asset.entity';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { daysFromNow } from '../common/utils/date.util';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { InventoryService } from '../inventory/inventory.service';
import { MaintenancePlan } from '../maintenance-plans/entities/maintenance-plan.entity';
import { RoleName } from '../users/entities/role.entity';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { WorkOrderPart } from './entities/work-order-part.entity';
import {
  WorkOrder,
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
} from './entities/work-order.entity';
import { assertValidWorkOrderTransition } from './work-order-lifecycle';

const SORTABLE_FIELDS = [
  'workOrder.openedAt',
  'workOrder.status',
  'workOrder.priority',
];

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly inventoryService: InventoryService,
  ) {}

  private isPrivileged(actor: RequestUser): boolean {
    return (
      actor.roles.includes(RoleName.ADMIN) ||
      actor.roles.includes(RoleName.SUPERVISOR)
    );
  }

  async findAll(query: WorkOrderQueryDto): Promise<PaginatedResult<WorkOrder>> {
    const qb = this.workOrderRepo.createQueryBuilder('workOrder');
    if (query.assetId) {
      qb.andWhere('workOrder.assetId = :assetId', { assetId: query.assetId });
    }
    if (query.status) {
      qb.andWhere('workOrder.status = :status', { status: query.status });
    }
    if (query.source) {
      qb.andWhere('workOrder.source = :source', { source: query.source });
    }
    return paginate(qb, query, {
      defaultSortBy: 'workOrder.openedAt',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }

  async findOne(id: string): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepo.findOne({
      where: { id },
      relations: { workOrderParts: true },
    });
    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }
    return workOrder;
  }

  async create(
    dto: CreateWorkOrderDto,
    actor: RequestUser,
  ): Promise<WorkOrder> {
    return this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOneBy(Asset, { id: dto.assetId });
      if (!asset) {
        throw new NotFoundException(`Asset ${dto.assetId} not found`);
      }

      let source = WorkOrderSource.MANUAL;
      let maintenancePlanId: string | null = null;

      if (dto.maintenancePlanId) {
        const plan = await manager.findOneBy(MaintenancePlan, {
          id: dto.maintenancePlanId,
        });
        if (!plan) {
          throw new NotFoundException(
            `Maintenance plan ${dto.maintenancePlanId} not found`,
          );
        }
        if (plan.assetId !== dto.assetId) {
          throw new ConflictException(
            `Maintenance plan ${plan.id} belongs to a different asset than ${dto.assetId}`,
          );
        }
        source = WorkOrderSource.PLANNED;
        maintenancePlanId = plan.id;
      }

      const workOrder = manager.create(WorkOrder, {
        assetId: dto.assetId,
        maintenancePlanId,
        status: WorkOrderStatus.OPEN,
        source,
        priority: dto.priority ?? WorkOrderPriority.MEDIUM,
        description: dto.description,
      });
      const saved = await manager.save(workOrder);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'WorkOrder',
        entityId: saved.id,
        action: 'CREATE',
        before: null,
        after: {
          assetId: saved.assetId,
          maintenancePlanId: saved.maintenancePlanId,
          status: saved.status,
          source: saved.source,
          priority: saved.priority,
        },
        source: 'manual',
      });

      return saved;
    });
  }

  async assign(
    id: string,
    dto: AssignWorkOrderDto,
    actor: RequestUser,
  ): Promise<WorkOrder> {
    return this.dataSource.transaction(async (manager) => {
      const workOrder = await manager.findOneBy(WorkOrder, { id });
      if (!workOrder) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      const targetUserId = dto.assignedToUserId ?? actor.id;
      if (targetUserId !== actor.id && !this.isPrivileged(actor)) {
        throw new ForbiddenException(
          'Only admins or supervisors can assign a work order to someone else',
        );
      }

      if (
        workOrder.status !== WorkOrderStatus.OPEN &&
        workOrder.status !== WorkOrderStatus.ASSIGNED
      ) {
        throw new ConflictException(
          `Cannot assign a work order in status ${workOrder.status}`,
        );
      }

      const before = {
        status: workOrder.status,
        assignedToUserId: workOrder.assignedToUserId,
      };

      if (workOrder.status === WorkOrderStatus.OPEN) {
        assertValidWorkOrderTransition(
          workOrder.status,
          WorkOrderStatus.ASSIGNED,
        );
        workOrder.status = WorkOrderStatus.ASSIGNED;
        workOrder.assignedAt = new Date();
      }
      workOrder.assignedToUserId = targetUserId;

      const saved = await manager.save(workOrder);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'WorkOrder',
        entityId: saved.id,
        action: 'ASSIGN',
        before,
        after: {
          status: saved.status,
          assignedToUserId: saved.assignedToUserId,
        },
        source: 'manual',
      });

      return saved;
    });
  }

  async start(id: string, actor: RequestUser): Promise<WorkOrder> {
    return this.dataSource.transaction(async (manager) => {
      const workOrder = await manager.findOneBy(WorkOrder, { id });
      if (!workOrder) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      if (
        workOrder.assignedToUserId !== actor.id &&
        !this.isPrivileged(actor)
      ) {
        throw new ForbiddenException(
          'Only the assigned technician, a supervisor, or an admin can start this work order',
        );
      }

      assertValidWorkOrderTransition(
        workOrder.status,
        WorkOrderStatus.IN_PROGRESS,
      );

      const before = { status: workOrder.status };
      workOrder.status = WorkOrderStatus.IN_PROGRESS;
      workOrder.startedAt = new Date();
      const saved = await manager.save(workOrder);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'WorkOrder',
        entityId: saved.id,
        action: 'START',
        before,
        after: { status: saved.status },
        source: 'manual',
      });

      return saved;
    });
  }

  async cancel(id: string, actor: RequestUser): Promise<WorkOrder> {
    return this.dataSource.transaction(async (manager) => {
      const workOrder = await manager.findOneBy(WorkOrder, { id });
      if (!workOrder) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      assertValidWorkOrderTransition(
        workOrder.status,
        WorkOrderStatus.CANCELLED,
      );

      const before = { status: workOrder.status };
      workOrder.status = WorkOrderStatus.CANCELLED;
      workOrder.cancelledAt = new Date();
      const saved = await manager.save(workOrder);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'WorkOrder',
        entityId: saved.id,
        action: 'CANCEL',
        before,
        after: { status: saved.status },
        source: 'manual',
      });

      return saved;
    });
  }

  async complete(
    id: string,
    dto: CompleteWorkOrderDto,
    actor: RequestUser,
  ): Promise<WorkOrder> {
    return this.dataSource.transaction(async (manager) => {
      const workOrder = await manager.findOneBy(WorkOrder, { id });
      if (!workOrder) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      if (
        workOrder.assignedToUserId !== actor.id &&
        !this.isPrivileged(actor)
      ) {
        throw new ForbiddenException(
          'Only the assigned technician, a supervisor, or an admin can complete this work order',
        );
      }

      assertValidWorkOrderTransition(
        workOrder.status,
        WorkOrderStatus.COMPLETED,
      );

      const before = { status: workOrder.status };
      const parts = dto.parts ?? [];
      const createdParts: WorkOrderPart[] = [];
      let totalCost = 0;

      for (const part of parts) {
        const { sparePart } = await this.inventoryService.consume(
          manager,
          part.sparePartId,
          part.quantityUsed,
          { workOrderId: workOrder.id, createdByUserId: actor.id },
        );

        const workOrderPart = manager.create(WorkOrderPart, {
          workOrderId: workOrder.id,
          sparePartId: sparePart.id,
          quantityUsed: part.quantityUsed,
          unitCostAtCompletion: sparePart.unitCost,
        });
        createdParts.push(await manager.save(workOrderPart));

        totalCost += sparePart.unitCost * part.quantityUsed;
      }

      workOrder.status = WorkOrderStatus.COMPLETED;
      workOrder.completedAt = new Date();
      workOrder.totalCost = Math.round(totalCost * 100) / 100;
      const savedWorkOrder = await manager.save(workOrder);
      savedWorkOrder.workOrderParts = createdParts;

      const asset = await manager.findOneBy(Asset, { id: workOrder.assetId });
      if (!asset) {
        throw new NotFoundException(`Asset ${workOrder.assetId} not found`);
      }
      const assetStatusBefore = asset.status;
      asset.status = AssetStatus.OPERATIONAL;
      const savedAsset = await manager.save(asset);

      if (workOrder.maintenancePlanId) {
        const plan = await manager.findOneBy(MaintenancePlan, {
          id: workOrder.maintenancePlanId,
        });
        if (plan) {
          plan.lastCompletedAt = new Date();
          plan.nextDueAt = daysFromNow(plan.intervalDays);
          await manager.save(plan);
        }
      }

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'WorkOrder',
        entityId: savedWorkOrder.id,
        action: 'COMPLETE',
        before,
        after: {
          status: savedWorkOrder.status,
          totalCost: savedWorkOrder.totalCost,
        },
        source: 'manual',
      });

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'Asset',
        entityId: savedAsset.id,
        action: 'STATUS_CHANGE',
        before: { status: assetStatusBefore },
        after: { status: savedAsset.status },
        source: 'work-order-completion',
      });

      return savedWorkOrder;
    });
  }
}
