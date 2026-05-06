import { withAuth } from '@/server/http/withAuth';
import { noContent } from '@/server/http/respond';
import { MediaService } from '@/server/services/media.service';

type Params = { id: string };

export const DELETE = withAuth<Params>(async (_req, { params, session }) => {
  const { id } = await params;
  await MediaService.delete(id, session);
  return noContent();
});
