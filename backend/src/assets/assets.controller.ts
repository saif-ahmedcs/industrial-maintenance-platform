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
import { AssetsService } from './assets.service';
import { AssetHistoryService } from '../asset-history/asset-history.service';
import { AssetQueryDto } from './dto/asset-query.dto';
import { AssetResponseDto } from './dto/asset-response.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';

@ApiTags('assets')
@ApiBearerAuth('access-token')
@Controller('assets')
@UseGuards(RolesGuard)
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetHistoryService: AssetHistoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List assets (paginated, optionally by status)' })
  @ApiOkResponse({
    description: 'Paginated list of assets',
    type: AssetResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: AssetQueryDto) {
    const result = await this.assetsService.findAll(query);
    return {
      data: result.data.map((asset) => AssetResponseDto.fromEntity(asset)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset by id' })
  @ApiOkResponse({ type: AssetResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return AssetResponseDto.fromEntity(await this.assetsService.findOne(id));
  }

  @Get(':id/history')
  @ApiOperation({
    summary: "Get an asset's status-change timeline (paginated)",
  })
  @ApiOkResponse({
    description: 'Paginated asset_state_history entries for this asset',
  })
  async history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    await this.assetsService.findOne(id);
    return this.assetHistoryService.findByAsset(id, query);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Create an asset (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: AssetResponseDto })
  async create(@Body() dto: CreateAssetDto, @CurrentUser() user: RequestUser) {
    return AssetResponseDto.fromEntity(
      await this.assetsService.create(dto, user),
    );
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Update an asset (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: AssetResponseDto })
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
  @ApiOperation({
    summary:
      "Change an asset's status (ADMIN, SUPERVISOR) — audited as its own event",
  })
  @ApiOkResponse({ type: AssetResponseDto })
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
  @ApiOperation({ summary: 'Delete an asset (ADMIN, SUPERVISOR)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.assetsService.remove(id, user);
  }
}
