import { TelemetryReadingDto } from '../dto/telemetry-reading.dto';

export interface TelemetryJobData {
  reading: TelemetryReadingDto;
  correlationId: string;
}
