import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { validateBody } from '@/server/http/withValidation';
import { ScheduleSchema } from '@/server/schemas/content.schema';
import { ContentService } from '@/server/services/content.service';

type Params = { id: string };

export const POST = withAuth<Params>(
  async (req, { params, session }) => {
    const { id } = await params;
    const body = await validateBody(ScheduleSchema, req);
    const updated = await ContentService.schedule(
      id,
      new Date(body.scheduledFor),
      session,
    );
    return ok(updated);
  },
  { roles: ['EDITOR', 'ADMIN'] },
);
