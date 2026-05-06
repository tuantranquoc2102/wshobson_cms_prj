import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { prisma } from '@/server/db/prisma';
import { ApiError } from '@/server/http/apiError';
import { toResponse } from '@/server/http/respond';
import { safeJoin, uploadRoot } from '@/server/lib/files';

type Params = { path: string[] };

export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  try {
    const { path: parts } = await ctx.params;
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new ApiError('BAD_REQUEST', 'Missing path', 400);
    }
    const rel = parts.join('/');

    let absPath: string;
    try {
      absPath = safeJoin(uploadRoot(), rel);
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid path', 400);
    }

    let info: Awaited<ReturnType<typeof stat>>;
    try {
      info = await stat(absPath);
    } catch {
      throw new ApiError('NOT_FOUND', 'File not found', 404);
    }
    if (!info.isFile()) {
      throw new ApiError('NOT_FOUND', 'File not found', 404);
    }

    // Look up the matching Media row to determine the canonical mime type.
    const row = await prisma.media.findUnique({
      where: { storagePath: rel },
      select: { mimeType: true },
    });
    if (!row) {
      throw new ApiError('NOT_FOUND', 'File not found', 404);
    }

    const nodeStream = createReadStream(absPath);
    // Cast Node's Readable into a Web ReadableStream — Next.js / undici
    // accepts either, but the typing pretends we always have the latter.
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': row.mimeType,
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return toResponse(err);
  }
}
