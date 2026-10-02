import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AssetsService } from '../assets/assets.service';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { TelemetryReadingResponseDto } from './dto/telemetry-reading-response.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@ApiBearerAuth('access-token')
@Controller('assets/:id/telemetry')
export class TelemetryReadingsController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly assetsService: AssetsService,
  ) {}

  @Get('latest')
  @ApiOperation({
    summary: 'Get the most recent reading for an asset',
    description:
      'Reads from the Redis cache (telemetry:latest:{assetId}); falls back to the most recent Postgres row if the cache is cold. Raw readings arrive over MQTT, not through this HTTP API — see docs/architecture.md.',
  })
  @ApiOkResponse({ type: TelemetryReadingResponseDto })
  getLatest(@Param('id', ParseUUIDPipe) id: string) {
    return this.telemetryService.getLatest(id);
  }

  @Get()
  @ApiOperation({
    summary: "Get an asset's telemetry history (paginated, from Postgres)",
  })
  @ApiOkResponse({
    description: 'Paginated list of telemetry readings',
    type: TelemetryReadingResponseDto,
    isArray: true,
  })
  async history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    await this.assetsService.findOne(id);
    return this.telemetryService.findHistory(id, query);
  }
}
