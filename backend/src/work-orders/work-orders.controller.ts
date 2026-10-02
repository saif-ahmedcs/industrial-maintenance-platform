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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('work-orders')
@ApiBearerAuth('access-token')
@Controller('work-orders')
@UseGuards(RolesGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'List work orders (paginated)',
    description:
      "Filter by assetId + status=COMPLETED to get that asset's maintenance history.",
  })
  @ApiOkResponse({
    description: 'Paginated list of work orders',
    type: WorkOrderResponseDto,
    isArray: true,
  })
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
  @ApiOperation({ summary: 'Get a single work order by id' })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.findOne(id),
    );
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.TECHNICIAN)
  @ApiOperation({ summary: 'Manually create a work order' })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  async create(
    @Body() dto: CreateWorkOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.create(dto, user),
    );
  }

  @Patch(':id/assign')
  @ApiOperation({
    summary: 'Assign a work order to self or another user (OPEN/ASSIGNED only)',
  })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  @ApiConflictResponse({
    description: 'Work order is not in a status that can be assigned',
  })
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
  @ApiOperation({ summary: 'Move a work order to IN_PROGRESS' })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  @ApiConflictResponse({ description: 'Illegal status transition' })
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
  @ApiOperation({ summary: 'Cancel a work order (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  @ApiConflictResponse({ description: 'Illegal status transition' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return WorkOrderResponseDto.fromEntity(
      await this.workOrdersService.cancel(id, user),
    );
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Complete a work order',
    description:
      'Atomic: locks and decrements each consumed spare part, writes inventory_transactions, sets status=COMPLETED, resets the asset to OPERATIONAL, advances the maintenance plan if any, and writes matching audit entries — all in one transaction. Insufficient stock on any part rolls back everything.',
  })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  @ApiConflictResponse({
    description:
      'Illegal status transition, or insufficient stock on a requested part',
  })
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
