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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { RoleName } from '../users/entities/role.entity';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { MaintenancePlanQueryDto } from './dto/maintenance-plan-query.dto';
import { MaintenancePlanResponseDto } from './dto/maintenance-plan-response.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { MaintenancePlansService } from './maintenance-plans.service';

@ApiTags('maintenance-plans')
@ApiBearerAuth('access-token')
@Controller('maintenance-plans')
@UseGuards(RolesGuard)
export class MaintenancePlansController {
  constructor(private readonly plansService: MaintenancePlansService) {}

  @Get()
  @ApiOperation({
    summary: 'List maintenance plans (paginated, optionally by asset)',
  })
  @ApiOkResponse({
    description: 'Paginated list of maintenance plans',
    type: MaintenancePlanResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: MaintenancePlanQueryDto) {
    const result = await this.plansService.findAll(query);
    return {
      data: result.data.map((plan) =>
        MaintenancePlanResponseDto.fromEntity(plan),
      ),
      meta: result.meta,
    };
  }

  @Get('due')
  @ApiOperation({
    summary: 'List plans currently due (nextDueAt <= now), paginated',
  })
  @ApiOkResponse({ type: MaintenancePlanResponseDto, isArray: true })
  async findDue(@Query() query: PaginationQueryDto) {
    const result = await this.plansService.findDue(query);
    return {
      data: result.data.map((plan) =>
        MaintenancePlanResponseDto.fromEntity(plan),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single maintenance plan by id' })
  @ApiOkResponse({ type: MaintenancePlanResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return MaintenancePlanResponseDto.fromEntity(
      await this.plansService.findOne(id),
    );
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Create a maintenance plan (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: MaintenancePlanResponseDto })
  async create(
    @Body() dto: CreateMaintenancePlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return MaintenancePlanResponseDto.fromEntity(
      await this.plansService.create(dto, user),
    );
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Update a maintenance plan (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: MaintenancePlanResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenancePlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return MaintenancePlanResponseDto.fromEntity(
      await this.plansService.update(id, dto, user),
    );
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Delete a maintenance plan (ADMIN, SUPERVISOR)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.plansService.remove(id, user);
  }
}
