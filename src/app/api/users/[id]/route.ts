import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { validateBody } from '@/server/http/withValidation';
import { UpdateUserSchema } from '@/server/schemas/user.schema';
import { UserService } from '@/server/services/user.service';

type Params = { id: string };

export const PATCH = withAuth<Params>(
  async (req, { params, session }) => {
    const { id } = await params;
    const body = await validateBody(UpdateUserSchema, req);
    const updated = await UserService.update(id, body, session);
    return ok(updated);
  },
  { roles: ['ADMIN'] },
);
