import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatBytes, formatDate, formatRelative } from '@/lib/formatters';

describe('formatBytes', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatBytes(null)).toBe('');
    expect(formatBytes(undefined)).toBe('');
  });

  it('keeps small values in bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('rolls up to KB / MB / GB / TB', () => {
    expect(formatBytes(2048)).toBe('2 KB');
    // 1.5 MiB → "2 MB" because the format rounds up at 2 sig figs.
    expect(formatBytes(1.5 * 1024 * 1024)).toMatch(/MB$/);
    expect(formatBytes(2 * 1024 ** 3)).toMatch(/GB$/);
    expect(formatBytes(3 * 1024 ** 4)).toMatch(/TB$/);
  });
});

describe('formatDate', () => {
  it('returns empty string for null / undefined / invalid', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });

  it('renders all three formats non-empty for a known date', () => {
    const d = new Date('2026-05-05T12:34:56Z');
    expect(formatDate(d, 'short').length).toBeGreaterThan(0);
    expect(formatDate(d, 'long').length).toBeGreaterThan(0);
    expect(formatDate(d, 'datetime').length).toBeGreaterThan(0);
  });

  it('accepts ISO strings the same as Dates', () => {
    expect(formatDate('2026-05-05T12:00:00Z', 'short')).toBe(
      formatDate(new Date('2026-05-05T12:00:00Z'), 'short'),
    );
  });
});

describe('formatRelative', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty for null/invalid', () => {
    expect(formatRelative(null)).toBe('');
    expect(formatRelative('nope')).toBe('');
  });

  it('formats sub-minute deltas in seconds', () => {
    const out = formatRelative(new Date(Date.now() - 30_000));
    expect(out).toMatch(/second/);
  });

  it('formats hour-scale deltas in hours', () => {
    const out = formatRelative(new Date(Date.now() - 2 * 3600 * 1000));
    expect(out).toMatch(/hour/);
  });

  it('formats year-scale deltas in years', () => {
    const out = formatRelative(new Date(Date.now() - 2 * 31_536_000 * 1000));
    expect(out).toMatch(/year/);
  });

  it('handles future dates with the same units', () => {
    const out = formatRelative(new Date(Date.now() + 5 * 60 * 1000));
    expect(out).toMatch(/minute/);
  });
});
