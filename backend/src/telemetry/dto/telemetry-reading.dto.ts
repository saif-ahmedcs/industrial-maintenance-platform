import { IsISO8601, IsNumber, IsUUID } from 'class-validator';

export class TelemetryReadingDto {
  @IsUUID()
  assetId: string;

  @IsNumber()
  temperature: number;

  @IsNumber()
  vibration: number;

  @IsNumber()
  pressure: number;

  @IsISO8601()
  recordedAt: string;
}
