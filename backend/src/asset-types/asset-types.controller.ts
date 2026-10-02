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
import { AssetTypesService } from './asset-types.service';
import { AssetTypeResponseDto } from './dto/asset-type-response.dto';
import { CreateAssetTypeDto } from './dto/create-asset-type.dto';
import { UpdateAssetTypeDto } from './dto/update-asset-type.dto';

@ApiTags('asset-types')
@ApiBearerAuth('access-token')
@Controller('asset-types')
@UseGuards(RolesGuard)
export class AssetTypesController {
  constructor(private readonly assetTypesService: AssetTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List asset types (paginated)' })
  @ApiOkResponse({
    description: 'Paginated list of asset types',
    type: AssetTypeResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.assetTypesService.findAll(query);
    return {
      data: result.data.map((assetType) =>
        AssetTypeResponseDto.fromEntity(assetType),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset type by id' })
  @ApiOkResponse({ type: AssetTypeResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return AssetTypeResponseDto.fromEntity(
      await this.assetTypesService.findOne(id),
    );
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Create an asset type (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: AssetTypeResponseDto })
  async create(
    @Body() dto: CreateAssetTypeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return AssetTypeResponseDto.fromEntity(
      await this.assetTypesService.create(dto, user),
    );
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Update an asset type (ADMIN, SUPERVISOR)' })
  @ApiOkResponse({ type: AssetTypeResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetTypeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return AssetTypeResponseDto.fromEntity(
      await this.assetTypesService.update(id, dto, user),
    );
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Delete an asset type (ADMIN, SUPERVISOR)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.assetTypesService.remove(id, user);
  }
}
