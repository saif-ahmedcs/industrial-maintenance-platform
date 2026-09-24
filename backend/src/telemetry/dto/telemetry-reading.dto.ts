import { IsISO8601, IsNumber, IsUUID, Max, Min } from 'class-validator';

export const TELEMETRY_RANGES = {
  temperature: { min: -50, max: 250 },
  vibration: { min: 0, max: 100 },
  pressure: { min: 0, max: 500 },
} as const;

export class TelemetryReadingDto {
  @IsUUID()
  assetId: string;

  @IsNumber()
  @Min(TELEMETRY_RANGES.temperature.min)
  @Max(TELEMETRY_RANGES.temperature.max)
  temperature: number;

  @IsNumber()
  @Min(TELEMETRY_RANGES.vibration.min)
  @Max(TELEMETRY_RANGES.vibration.max)
  vibration: number;

  @IsNumber()
  @Min(TELEMETRY_RANGES.pressure.min)
  @Max(TELEMETRY_RANGES.pressure.max)
  pressure: number;

  @IsISO8601({ strict: true })
  recordedAt: string;
}
