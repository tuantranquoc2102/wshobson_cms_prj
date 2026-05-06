import 'server-only';
import type { Media, MediaKind, Prisma } from '@prisma/client';
import { prisma as defaultClient } from '@/server/db/prisma';
import type { Pagination } from '@/server/types/pagination';
import { toSkip } from '@/server/types/pagination';

type Db = Prisma.TransactionClient | typeof defaultClient;

function db(tx?: Prisma.TransactionClient): Db {
  return tx ?? defaultClient;
}

export const MediaRepo = {
  /** Insert metadata for a freshly-uploaded file. */
  create(
    input: {
      filename: string;
      storagePath: string;
      mimeType: string;
      kind: MediaKind;
      sizeBytes: number;
      width?: number;
      height?: number;
      altText?: string;
      uploadedById: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Media> {
    return db(tx).media.create({
      data: {
        filename: input.filename,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        kind: input.kind,
        sizeBytes: input.sizeBytes,
        width: input.width ?? null,
        height: input.height ?? null,
        altText: input.altText ?? null,
        uploadedById: input.uploadedById,
      },
    });
  },

  findById(id: string, tx?: Prisma.TransactionClient): Promise<Media | null> {
    return db(tx).media.findUnique({ where: { id } });
  },

  /** "My uploads" gallery — newest first, paginated. */
  listByUploader(
    userId: string,
    p: Pagination,
    tx?: Prisma.TransactionClient,
  ): Promise<Media[]> {
    return db(tx).media.findMany({
      where: { uploadedById: userId },
      orderBy: { createdAt: 'desc' },
      skip: toSkip(p),
      take: p.pageSize,
    });
  },

  /**
   * Hard-delete a media row. The service layer handles unlinking the file
   * on disk (and ordering the two so we never orphan the row).
   */
  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).media.delete({ where: { id } });
  },
};

export type MediaRepoType = typeof MediaRepo;
