import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { RoleName } from '../users/entities/role.entity';
import { AdjustSparePartDto } from './dto/adjust-spare-part.dto';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { InventoryTransactionResponseDto } from './dto/inventory-transaction-response.dto';
import { RestockSparePartDto } from './dto/restock-spare-part.dto';
import { SparePartQueryDto } from './dto/spare-part-query.dto';
import { SparePartResponseDto } from './dto/spare-part-response.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { InventoryService } from './inventory.service';

@Controller('spare-parts')
@UseGuards(RolesGuard)
export class SparePartsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll(@Query() query: SparePartQueryDto) {
    const result = await this.inventoryService.findAll(query);
    return {
      data: result.data.map((part) => SparePartResponseDto.fromEntity(part)),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return SparePartResponseDto.fromEntity(
      await this.inventoryService.findOne(id),
    );
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async create(
    @Body() dto: CreateSparePartDto,
    @CurrentUser() user: RequestUser,
  ) {
    return SparePartResponseDto.fromEntity(
      await this.inventoryService.create(dto, user),
    );
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSparePartDto,
    @CurrentUser() user: RequestUser,
  ) {
    return SparePartResponseDto.fromEntity(
      await this.inventoryService.update(id, dto, user),
    );
  }

  @Post(':id/restock')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async restock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestockSparePartDto,
    @CurrentUser() user: RequestUser,
  ) {
    const { sparePart, transaction } = await this.inventoryService.restock(
      id,
      dto,
      user,
    );
    return {
      sparePart: SparePartResponseDto.fromEntity(sparePart),
      transaction: InventoryTransactionResponseDto.fromEntity(transaction),
    };
  }

  @Post(':id/adjust')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustSparePartDto,
    @CurrentUser() user: RequestUser,
  ) {
    const { sparePart, transaction } = await this.inventoryService.adjust(
      id,
      dto,
      user,
    );
    return {
      sparePart: SparePartResponseDto.fromEntity(sparePart),
      transaction: InventoryTransactionResponseDto.fromEntity(transaction),
    };
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.inventoryService.remove(id, user);
  }
}
