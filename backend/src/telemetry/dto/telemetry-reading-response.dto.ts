import { TelemetryReading } from '../entities/telemetry-reading.entity';

export class TelemetryReadingResponseDto {
  assetId: string;
  temperature: number;
  vibration: number;
  pressure: number;
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
