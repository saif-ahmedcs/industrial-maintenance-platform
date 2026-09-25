import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AssetsService } from '../assets/assets.service';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { TelemetryService } from './telemetry.service';

@Controller('assets/:id/telemetry')
export class TelemetryReadingsController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly assetsService: AssetsService,
  ) {}

  @Get('latest')
  getLatest(@Param('id', ParseUUIDPipe) id: string) {
    return this.telemetryService.getLatest(id);
  }

  @Get()
  async history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    await this.assetsService.findOne(id);
    return this.telemetryService.findHistory(id, query);
  }
}
