import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RequestContext } from '../common/context/request-context';
import { TelemetryJobData } from '../telemetry/interfaces/telemetry-job-data.interface';
import { ConditionMonitoringService } from './condition-monitoring.service';

@Processor('telemetry-processing')
export class ConditionMonitoringProcessor extends WorkerHost {
  private readonly logger = new Logger(ConditionMonitoringProcessor.name);

  constructor(
    private readonly conditionMonitoringService: ConditionMonitoringService,
  ) {
    super();
  }

  async process(job: Job<TelemetryJobData>): Promise<void> {
    const { reading, correlationId } = job.data;
    const { assetId } = reading;

    await RequestContext.run({ requestId: correlationId }, async () => {
      this.logger.log(`Picked up telemetry job ${job.id} for asset ${assetId}`);
      try {
        await this.conditionMonitoringService.evaluateAsset(assetId);
      } catch (err) {
        this.logger.error(
          `Condition monitoring failed for asset ${assetId} (job ${job.id})`,
          err instanceof Error ? err.stack : String(err),
        );
        throw err;
      }
    });
  }
}
