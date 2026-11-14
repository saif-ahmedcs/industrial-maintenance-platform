import { ApiProperty } from '@nestjs/swagger';

export class TelemetrySummaryResponseDto {
  @ApiProperty({
    description: 'Number of telemetry readings recorded since `since`',
  })
  readingCount: number;

  @ApiProperty({
    description:
      'Number of distinct assets with at least one telemetry reading since `since`',
  })
  assetCount: number;

  @ApiProperty({ description: 'Echoes the `since` query parameter' })
  since: string;
}
