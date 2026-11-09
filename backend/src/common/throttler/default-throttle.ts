export function defaultThrottleLimit(): number {
  const PRODUCTION_DEFAULT = 60;
  const raw = process.env.DEFAULT_RATE_LIMIT;
  if (raw === undefined || raw === '') return PRODUCTION_DEFAULT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : PRODUCTION_DEFAULT;
}
