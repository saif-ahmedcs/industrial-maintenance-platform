export const HOT_TEMPERATURE_THRESHOLD_C = 80;
export const CONSECUTIVE_HOT_READINGS_REQUIRED = 3;

export interface RuleReading {
  temperature: number;
}

/**
 * Trips when the latest 3 readings are all above the hot temperature threshold.
 * Readings must be ordered newest-first.
 */
export function tripsHotTemperatureRule(
  readingsNewestFirst: RuleReading[],
): boolean {
  if (readingsNewestFirst.length < CONSECUTIVE_HOT_READINGS_REQUIRED) {
    return false;
  }
  return readingsNewestFirst
    .slice(0, CONSECUTIVE_HOT_READINGS_REQUIRED)
    .every((reading) => reading.temperature > HOT_TEMPERATURE_THRESHOLD_C);
}
