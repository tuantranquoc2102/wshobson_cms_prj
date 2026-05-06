/**
 * MediaService integration test against a real Postgres
 * (`TEST_DATABASE_URL`). Writes go to an isolated temp upload root so we
 * don't pollute the project's `uploads/` directory.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { HAS_TEST_DB, getPrisma, resetDb, seedUser } from './_setup';
import type { SessionUser } from '@/server/types/session';

const maybe = HAS_TEST_DB ? describe : describe.skip;

maybe('Media service (integration)', () => {
  let editor: SessionUser;
  let tempRoot: string;
  let originalCwd: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-secret-test-secret-test-secret';
    await resetDb();
    const e = await seedUser({
      email: 'media-editor@local',
      password: 'pass1234',
      role: 'EDITOR',
      name: 'MediaEditor',
    });
    editor = {
      id: e.id,
      email: 'media-editor@local',
      role: 'EDITOR',
      name: 'MediaEditor',
    };

    // `uploadRoot()` is `path.resolve(process.cwd(), 'uploads')` — chdir to
    // an empty temp directory so the integration test stays self-contained.
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cms-media-it-'));
    originalCwd = process.cwd();
    process.chdir(tempRoot);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await rm(tempRoot, { recursive: true, force: true });
    await getPrisma().$disconnect();
  });

  it('uploads a small PNG and persists metadata + file on disk', async () => {
    const { MediaService } = await import('@/server/services/media.service');

    // Smallest possible valid PNG (1×1, 8-bit RGBA, transparent).
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    const file = new File([pngBytes], 'tiny.png', { type: 'image/png' });

    const created = await MediaService.upload(file, editor, 'a tiny dot');
    expect(created.id).toBeTruthy();
    expect(created.kind).toBe('IMAGE');
    expect(created.altText).toBe('a tiny dot');

    const onDisk = await stat(path.resolve(tempRoot, 'uploads', created.storagePath));
    expect(onDisk.isFile()).toBe(true);
  });

  it('rejects unsupported MIME types without writing to disk', async () => {
    const { MediaService } = await import('@/server/services/media.service');
    const evil = new File([Buffer.from('MZ')], 'evil.exe', {
      type: 'application/x-msdownload',
    });
    await expect(MediaService.upload(evil, editor)).rejects.toMatchObject({
      code: 'UNPROCESSABLE',
    });
  });
});
