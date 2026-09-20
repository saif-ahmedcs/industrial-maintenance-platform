import {
  Body,
  Controller,
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
import { AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { WorkOrderResponseDto } from './dto/work-order-response.dto';
import { WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
@UseGuards(RolesGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  async findAll(@Query() query: WorkOrderQueryDto) {
    const result = await this.workOrdersService.findAll(query);
    return {
      data: result.data.map((workOrder) =>
        WorkOrderResponseDto.fromEntity(workOrder),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.findOne(id),
    );
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.TECHNICIAN)
  async create(
    @Body() dto: CreateWorkOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.create(dto, user),
    );
  }

  @Patch(':id/assign')
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignWorkOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.assign(id, dto, user),
    );
  }

  @Patch(':id/start')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.TECHNICIAN)
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.start(id, user),
    );
  }

  @Patch(':id/cancel')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.cancel(id, user),
    );
  }

  @Patch(':id/complete')
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteWorkOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.complete(id, dto, user),
    );
  }
}
