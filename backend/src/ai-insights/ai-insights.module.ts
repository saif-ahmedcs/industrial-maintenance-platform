import { Module } from '@nestjs/common';
import { AiInsightsService } from './ai-insights.service';
import { DIAGNOSTIC_NOTE_PROVIDER } from './diagnostic-note.provider';
import { GroqDiagnosticProvider } from './groq-diagnostic.provider';

@Module({
  providers: [
    { provide: DIAGNOSTIC_NOTE_PROVIDER, useClass: GroqDiagnosticProvider },
    AiInsightsService,
  ],
  exports: [AiInsightsService],
})
export class AiInsightsModule {}
