import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { validateBody } from '@/server/http/withValidation';
import { TransitionSchema } from '@/server/schemas/content.schema';
import { ContentService } from '@/server/services/content.service';

type Params = { id: string };

export const POST = withAuth<Params>(
  async (req, { params, session }) => {
    const { id } = await params;
    const { to } = await validateBody(TransitionSchema, req);
    const updated = await ContentService.transitionStatus(id, to, session);
    return ok(updated);
  },
  { roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
);
