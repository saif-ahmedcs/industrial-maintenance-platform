import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class TelemetrySummaryQueryDto {
  @ApiProperty({
    description:
      'ISO 8601 timestamp; inclusive lower bound on recordedAt. Required — there is no default range.',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsISO8601({ strict: true })
  since: string;
}
