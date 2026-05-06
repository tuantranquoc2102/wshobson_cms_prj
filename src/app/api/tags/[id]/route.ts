import { withAuth } from '@/server/http/withAuth';
import { noContent, ok } from '@/server/http/respond';
import { validateBody } from '@/server/http/withValidation';
import { TagSchema } from '@/server/schemas/taxonomy.schema';
import { TaxonomyService } from '@/server/services/taxonomy.service';

type Params = { id: string };

export const PATCH = withAuth<Params>(
  async (req, { params, session }) => {
    const { id } = await params;
    const body = await validateBody(TagSchema, req);
    const updated = await TaxonomyService.updateTag(id, body, session);
    return ok(updated);
  },
  { roles: ['EDITOR', 'ADMIN'] },
);

export const DELETE = withAuth<Params>(
  async (_req, { params, session }) => {
    const { id } = await params;
    await TaxonomyService.deleteTag(id, session);
    return noContent();
  },
  { roles: ['EDITOR', 'ADMIN'] },
);
