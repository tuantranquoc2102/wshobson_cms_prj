import { z } from 'zod';
import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { validateQuery } from '@/server/http/withValidation';
import { RevisionService } from '@/server/services/revision.service';

const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

type Params = { id: string };

export const GET = withAuth<Params>(async (req, { params, session }) => {
  const { id } = await params;
  const q = validateQuery(QuerySchema, req);
  const page = await RevisionService.list(
    id,
    { page: q.page, pageSize: q.pageSize },
    session,
  );
  return ok(page);
});
