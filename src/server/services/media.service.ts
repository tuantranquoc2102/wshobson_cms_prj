import 'server-only';
import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import type { Media, MediaKind } from '@prisma/client';
import { MediaRepo } from '@/server/db/repos/media.repo';
import { ApiError } from '@/server/http/apiError';
import {
  ALLOWED_MIME_TYPES,
  extFromMime,
  safeJoin,
  uploadRoot,
} from '@/server/lib/files';
import { ActivityService } from './activity.service';
import { logger } from '@/server/lib/logger';
import type { SessionUser } from '@/server/types/session';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function kindFromMime(mime: string): MediaKind {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime === 'application/pdf') return 'DOCUMENT';
  return 'OTHER';
}

/** Order-preserving id good enough for file naming: timestamp prefix + uuid. */
function newMediaId(): string {
  const ts = Date.now().toString(36);
  return `${ts}-${crypto.randomUUID()}`;
}

/** Best-effort image dimension lookup via `sharp` if available. */
async function readImageDimensions(
  buffer: Buffer,
  mime: string,
): Promise<{ width?: number; height?: number }> {
  if (!mime.startsWith('image/')) return {};
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default;
    const meta = await sharp(buffer).metadata();
    return { width: meta.width, height: meta.height };
  } catch (err) {
    logger.debug({ err }, 'sharp metadata read failed; continuing without dimensions');
    return {};
  }
}

export const MediaService = {
  async upload(
    file: File,
    session: SessionUser,
    altText?: string,
  ): Promise<Media> {
    if (!(file instanceof File)) {
      throw new ApiError('BAD_REQUEST', 'Missing file in request', 400);
    }
    if (file.size === 0) {
      throw new ApiError('UNPROCESSABLE', 'Empty file', 422);
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError('UNPROCESSABLE', 'File exceeds 10MB limit', 413);
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      throw new ApiError('UNPROCESSABLE', `Unsupported MIME type: ${mime}`, 415);
    }

    const id = newMediaId();
    const ext = extFromMime(mime);
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const relPath = path.posix.join(yyyy, mm, `${id}.${ext}`);

    const root = uploadRoot();
    // safeJoin guards even though we synthesized the path ourselves.
    const absPath = safeJoin(root, relPath);
    await mkdir(path.dirname(absPath), { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absPath, buffer);

    const { width, height } = await readImageDimensions(buffer, mime);

    // We store `relPath` (POSIX-style) so cross-platform retrieval works.
    let row: Media;
    try {
      row = await MediaRepo.create({
        filename: file.name || `${id}.${ext}`,
        storagePath: relPath,
        mimeType: mime,
        kind: kindFromMime(mime),
        sizeBytes: file.size,
        width,
        height,
        altText,
        uploadedById: session.id,
      });
    } catch (err) {
      // DB insert failed — orphan the file we just wrote.
      try {
        await unlink(absPath);
      } catch (cleanupErr) {
        logger.warn({ cleanupErr }, 'failed to clean up orphan upload');
      }
      throw err;
    }

    await ActivityService.record({
      actorId: session.id,
      action: 'media.upload',
      entityType: 'Media',
      entityId: row.id,
      metadata: { mime, sizeBytes: file.size },
    });
    return row;
  },

  async delete(id: string, session: SessionUser): Promise<void> {
    const row = await MediaRepo.findById(id);
    if (!row) throw new ApiError('NOT_FOUND', 'Media not found', 404);
    const isOwner = row.uploadedById === session.id;
    const isEditorPlus =
      session.role === 'EDITOR' || session.role === 'ADMIN';
    if (!isOwner && !isEditorPlus) {
      throw new ApiError('FORBIDDEN', 'Cannot delete this media', 403);
    }

    // Unlink first; if it's already missing we still want the row gone.
    const absPath = safeJoin(uploadRoot(), row.storagePath);
    try {
      await unlink(absPath);
    } catch (err) {
      logger.warn({ err, absPath }, 'failed to unlink media file; deleting row anyway');
    }
    await MediaRepo.delete(id);

    await ActivityService.record({
      actorId: session.id,
      action: 'media.delete',
      entityType: 'Media',
      entityId: id,
    });
  },
};
