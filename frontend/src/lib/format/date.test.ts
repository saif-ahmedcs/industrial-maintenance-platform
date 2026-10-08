import { describe, expect, it } from 'vitest';
import { formatDateTime, formatRelativeTime } from './date';

describe('formatDateTime', () => {
  it('rolls over to the correct local date near UTC midnight in a non-UTC timezone', () => {
    expect(formatDateTime('2026-10-07T22:30:00Z', 'Africa/Cairo')).toBe(
      '08 Oct 2026 01:30',
    );
  });

  it('defaults to the plant timezone when none is passed', () => {
    expect(formatDateTime('2026-10-08T14:05:00Z')).toBe('08 Oct 2026 14:05');
  });

  it('uses the dd MMM yyyy HH:mm 24-hour order from decisions.md #12', () => {
    expect(formatDateTime('2026-01-05T09:03:00Z', 'UTC')).toBe(
      '05 Jan 2026 09:03',
    );
  });
});

describe('formatRelativeTime', () => {
  it('formats a few minutes in the past', () => {
    const now = new Date('2026-10-08T14:35:00Z');
    expect(formatRelativeTime('2026-10-08T14:32:00Z', now)).toBe(
      '3 minutes ago',
    );
  });

  it('formats a future timestamp', () => {
    const now = new Date('2026-10-08T14:35:00Z');
    expect(formatRelativeTime('2026-10-08T14:40:00Z', now)).toBe(
      'in 5 minutes',
    );
  });
});
