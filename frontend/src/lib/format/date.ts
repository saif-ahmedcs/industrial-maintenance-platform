import { PLANT_TIMEZONE } from './timezone';

export function formatDateTime(
  iso: string,
  timeZone: string = PLANT_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${part('day')} ${part('month')} ${part('year')} ${part('hour')}:${part('minute')}`;
}

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] =
  [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];

const relativeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const diffSeconds = (new Date(iso).getTime() - now.getTime()) / 1000;

  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return relativeFormatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return relativeFormatter.format(0, 'second');
}
