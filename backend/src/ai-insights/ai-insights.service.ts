import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiagnosticContext } from './diagnostic-context';
import { DIAGNOSTIC_NOTE_PROVIDER } from './diagnostic-note.provider';
import type { DiagnosticNoteProvider } from './diagnostic-note.provider';

export const AI_NOTE_MAX_LENGTH = 500;
const DEFAULT_TIMEOUT_MS = 4000;

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);
  private readonly enabled: boolean;
  private readonly timeoutMs: number;

  constructor(
    config: ConfigService,
    @Inject(DIAGNOSTIC_NOTE_PROVIDER)
    private readonly provider: DiagnosticNoteProvider,
  ) {
    const rawEnabled = config.get<boolean | string>('AI_INSIGHTS_ENABLED');
    this.enabled = rawEnabled === true || rawEnabled === 'true';
    this.timeoutMs = Number(
      config.get<number | string>('AI_INSIGHTS_TIMEOUT_MS') ??
        DEFAULT_TIMEOUT_MS,
    );
  }

  async generate(context: DiagnosticContext): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new Error(`AI note generation timed out after ${this.timeoutMs}ms`),
        );
      }, this.timeoutMs);
    });

    try {
      const note = await Promise.race([
        this.provider.generate(context, { signal: controller.signal }),
        timeout,
      ]);
      const cleaned = note.trim().slice(0, AI_NOTE_MAX_LENGTH);
      return cleaned === '' ? null : cleaned;
    } catch (err) {
      this.logger.warn(
        `AI note skipped (${context.kind}): ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
