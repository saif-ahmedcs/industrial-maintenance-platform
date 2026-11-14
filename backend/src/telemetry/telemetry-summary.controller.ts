import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TelemetrySummaryQueryDto } from './dto/telemetry-summary-query.dto';
import { TelemetrySummaryResponseDto } from './dto/telemetry-summary-response.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@ApiBearerAuth('access-token')
@Controller('telemetry')
export class TelemetrySummaryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Count telemetry readings and distinct assets since a timestamp',
    description:
      '`since` is required (ISO 8601); there is no default range, and an invalid or missing value returns 400.',
  })
  @ApiOkResponse({ type: TelemetrySummaryResponseDto })
  getSummary(
    @Query() query: TelemetrySummaryQueryDto,
  ): Promise<TelemetrySummaryResponseDto> {
    return this.telemetryService.getSummary(query.since);
  }
}
