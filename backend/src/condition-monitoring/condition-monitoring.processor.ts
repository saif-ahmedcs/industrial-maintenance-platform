import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TelemetryReadingDto } from '../telemetry/dto/telemetry-reading.dto';
import { ConditionMonitoringService } from './condition-monitoring.service';

@Processor('telemetry-processing')
export class ConditionMonitoringProcessor extends WorkerHost {
  private readonly logger = new Logger(ConditionMonitoringProcessor.name);

  constructor(
    private readonly conditionMonitoringService: ConditionMonitoringService,
  ) {
    super();
  }

  async process(job: Job<TelemetryReadingDto>): Promise<void> {
    const { assetId } = job.data;
    try {
      await this.conditionMonitoringService.evaluateAsset(assetId);
    } catch (err) {
      this.logger.error(
        `Condition monitoring failed for asset ${assetId} (job ${job.id})`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err; // let BullMQ retry per the queue's backoff policy
    }
  }
}
