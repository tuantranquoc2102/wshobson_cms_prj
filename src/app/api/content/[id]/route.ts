import { withAuth } from '@/server/http/withAuth';
import { noContent, ok } from '@/server/http/respond';
import { validateBody } from '@/server/http/withValidation';
import { UpdateContentSchema } from '@/server/schemas/content.schema';
import { ContentService } from '@/server/services/content.service';

type Params = { id: string };

export const GET = withAuth<Params>(async (_req, { params, session }) => {
  const { id } = await params;
  const detail = await ContentService.getById(id, session);
  return ok(detail);
});

export const PATCH = withAuth<Params>(async (req, { params, session }) => {
  const { id } = await params;
  const body = await validateBody(UpdateContentSchema, req);
  // Defensive: never trust the client to set status here.
  if ('status' in body) {
    delete (body as Record<string, unknown>).status;
  }
  const updated = await ContentService.update(id, body, session);
  return ok(updated);
});

export const DELETE = withAuth<Params>(async (_req, { params, session }) => {
  const { id } = await params;
  await ContentService.softDelete(id, session);
  return noContent();
});
