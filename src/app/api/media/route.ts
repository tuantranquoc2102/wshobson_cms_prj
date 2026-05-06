import { prisma } from '@/server/db/prisma';
import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { ApiError } from '@/server/http/apiError';
import { validateQuery } from '@/server/http/withValidation';
import { MediaListQuerySchema } from '@/server/schemas/media.schema';
import { MediaService } from '@/server/services/media.service';
import type { Prisma } from '@prisma/client';

export const GET = withAuth(async (req, { session }) => {
  const q = validateQuery(MediaListQuerySchema, req);
  const where: Prisma.MediaWhereInput = {};
  if (session.role !== 'EDITOR' && session.role !== 'ADMIN') {
    where.uploadedById = session.id;
  }
  if (q.mime) where.mimeType = q.mime;
  const skip = Math.max(0, (q.page - 1) * q.pageSize);
  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: q.pageSize,
    }),
    prisma.media.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pageSize: q.pageSize });
});

export const POST = withAuth(
  async (req, { session }) => {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      throw new ApiError('BAD_REQUEST', 'Expected multipart/form-data', 400);
    }
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ApiError('UNPROCESSABLE', 'Missing "file" field', 422);
    }
    const altRaw = formData.get('altText');
    const altText =
      typeof altRaw === 'string' && altRaw.trim().length > 0
        ? altRaw.trim()
        : undefined;
    const created = await MediaService.upload(file, session, altText);
    return ok(created, { status: 201 });
  },
  { roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
);
