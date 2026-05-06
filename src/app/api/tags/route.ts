import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { validateBody } from '@/server/http/withValidation';
import { TagSchema } from '@/server/schemas/taxonomy.schema';
import { TaxonomyService } from '@/server/services/taxonomy.service';

export const GET = withAuth(async () => {
  const items = await TaxonomyService.listTags();
  return ok(items);
});

export const POST = withAuth(
  async (req, { session }) => {
    const body = await validateBody(TagSchema, req);
    const created = await TaxonomyService.createTag(body, session);
    return ok(created, { status: 201 });
  },
  { roles: ['EDITOR', 'ADMIN'] },
);
