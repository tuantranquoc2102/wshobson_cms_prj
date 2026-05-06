import { withAuth } from '@/server/http/withAuth';
import { ok } from '@/server/http/respond';
import { validateBody, validateQuery } from '@/server/http/withValidation';
import {
  CreateUserSchema,
  UserListQuerySchema,
} from '@/server/schemas/user.schema';
import { UserService } from '@/server/services/user.service';

export const GET = withAuth(
  async (req) => {
    const q = validateQuery(UserListQuerySchema, req);
    const page = await UserService.list({ page: q.page, pageSize: q.pageSize });
    return ok(page);
  },
  { roles: ['ADMIN'] },
);

export const POST = withAuth(
  async (req, { session }) => {
    const body = await validateBody(CreateUserSchema, req);
    const user = await UserService.create(body, session);
    return ok(user, { status: 201 });
  },
  { roles: ['ADMIN'] },
);
