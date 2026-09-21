import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { AdjustSparePartDto } from './dto/adjust-spare-part.dto';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { RestockSparePartDto } from './dto/restock-spare-part.dto';
import { SparePartQueryDto } from './dto/spare-part-query.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import {
  InventoryTransaction,
  InventoryTransactionReason,
} from './entities/inventory-transaction.entity';
import { SparePart } from './entities/spare-part.entity';

export interface ConsumeContext {
  workOrderId?: string | null;
  createdByUserId: string | null;
}

export interface ConsumeResult {
  sparePart: SparePart;
  transaction: InventoryTransaction;
}

interface StockChangeResult extends ConsumeResult {
  quantityBefore: number;
}

const SORTABLE_FIELDS = ['part.sku', 'part.name', 'part.quantityOnHand'];

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(SparePart)
    private readonly sparePartRepo: Repository<SparePart>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private async lockPart(
    manager: EntityManager,
    sparePartId: string,
  ): Promise<SparePart> {
    const sparePart = await manager
      .createQueryBuilder(SparePart, 'part')
      .setLock('pessimistic_write')
      .where('part.id = :id', { id: sparePartId })
      .getOne();

    if (!sparePart) {
      throw new NotFoundException(`Spare part ${sparePartId} not found`);
    }
    return sparePart;
  }

  private async applyStockChange(
    manager: EntityManager,
    sparePartId: string,
    delta: number,
    reason: InventoryTransactionReason,
    context: ConsumeContext,
  ): Promise<StockChangeResult> {
    const part = await this.lockPart(manager, sparePartId);

    const quantityBefore = part.quantityOnHand;
    const quantityAfter = quantityBefore + delta;
    if (quantityAfter < 0) {
      throw new ConflictException(
        `Insufficient stock for spare part ${part.sku}: requested ${-delta}, available ${quantityBefore}`,
      );
    }

    part.quantityOnHand = quantityAfter;
    const savedPart = await manager.save(part);

    const transaction = await manager.save(
      manager.create(InventoryTransaction, {
        sparePartId: savedPart.id,
        deltaQuantity: delta,
        reason,
        workOrderId: context.workOrderId ?? null,
        createdByUserId: context.createdByUserId,
        resultingQuantity: savedPart.quantityOnHand,
      }),
    );

    return { sparePart: savedPart, transaction, quantityBefore };
  }

  async findAll(query: SparePartQueryDto): Promise<PaginatedResult<SparePart>> {
    const qb = this.sparePartRepo.createQueryBuilder('part');
    if (query.lowStock === true) {
      qb.andWhere('part.quantityOnHand <= part.reorderThreshold');
    } else if (query.lowStock === false) {
      qb.andWhere('part.quantityOnHand > part.reorderThreshold');
    }
    return paginate(qb, query, {
      defaultSortBy: 'part.sku',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }

  async findOne(id: string): Promise<SparePart> {
    const part = await this.sparePartRepo.findOneBy({ id });
    if (!part) {
      throw new NotFoundException(`Spare part ${id} not found`);
    }
    return part;
  }

  async create(
    dto: CreateSparePartDto,
    actor: RequestUser,
  ): Promise<SparePart> {
    return this.dataSource.transaction(async (manager) => {
      const initialQuantity = dto.initialQuantity ?? 0;

      const part = manager.create(SparePart, {
        sku: dto.sku,
        name: dto.name,
        quantityOnHand: initialQuantity,
        reorderThreshold: dto.reorderThreshold ?? 0,
        unitCost: dto.unitCost,
      });
      const saved = await manager.save(part);

      if (initialQuantity > 0) {
        await manager.save(
          manager.create(InventoryTransaction, {
            sparePartId: saved.id,
            deltaQuantity: initialQuantity,
            reason: InventoryTransactionReason.RESTOCK,
            workOrderId: null,
            createdByUserId: actor.id,
            resultingQuantity: initialQuantity,
          }),
        );
      }

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'SparePart',
        entityId: saved.id,
        action: 'CREATE',
        before: null,
        after: {
          sku: saved.sku,
          name: saved.name,
          quantityOnHand: saved.quantityOnHand,
          reorderThreshold: saved.reorderThreshold,
          unitCost: saved.unitCost,
        },
        source: 'manual',
      });

      return saved;
    });
  }

  async update(
    id: string,
    dto: UpdateSparePartDto,
    actor: RequestUser,
  ): Promise<SparePart> {
    return this.dataSource.transaction(async (manager) => {
      const part = await this.lockPart(manager, id);

      const before = {
        name: part.name,
        reorderThreshold: part.reorderThreshold,
        unitCost: part.unitCost,
      };
      if (dto.name !== undefined) part.name = dto.name;
      if (dto.reorderThreshold !== undefined) {
        part.reorderThreshold = dto.reorderThreshold;
      }
      if (dto.unitCost !== undefined) part.unitCost = dto.unitCost;
      const saved = await manager.save(part);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'SparePart',
        entityId: saved.id,
        action: 'UPDATE',
        before,
        after: {
          name: saved.name,
          reorderThreshold: saved.reorderThreshold,
          unitCost: saved.unitCost,
        },
        source: 'manual',
      });

      return saved;
    });
  }

  async consume(
    manager: EntityManager,
    sparePartId: string,
    quantity: number,
    context: ConsumeContext,
  ): Promise<ConsumeResult> {
    const { sparePart, transaction } = await this.applyStockChange(
      manager,
      sparePartId,
      -quantity,
      InventoryTransactionReason.CONSUMED,
      context,
    );
    return { sparePart, transaction };
  }

  async restock(
    id: string,
    dto: RestockSparePartDto,
    actor: RequestUser,
  ): Promise<ConsumeResult> {
    return this.dataSource.transaction(async (manager) => {
      const result = await this.applyStockChange(
        manager,
        id,
        dto.quantity,
        InventoryTransactionReason.RESTOCK,
        { createdByUserId: actor.id },
      );

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'SparePart',
        entityId: id,
        action: 'RESTOCK',
        before: { quantityOnHand: result.quantityBefore },
        after: { quantityOnHand: result.sparePart.quantityOnHand },
        source: 'manual',
      });

      return { sparePart: result.sparePart, transaction: result.transaction };
    });
  }

  async adjust(
    id: string,
    dto: AdjustSparePartDto,
    actor: RequestUser,
  ): Promise<ConsumeResult> {
    return this.dataSource.transaction(async (manager) => {
      const result = await this.applyStockChange(
        manager,
        id,
        dto.delta,
        InventoryTransactionReason.ADJUSTMENT,
        { createdByUserId: actor.id },
      );

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'SparePart',
        entityId: id,
        action: 'ADJUST',
        before: { quantityOnHand: result.quantityBefore },
        after: {
          quantityOnHand: result.sparePart.quantityOnHand,
          delta: dto.delta,
          reason: dto.reason,
        },
        source: 'manual',
      });

      return { sparePart: result.sparePart, transaction: result.transaction };
    });
  }
}
