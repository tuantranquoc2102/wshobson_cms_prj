import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/server/db/repos/media.repo', () => ({
  MediaRepo: {
    create: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/server/services/activity.service', () => ({
  ActivityService: { record: vi.fn().mockResolvedValue(undefined) },
}));

import { MediaService } from '@/server/services/media.service';
import { MediaRepo } from '@/server/db/repos/media.repo';
import type { SessionUser } from '@/server/types/session';

const session: SessionUser = {
  id: 'u1',
  email: 'a@b',
  name: 'A',
  role: 'AUTHOR',
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

function makeFile(opts: {
  name: string;
  type: string;
  size: number;
}): File {
  const bytes = new Uint8Array(opts.size);
  // We construct a Blob-backed File via the global File constructor.
  return new File([bytes], opts.name, { type: opts.type });
}

describe('MediaService.upload', () => {
  it('rejects oversized files (>10MB)', async () => {
    const big = makeFile({
      name: 'big.png',
      type: 'image/png',
      size: 11 * 1024 * 1024,
    });
    await expect(MediaService.upload(big, session)).rejects.toMatchObject({
      code: 'UNPROCESSABLE',
    });
  });

  it('rejects disallowed MIME types', async () => {
    const evil = makeFile({
      name: 'evil.exe',
      type: 'application/x-msdownload',
      size: 16,
    });
    await expect(MediaService.upload(evil, session)).rejects.toMatchObject({
      code: 'UNPROCESSABLE',
    });
  });

  it('writes a row for a small valid PNG', async () => {
    const ok = makeFile({ name: 'ok.png', type: 'image/png', size: 16 });
    vi.mocked(MediaRepo.create).mockResolvedValue({
      id: 'm1',
      filename: 'ok.png',
      storagePath: 'x',
      mimeType: 'image/png',
      kind: 'IMAGE',
      sizeBytes: 16,
      width: null,
      height: null,
      altText: null,
      uploadedById: 'u1',
      createdAt: new Date(),
    });
    const out = await MediaService.upload(ok, session, 'alt');
    expect(out.id).toBe('m1');
    expect(MediaRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'image/png', kind: 'IMAGE' }),
    );
  });

  it('rejects empty files', async () => {
    const empty = makeFile({ name: 'empty.png', type: 'image/png', size: 0 });
    await expect(MediaService.upload(empty, session)).rejects.toMatchObject({
      code: 'UNPROCESSABLE',
    });
  });

  it('does not let a malicious filename escape the upload root', async () => {
    // Even if the client supplies a filename like "../../etc/passwd.png",
    // the on-disk storagePath is derived from a server-generated id and
    // year/month — the attacker filename is only echoed back as `filename`
    // (a DB column for display) and must never appear in storagePath.
    const evil = makeFile({
      name: '../../etc/passwd.png',
      type: 'image/png',
      size: 32,
    });
    vi.mocked(MediaRepo.create).mockImplementation(async (input) => ({
      id: 'm1',
      filename: input.filename,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      kind: input.kind,
      sizeBytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      altText: input.altText ?? null,
      uploadedById: input.uploadedById,
      createdAt: new Date(),
    }));
    await MediaService.upload(evil, session);
    const callArg = vi.mocked(MediaRepo.create).mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    if (!callArg) throw new Error('expected create call');
    // storagePath must not contain `..` segments or absolute prefixes.
    expect(callArg.storagePath).not.toContain('..');
    expect(callArg.storagePath.startsWith('/')).toBe(false);
    expect(/^[A-Za-z]:/.test(callArg.storagePath)).toBe(false);
    // It should look like `YYYY/MM/<id>.png` — the attacker's filename does
    // not influence the on-disk layout.
    expect(callArg.storagePath).toMatch(/^\d{4}\/\d{2}\/[^/\\]+\.png$/);
  });
});

describe('MediaService.delete', () => {
  it('owner can delete their own media', async () => {
    vi.mocked(MediaRepo.findById).mockResolvedValue({
      id: 'm1',
      uploadedById: session.id,
      storagePath: '2026/05/x.png',
      filename: 'x.png',
      mimeType: 'image/png',
      kind: 'IMAGE',
      sizeBytes: 1,
      width: null,
      height: null,
      altText: null,
      createdAt: new Date(),
    });
    await MediaService.delete('m1', session);
    expect(MediaRepo.delete).toHaveBeenCalledWith('m1');
  });

  it('non-owner non-editor cannot delete (403)', async () => {
    vi.mocked(MediaRepo.findById).mockResolvedValue({
      id: 'm1',
      uploadedById: 'someone-else',
      storagePath: '2026/05/x.png',
      filename: 'x.png',
      mimeType: 'image/png',
      kind: 'IMAGE',
      sizeBytes: 1,
      width: null,
      height: null,
      altText: null,
      createdAt: new Date(),
    });
    await expect(MediaService.delete('m1', session)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('returns 404 when the media does not exist', async () => {
    vi.mocked(MediaRepo.findById).mockResolvedValue(null);
    await expect(MediaService.delete('mZ', session)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});
