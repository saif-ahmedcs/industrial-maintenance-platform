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
import { AssetsService } from './assets.service';
import { AssetResponseDto } from './dto/asset-response.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';

@Controller('assets')
@UseGuards(RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.assetsService.findAll(query);
    return {
      data: result.data.map((asset) => AssetResponseDto.fromEntity(asset)),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return AssetResponseDto.fromEntity(await this.assetsService.findOne(id));
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async create(@Body() dto: CreateAssetDto, @CurrentUser() user: RequestUser) {
    return AssetResponseDto.fromEntity(
      await this.assetsService.create(dto, user),
    );
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return AssetResponseDto.fromEntity(
      await this.assetsService.update(id, dto, user),
    );
  }

  @Patch(':id/status')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return AssetResponseDto.fromEntity(
      await this.assetsService.updateStatus(id, dto, user),
    );
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.assetsService.remove(id, user);
  }
}
