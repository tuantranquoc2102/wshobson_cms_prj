import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { safeJoin } from '@/server/lib/files';

const ROOT = path.resolve('/srv/uploads');

describe('safeJoin', () => {
  it('joins a normal relative path', () => {
    const out = safeJoin(ROOT, '2026/05/abc.png');
    expect(out).toBe(path.resolve(ROOT, '2026/05/abc.png'));
  });

  it('rejects parent-traversal `..`', () => {
    expect(() => safeJoin(ROOT, '../etc/passwd')).toThrow();
    expect(() => safeJoin(ROOT, 'foo/../../secret')).toThrow();
  });

  it('rejects URL-encoded `..%2F`', () => {
    expect(() => safeJoin(ROOT, '..%2Fetc%2Fpasswd')).toThrow();
    expect(() => safeJoin(ROOT, '%2E%2E%2Fpasswd')).toThrow();
  });

  it('rejects absolute paths', () => {
    expect(() => safeJoin(ROOT, '/etc/passwd')).toThrow();
    if (process.platform === 'win32') {
      expect(() => safeJoin(ROOT, 'C:/Windows/System32')).toThrow();
    }
  });

  it('rejects NUL bytes', () => {
    expect(() => safeJoin(ROOT, 'foo\u0000bar')).toThrow();
  });

  it('rejects malformed percent-encoding', () => {
    expect(() => safeJoin(ROOT, '%E0%A4%A')).toThrow();
  });
});
