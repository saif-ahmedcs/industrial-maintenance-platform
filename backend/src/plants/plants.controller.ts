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
import { CreatePlantDto } from './dto/create-plant.dto';
import { PlantResponseDto } from './dto/plant-response.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PlantsService } from './plants.service';

@ApiTags('plants')
@ApiBearerAuth('access-token')
@Controller('plants')
@UseGuards(RolesGuard)
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Get()
  @ApiOperation({ summary: 'List plants (paginated)' })
  @ApiOkResponse({
    description: 'Paginated list of plants',
    type: PlantResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.plantsService.findAll(query);
    return {
      data: result.data.map((plant) => PlantResponseDto.fromEntity(plant)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single plant by id' })
  @ApiOkResponse({ type: PlantResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return PlantResponseDto.fromEntity(await this.plantsService.findOne(id));
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Create a plant (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: PlantResponseDto })
  async create(@Body() dto: CreatePlantDto, @CurrentUser() user: RequestUser) {
    return PlantResponseDto.fromEntity(
      await this.plantsService.create(dto, user),
    );
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Update a plant (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: PlantResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return PlantResponseDto.fromEntity(
      await this.plantsService.update(id, dto, user),
    );
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Delete a plant (ADMIN, SUPERVISOR)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.plantsService.remove(id, user);
  }
}
