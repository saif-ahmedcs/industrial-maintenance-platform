import { AssetSummary, DiagnosticContext } from './diagnostic-context';

export const SYSTEM_PROMPT = [
  'You are a maintenance assistant for industrial equipment.',
  'Reply in at most 3 short sentences of plain text (no markdown, no lists).',
  'Give ONE possible cause and ONE first thing to check.',
  'Phrase it as a possibility, never as a certain diagnosis.',
].join(' ');

function describeAsset(asset: AssetSummary): string {
  return `Asset ${asset.tag} (type: ${asset.typeName ?? 'unknown'}, criticality: ${asset.criticality ?? 'unknown'}).`;
}

export function buildUserPrompt(context: DiagnosticContext): string {
  switch (context.kind) {
    case 'HOT_TEMPERATURE': {
      const readings = context.readings.map(
        (r) =>
          `- ${r.recordedAt.toISOString()}: temperature ${r.temperature} C, vibration ${r.vibration}, pressure ${r.pressure}`,
      );
      return [
        describeAsset(context.asset),
        `Alert: the last ${context.readings.length} readings all exceeded ${context.thresholdC} C (newest first):`,
        ...readings,
      ].join('\n');
    }
    case 'OVERDUE_MAINTENANCE':
      return [
        context.asset ? describeAsset(context.asset) : 'Asset: unknown.',
        `Alert: maintenance plan "${context.planName}" (every ${context.intervalDays} days) is overdue${
          context.dueAt ? `, it was due ${context.dueAt.toISOString()}` : ''
        }.`,
      ].join('\n');
    case 'LOW_STOCK':
      return `Alert: spare part ${context.sku} (${context.partName}) is at or below its reorder threshold: ${context.quantityOnHand} on hand, threshold ${context.reorderThreshold}.`;
  }
}
