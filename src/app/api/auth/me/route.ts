import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';

export const GET = withAuth(async (_req, { session }) => {
  return ok(session);
});
