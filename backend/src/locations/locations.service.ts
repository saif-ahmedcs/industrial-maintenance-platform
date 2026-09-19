import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { Plant } from '../plants/entities/plant.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';

const SORTABLE_FIELDS = ['location.name'];

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<Location>> {
    const qb = this.locationRepo.createQueryBuilder('location');
    return paginate(qb, query, {
      defaultSortBy: 'location.name',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepo.findOneBy({ id });
    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    return location;
  }

  async create(dto: CreateLocationDto, actor: RequestUser): Promise<Location> {
    return this.dataSource.transaction(async (manager) => {
      const plant = await manager.findOneBy(Plant, { id: dto.plantId });
      if (!plant) {
        throw new NotFoundException(`Plant ${dto.plantId} not found`);
      }

      if (dto.parentLocationId) {
        const parent = await manager.findOneBy(Location, {
          id: dto.parentLocationId,
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent location ${dto.parentLocationId} not found`,
          );
        }
        if (parent.plantId !== dto.plantId) {
          throw new BadRequestException(
            'Parent location must belong to the same plant',
          );
        }
      }

      const location = manager.create(Location, {
        plantId: dto.plantId,
        name: dto.name,
        parentLocationId: dto.parentLocationId ?? null,
      });
      const saved = await manager.save(location);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'Location',
        entityId: saved.id,
        action: 'CREATE',
        before: null,
        after: {
          plantId: saved.plantId,
          name: saved.name,
          parentLocationId: saved.parentLocationId,
        },
        source: 'manual',
      });

      return saved;
    });
  }

  async update(
    id: string,
    dto: UpdateLocationDto,
    actor: RequestUser,
  ): Promise<Location> {
    return this.dataSource.transaction(async (manager) => {
      const location = await manager.findOneBy(Location, { id });
      if (!location) {
        throw new NotFoundException(`Location ${id} not found`);
      }

      if (dto.parentLocationId !== undefined) {
        if (dto.parentLocationId === id) {
          throw new BadRequestException('A location cannot be its own parent');
        }
        if (dto.parentLocationId !== null) {
          const parent = await manager.findOneBy(Location, {
            id: dto.parentLocationId,
          });
          if (!parent) {
            throw new NotFoundException(
              `Parent location ${dto.parentLocationId} not found`,
            );
          }
          if (parent.plantId !== location.plantId) {
            throw new BadRequestException(
              'Parent location must belong to the same plant',
            );
          }
        }
      }

      const before = {
        name: location.name,
        parentLocationId: location.parentLocationId,
      };
      Object.assign(location, dto);
      const saved = await manager.save(location);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'Location',
        entityId: saved.id,
        action: 'UPDATE',
        before,
        after: {
          name: saved.name,
          parentLocationId: saved.parentLocationId,
        },
        source: 'manual',
      });

      return saved;
    });
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const location = await manager.findOneBy(Location, { id });
      if (!location) {
        throw new NotFoundException(`Location ${id} not found`);
      }

      await manager.remove(location);

      await this.auditService.record(manager, {
        actorUserId: actor.id,
        entityType: 'Location',
        entityId: id,
        action: 'DELETE',
        before: {
          plantId: location.plantId,
          name: location.name,
          parentLocationId: location.parentLocationId,
        },
        after: null,
        source: 'manual',
      });
    });
  }
}
