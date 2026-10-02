import { ApiProperty } from '@nestjs/swagger';
import { TelemetryReading } from '../entities/telemetry-reading.entity';

export class TelemetryReadingResponseDto {
  @ApiProperty()
  assetId: string;

  @ApiProperty()
  temperature: number;

  @ApiProperty()
  vibration: number;

  @ApiProperty()
  pressure: number;

  @ApiProperty({
    description:
      'ISO 8601 timestamp set by the publisher, not the ingestion time',
  })
  recordedAt: string;

  static fromEntity(reading: TelemetryReading): TelemetryReadingResponseDto {
    const dto = new TelemetryReadingResponseDto();
    dto.assetId = reading.assetId;
    dto.temperature = reading.temperature;
    dto.vibration = reading.vibration;
    dto.pressure = reading.pressure;
    dto.recordedAt = reading.recordedAt.toISOString();
    return dto;
  }
}
