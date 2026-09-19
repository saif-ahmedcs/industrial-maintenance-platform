import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { Plant } from './entities/plant.entity';

const SORTABLE_FIELDS = ['plant.name'];

@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<Plant>> {
    const qb = this.plantRepo.createQueryBuilder('plant');
    return paginate(qb, query, {
      defaultSortBy: 'plant.name',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }

  async findOne(id: string): Promise<Plant> {
    const plant = await this.plantRepo.findOneBy({ id });
    if (!plant) {
      throw new NotFoundException(`Plant ${id} not found`);
    }
    return plant;
  }

  async create(dto: CreatePlantDto, actor: RequestUser): Promise<Plant> {
    return this.dataSource.transaction(async (manager) => {
      const plant = manager.create(Plant, dto);
      const saved = await manager.save(plant);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'Plant',
        entityId: saved.id,
        action: 'CREATE',
        before: null,
        after: { name: saved.name, address: saved.address },
        source: 'manual',
      });

      return saved;
    });
  }

  async update(
    id: string,
    dto: UpdatePlantDto,
    actor: RequestUser,
  ): Promise<Plant> {
    return this.dataSource.transaction(async (manager) => {
      const plant = await manager.findOneBy(Plant, { id });
      if (!plant) {
        throw new NotFoundException(`Plant ${id} not found`);
      }

      const before = { name: plant.name, address: plant.address };
      if (dto.name !== undefined) plant.name = dto.name;
      if (dto.address !== undefined) plant.address = dto.address;
      const saved = await manager.save(plant);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'Plant',
        entityId: saved.id,
        action: 'UPDATE',
        before,
        after: { name: saved.name, address: saved.address },
        source: 'manual',
      });

      return saved;
    });
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const plant = await manager.findOneBy(Plant, { id });
      if (!plant) {
        throw new NotFoundException(`Plant ${id} not found`);
      }

      await manager.remove(plant);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'Plant',
        entityId: id,
        action: 'DELETE',
        before: { name: plant.name, address: plant.address },
        after: null,
        source: 'manual',
      });
    });
  }
}
