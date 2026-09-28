export interface AssetSummary {
  tag: string;
  typeName: string | null;
  criticality: string | null;
}

export interface HotTemperatureContext {
  kind: 'HOT_TEMPERATURE';
  asset: AssetSummary;
  thresholdC: number;
  readings: {
    temperature: number;
    vibration: number;
    pressure: number;
    recordedAt: Date;
  }[];
}

export interface OverdueMaintenanceContext {
  kind: 'OVERDUE_MAINTENANCE';
  asset: AssetSummary | null;
  planName: string;
  intervalDays: number;
  dueAt: Date | null;
}

export interface LowStockContext {
  kind: 'LOW_STOCK';
  partName: string;
  sku: string;
  quantityOnHand: number;
  reorderThreshold: number;
}

export type DiagnosticContext =
  HotTemperatureContext | OverdueMaintenanceContext | LowStockContext;
