import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { ApiError } from '@/server/http/apiError';
import { RevisionService } from '@/server/services/revision.service';

type Params = { id: string; version: string };

export const POST = withAuth<Params>(
  async (_req, { params, session }) => {
    const { id, version } = await params;
    const v = Number.parseInt(version, 10);
    if (!Number.isFinite(v) || v <= 0) {
      throw new ApiError('BAD_REQUEST', 'Invalid revision version', 400);
    }
    const restored = await RevisionService.restore(id, v, session);
    return ok(restored);
  },
  { roles: ['EDITOR', 'ADMIN'] },
);
