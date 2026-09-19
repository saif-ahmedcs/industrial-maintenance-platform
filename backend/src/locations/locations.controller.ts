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
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { RoleName } from '../users/entities/role.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.locationsService.findAll(query);
    return {
      data: result.data.map((location) =>
        LocationResponseDto.fromEntity(location),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return LocationResponseDto.fromEntity(
      await this.locationsService.findOne(id),
    );
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async create(
    @Body() dto: CreateLocationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return LocationResponseDto.fromEntity(
      await this.locationsService.create(dto, user),
    );
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return LocationResponseDto.fromEntity(
      await this.locationsService.update(id, dto, user),
    );
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.locationsService.remove(id, user);
  }
}
