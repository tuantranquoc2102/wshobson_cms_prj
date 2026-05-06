import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { validateBody, validateQuery } from '@/server/http/withValidation';
import {
  ContentListQuerySchema,
  CreateContentSchema,
} from '@/server/schemas/content.schema';
import { ContentService } from '@/server/services/content.service';

export const GET = withAuth(async (req, { session }) => {
  const q = validateQuery(ContentListQuerySchema, req);
  const page = await ContentService.list(q, session);
  return ok(page);
});

export const POST = withAuth(
  async (req, { session }) => {
    const body = await validateBody(CreateContentSchema, req);
    const created = await ContentService.create(body, session);
    return ok(created, { status: 201 });
  },
  { roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
);
