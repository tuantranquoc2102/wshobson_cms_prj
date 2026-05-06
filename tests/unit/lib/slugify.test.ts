import { describe, expect, it } from 'vitest';
import { slugify } from '@/server/lib/slugify';

describe('slugify', () => {
  it('lowercases and trims', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('replaces underscores and whitespace runs with single dashes', () => {
    expect(slugify('foo   bar___baz')).toBe('foo-bar-baz');
  });

  it('drops characters outside [a-z0-9-]', () => {
    expect(slugify("It's a Test! 2026 © ")).toBe('its-a-test-2026');
  });

  it('collapses runs of dashes', () => {
    expect(slugify('a---b')).toBe('a-b');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('returns an empty string for input with no slug-safe characters', () => {
    expect(slugify('!!!')).toBe('');
  });
});
