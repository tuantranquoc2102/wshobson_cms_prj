# Multi-Author CMS — Full-Stack Architecture Design

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Prisma · PostgreSQL · TanStack Query · react-hook-form · Zod · shadcn/ui · Tailwind · jose (JWT) · bcrypt · pino

**Posture:** Single Next.js app. No separate backend. Route Handlers under `src/app/api/*` are the API. Server-only code lives in `src/server/*` and is imported by handlers (never by client components). Database schema is final; we wrap it in repositories and a service layer.

---

## 1. Directory Layout

```
wshobson_cms_prj/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts                          # admin user, sample categories/tags
├─ public/                             # static assets (favicon, og-default.png)
├─ uploads/                            # user-uploaded media (gitignored)
│  └─ .gitkeep
├─ scripts/
│  ├─ create-admin.ts                  # CLI: bootstrap first ADMIN
│  └─ run-scheduled-publish.ts         # local cron worker (calls /api/cron)
├─ tests/
│  ├─ unit/services/                   # ContentService, AuthService, etc.
│  ├─ integration/api/                 # route handler tests w/ test DB
│  └─ e2e/                             # Playwright (login → publish flow)
├─ .env.example
├─ docker-compose.yml                  # postgres:16
├─ next.config.ts
├─ tsconfig.json
├─ package.json
└─ src/
   ├─ app/
   │  ├─ layout.tsx                    # root <html>, providers
   │  ├─ globals.css                   # tailwind + shadcn vars
   │  ├─ not-found.tsx
   │  ├─ error.tsx
   │  │
   │  ├─ (public)/
   │  │  ├─ layout.tsx                 # Header + Footer
   │  │  ├─ page.tsx                   # homepage
   │  │  ├─ blog/[slug]/page.tsx
   │  │  ├─ p/[slug]/page.tsx
   │  │  ├─ category/[slug]/page.tsx
   │  │  ├─ tag/[slug]/page.tsx
   │  │  ├─ sitemap.ts
   │  │  └─ robots.ts
   │  │
   │  ├─ (auth)/
   │  │  ├─ layout.tsx                 # centered card
   │  │  ├─ login/page.tsx
   │  │  └─ register/page.tsx
   │  │
   │  ├─ (admin)/
   │  │  ├─ layout.tsx                 # AuthGate + AdminShell
   │  │  └─ admin/
   │  │     ├─ page.tsx                # dashboard
   │  │     ├─ content/
   │  │     │  ├─ page.tsx
   │  │     │  ├─ new/page.tsx
   │  │     │  └─ [id]/
   │  │     │     ├─ edit/page.tsx
   │  │     │     └─ revisions/page.tsx
   │  │     ├─ media/page.tsx
   │  │     ├─ categories/page.tsx
   │  │     ├─ tags/page.tsx
   │  │     ├─ users/page.tsx          # ADMIN
   │  │     └─ review-queue/page.tsx   # EDITOR+
   │  │
   │  ├─ uploads/[...path]/route.ts    # streams files from ./uploads
   │  │
   │  └─ api/
   │     ├─ health/route.ts
   │     ├─ auth/{register,login,refresh,logout,me}/route.ts
   │     ├─ users/{route.ts, [id]/route.ts}
   │     ├─ content/
   │     │  ├─ route.ts
   │     │  └─ [id]/
   │     │     ├─ route.ts
   │     │     ├─ transition/route.ts
   │     │     ├─ schedule/route.ts
   │     │     └─ revisions/{route.ts, [version]/restore/route.ts}
   │     ├─ categories/{route.ts, [id]/route.ts}
   │     ├─ tags/{route.ts, [id]/route.ts}
   │     ├─ media/{route.ts, [id]/route.ts}
   │     ├─ public/posts/{route.ts, [slug]/route.ts}
   │     ├─ public/pages/[slug]/route.ts
   │     ├─ public/categories/[slug]/posts/route.ts
   │     ├─ public/tags/[slug]/posts/route.ts
   │     └─ cron/publish-scheduled/route.ts
   │
   ├─ server/                          # SERVER-ONLY (import 'server-only')
   │  ├─ db/
   │  │  ├─ prisma.ts                  # singleton PrismaClient
   │  │  └─ repos/
   │  │     ├─ user.repo.ts
   │  │     ├─ refreshToken.repo.ts
   │  │     ├─ content.repo.ts
   │  │     ├─ revision.repo.ts
   │  │     ├─ taxonomy.repo.ts
   │  │     ├─ media.repo.ts
   │  │     └─ activityLog.repo.ts
   │  ├─ services/
   │  │  ├─ auth.service.ts
   │  │  ├─ user.service.ts
   │  │  ├─ content.service.ts
   │  │  ├─ revision.service.ts
   │  │  ├─ taxonomy.service.ts
   │  │  ├─ media.service.ts
   │  │  ├─ publishing.service.ts
   │  │  └─ activity.service.ts
   │  ├─ lib/
   │  │  ├─ jwt.ts                     # jose sign/verify
   │  │  ├─ password.ts                # bcrypt wrappers
   │  │  ├─ slugify.ts                 # slug + uniqueness loop
   │  │  ├─ files.ts                   # safe path resolution
   │  │  ├─ logger.ts                  # pino
   │  │  ├─ requestId.ts
   │  │  ├─ rateLimit.ts               # in-memory token bucket
   │  │  ├─ markdown.ts                # rehype-sanitize render
   │  │  └─ cookies.ts                 # refresh cookie helpers
   │  ├─ schemas/
   │  │  ├─ auth.schema.ts
   │  │  ├─ content.schema.ts
   │  │  ├─ taxonomy.schema.ts
   │  │  ├─ media.schema.ts
   │  │  └─ user.schema.ts
   │  ├─ http/
   │  │  ├─ withAuth.ts
   │  │  ├─ withValidation.ts
   │  │  ├─ apiError.ts
   │  │  └─ respond.ts
   │  └─ types/
   │     ├─ session.ts
   │     └─ pagination.ts
   │
   ├─ components/
   │  ├─ ui/                           # shadcn primitives
   │  ├─ public/                       # Header, Footer, PostCard, PostList, PostBody, PaginationBar, CategoryNav
   │  ├─ admin/                        # AdminLayout, AdminSidebar, AdminTopbar, AdminBreadcrumbs, AuthGate, RoleGate
   │  ├─ content/                      # ContentForm, ContentTable, StatusBadge, TransitionButtons, SchedulePicker, MarkdownEditor, CategoryPicker, TagPicker, RevisionList
   │  ├─ media/                        # MediaPicker, MediaGrid, UploadDropzone
   │  ├─ taxonomy/                     # CategoryTable, TagTable
   │  ├─ users/                        # UserTable
   │  └─ common/                       # DataTable, EmptyState, ConfirmDialog, FormField, Spinner
   │
   └─ lib/                             # CLIENT-SAFE
      ├─ api/{client.ts, errors.ts}
      ├─ auth/{AuthContext.tsx, tokenStore.ts, useAuth.ts}
      ├─ hooks/use*.ts
      ├─ providers/{QueryProvider.tsx, ToastProvider.tsx}
      ├─ queryKeys.ts
      ├─ formatters.ts
      ├─ roles.ts
      └─ types.ts
```

---

## 2. Backend Architecture

### 2.1 Route Handler Map

Auth = Bearer access token unless noted. "owns" = `content.authorId === session.userId`. All mutations log to ActivityLog.

| Method | Path | Auth | Role | Request | Response | Service / Repo | Errors |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | none | – | `RegisterSchema` | `{ user, accessToken }` + cookie | AuthService.register | 409 email, 422 validation |
| POST | `/api/auth/login` | none | – | `LoginSchema` | `{ user, accessToken }` + cookie | AuthService.login | 401, 429 |
| POST | `/api/auth/refresh` | refresh cookie | – | – | `{ accessToken }` rotated cookie | AuthService.rotateRefresh | 401 |
| POST | `/api/auth/logout` | refresh cookie | – | – | `{ ok: true }` | AuthService.revoke | – |
| GET  | `/api/auth/me` | yes | any | – | `SessionUser` | UserRepo.findById | 401 |
| GET  | `/api/users` | yes | ADMIN | `?page&q&role` | `Page<User>` | UserRepo.list | 403 |
| POST | `/api/users` | yes | ADMIN | `CreateUserSchema` | `User` | UserService.create | 409, 422 |
| PATCH| `/api/users/[id]` | yes | ADMIN | `UpdateUserSchema` | `User` | UserService.update | 404, 422 |
| GET  | `/api/content` | yes | any (visibility-filtered) | `?type&status&authorId&q&categoryId&tagId&page&pageSize` | `Page<ContentSummary>` | ContentService.list | 403 |
| POST | `/api/content` | yes | AUTHOR+ | `CreateContentSchema` | `Content` | ContentService.create | 409 slug, 422 |
| GET  | `/api/content/[id]` | yes | author-of OR EDITOR+ | – | `ContentDetail` | ContentRepo.findById | 403, 404 |
| PATCH| `/api/content/[id]` | yes | author-of (DRAFT only) OR EDITOR+ | `UpdateContentSchema` | `Content` | ContentService.update | 403, 404, 409, 422 |
| DELETE| `/api/content/[id]` | yes | EDITOR+ OR author-of-own-DRAFT | – | `{ ok: true }` | ContentService.softDelete | 403, 404 |
| POST | `/api/content/[id]/transition` | yes | role-aware | `{ to: Status }` | `Content` | ContentService.transitionStatus | 403, 409 invalid transition |
| POST | `/api/content/[id]/schedule` | yes | EDITOR+ | `{ scheduledFor: ISO }` | `Content` | ContentService.schedule | 403, 422 past date |
| GET  | `/api/content/[id]/revisions` | yes | author-of OR EDITOR+ | `?page` | `Page<RevisionSummary>` | RevisionRepo.listByContent | 403, 404 |
| POST | `/api/content/[id]/revisions/[version]/restore` | yes | EDITOR+ | – | `Content` | RevisionService.restore | 403, 404 |
| GET  | `/api/categories` | yes | any | `?q` | `Category[]` | TaxonomyRepo.listCategories | – |
| POST | `/api/categories` | yes | EDITOR+ | `CategorySchema` | `Category` | TaxonomyService.createCategory | 409, 422 |
| PATCH| `/api/categories/[id]` | yes | EDITOR+ | `CategorySchema` | `Category` | TaxonomyService.updateCategory | 404, 409 |
| DELETE| `/api/categories/[id]` | yes | EDITOR+ | – | `{ ok: true }` | TaxonomyService.deleteCategory | 404, 409 in-use |
| GET  | `/api/tags` | yes | any | `?q` | `Tag[]` | TaxonomyRepo.listTags | – |
| POST | `/api/tags` | yes | EDITOR+ | `TagSchema` | `Tag` | TaxonomyService.createTag | 409, 422 |
| PATCH| `/api/tags/[id]` | yes | EDITOR+ | `TagSchema` | `Tag` | TaxonomyService.updateTag | 404, 409 |
| DELETE| `/api/tags/[id]` | yes | EDITOR+ | – | `{ ok: true }` | TaxonomyService.deleteTag | 404 |
| POST | `/api/media` | yes | AUTHOR+ | `multipart/form-data` (file, alt?) | `Media` | MediaService.upload | 413, 415, 422 |
| GET  | `/api/media` | yes | any (own; all if EDITOR+) | `?page&mime` | `Page<Media>` | MediaRepo.list | – |
| DELETE| `/api/media/[id]` | yes | owner OR EDITOR+ | – | `{ ok: true }` | MediaService.delete | 403, 404 |
| GET  | `/uploads/[...path]` | none | – | – | binary stream | files.ts safe-resolve | 400 traversal, 404 |
| GET  | `/api/public/posts` | none | – | `?page&pageSize` | `Page<PublicPost>` | ContentRepo.listPublishedPosts | – |
| GET  | `/api/public/posts/[slug]` | none | – | – | `PublicPostDetail` | ContentRepo.findPublishedBySlug | 404 |
| GET  | `/api/public/categories/[slug]/posts` | none | – | `?page` | `Page<PublicPost>` | ContentRepo.listByCategorySlug | 404 |
| GET  | `/api/public/tags/[slug]/posts` | none | – | `?page` | `Page<PublicPost>` | ContentRepo.listByTagSlug | 404 |
| GET  | `/api/public/pages/[slug]` | none | – | – | `PublicPageDetail` | ContentRepo.findPublishedPageBySlug | 404 |
| GET  | `/api/health` | none | – | – | `{ ok, db }` | prisma `SELECT 1` | 503 |
| POST | `/api/cron/publish-scheduled` | `x-cron-secret` | – | – | `{ published: number }` | PublishingService.runScheduledPublish | 401 |

**Pagination convention.** `Page<T> = { items: T[]; page: number; pageSize: number; total: number }`. Defaults: `page=1`, `pageSize=20`, max 100.

**Visibility rules in `GET /api/content`:**
- AUTHOR sees: own content (any status) + PUBLISHED of others.
- EDITOR/ADMIN see: everything except `deletedAt != null`.

### 2.2 Service Layer

- **AuthService** — `register`, `login`, `issueTokens`, `rotateRefresh`, `revoke`, `hashPassword`, `verifyPassword`. Repos: `UserRepo`, `RefreshTokenRepo`. Refresh stored sha256-hashed.
- **UserService** — admin CRUD: `list`, `create`, `updateRole`, `setActive` (soft delete).
- **ContentService** — `list`, `getById`, `create` (auto-slug + uniqueness), `update` (writes a Revision snapshot before mutating), `transitionStatus` (state machine), `schedule`, `softDelete`. Repos: `ContentRepo`, `RevisionRepo`, `TaxonomyRepo`, `ActivityLogRepo`.
- **RevisionService** — `list`, `restore` (in tx: snapshot current → load revision payload → write to Content; appends a new revision).
- **TaxonomyService** — Category/Tag CRUD; delete blocked if `_count.contents > 0` (409).
- **MediaService** — `upload`: MIME allowlist + size cap, UUIDv7 filename under `./uploads/YYYY/MM/`, optional `sharp` for image dimensions. `delete`: unlink file + remove row.
- **PublishingService** — `runScheduledPublish()`: find due, batch-publish in tx, revalidate tag `post:{slug}`. Idempotent (filters `status != PUBLISHED`).
- **ActivityService** — `record(...)`. Best-effort.

#### State Machine Transition Table

| From \ Role | AUTHOR (own only) | EDITOR | ADMIN |
|---|---|---|---|
| `DRAFT` | `IN_REVIEW`, `ARCHIVED` | `IN_REVIEW`, `PUBLISHED`, `ARCHIVED` | same as EDITOR |
| `IN_REVIEW` | `DRAFT` (withdraw) | `DRAFT`, `PUBLISHED`, `ARCHIVED` | same as EDITOR |
| `PUBLISHED` | – | `ARCHIVED`, `DRAFT` (unpublish) | same as EDITOR |
| `ARCHIVED` | – | `DRAFT` (restore) | same as EDITOR |

Entering `PUBLISHED` sets `publishedAt = now()` if null and clears `scheduledFor`. Leaving `PUBLISHED` does NOT clear `publishedAt` (history preserved).

`schedule(when)` is allowed only on `DRAFT` or `IN_REVIEW`; sets `scheduledFor`, leaves status unchanged. Cron flips it to `PUBLISHED` at the right time.

### 2.3 Auth Middleware / Helpers

```ts
// src/server/http/withAuth.ts
import 'server-only';
import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/server/lib/jwt';
import { UserRepo } from '@/server/db/repos/user.repo';
import { ApiError } from './apiError';
import { toResponse } from './respond';
import type { Role } from '@prisma/client';
import type { SessionUser } from '@/server/types/session';

type Ctx<P> = { params: Promise<P>; session: SessionUser };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>) => Promise<Response>;

export function withAuth<P = Record<string, string>>(
  handler: Handler<P>,
  opts: { roles?: Role[] } = {}
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      const header = req.headers.get('authorization') ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) throw new ApiError('UNAUTHORIZED', 'Missing access token', 401);
      const payload = await verifyAccessToken(token);
      const user = await UserRepo.findById(payload.sub);
      if (!user || user.deletedAt) throw new ApiError('UNAUTHORIZED', 'Invalid session', 401);
      if (opts.roles && !opts.roles.includes(user.role)) {
        throw new ApiError('FORBIDDEN', 'Insufficient role', 403);
      }
      const session: SessionUser = { id: user.id, email: user.email, role: user.role, name: user.name };
      return await handler(req, { params: ctx.params, session });
    } catch (err) {
      return toResponse(err);
    }
  };
}
```

**JWT.** `jose` HS256, `JWT_ACCESS_SECRET`. Access token TTL 15m, claims `{ sub, role, iat, exp, jti }`. Refresh token is a 256-bit random base64url string (NOT a JWT) — opaque, hashed with SHA-256 before insert.

**Refresh rotation flow.** On `/api/auth/refresh`: lookup by hash → assert not revoked, not expired → mark old `revokedAt = now`, `replacedByTokenId = newId` → issue new pair. If a revoked refresh is presented → revoke entire chain for that user (reuse detection) and return 401.

**Cookie attributes (refresh):** `name=cms_rt`, `httpOnly`, `sameSite=lax`, `path=/api/auth`, `secure=false` in dev / `true` in prod, `maxAge=30d`.

### 2.4 Validation

All bodies/params/queries parsed by Zod schemas in `src/server/schemas/*.ts`. ZodError → 422 with `{ code, message, fields: { path: messages[] } }`. Schemas are exported and reused on the client via `z.infer<typeof X>`.

```ts
// src/server/schemas/content.schema.ts (excerpt)
export const CreateContentSchema = z.object({
  type: z.enum(['POST', 'PAGE']),
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(160).optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().max(200_000),
  featuredMediaId: z.string().cuid().optional(),
  categoryIds: z.array(z.string().cuid()).max(10).default([]),
  tagIds: z.array(z.string().cuid()).max(20).default([]),
});
export const UpdateContentSchema = CreateContentSchema.partial();
export const TransitionSchema = z.object({ to: z.enum(['DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED']) });
export const ScheduleSchema = z.object({ scheduledFor: z.string().datetime().refine(d => new Date(d) > new Date()) });
```

### 2.5 Error Handling

```ts
// src/server/http/apiError.ts
export type ErrorCode =
  | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'CONFLICT' | 'UNPROCESSABLE' | 'RATE_LIMITED' | 'INTERNAL';
export class ApiError extends Error {
  constructor(public code: ErrorCode, message: string, public status: number, public fields?: Record<string,string[]>) { super(message); }
}
```

```ts
// src/server/http/respond.ts
export function toResponse(err: unknown): Response {
  if (err instanceof ZodError) {
    return Response.json({ error: { code: 'UNPROCESSABLE', message: 'Validation failed', fields: zodFieldMap(err) } }, { status: 422 });
  }
  if (err instanceof ApiError) {
    return Response.json({ error: { code: err.code, message: err.message, fields: err.fields } }, { status: err.status });
  }
  logger.error({ err }, 'unhandled');
  return Response.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, { status: 500 });
}
```

| Code | HTTP | When |
|---|---|---|
| `BAD_REQUEST` | 400 | Malformed input not covered by Zod |
| `UNAUTHORIZED` | 401 | Missing/invalid access token, refresh expired |
| `FORBIDDEN` | 403 | Role gate fail, not the owner |
| `NOT_FOUND` | 404 | Entity does not exist or soft-deleted |
| `CONFLICT` | 409 | Slug taken, invalid state transition, taxonomy in-use |
| `UNPROCESSABLE` | 422 | Zod validation; carries `fields` |
| `RATE_LIMITED` | 429 | Login throttle |
| `INTERNAL` | 500 | Unhandled |

### 2.6 Logging & Observability

- `pino` in `src/server/lib/logger.ts`; `pino-pretty` only in dev.
- Per-request `reqId` attached via child logger; included in error responses' headers (`x-request-id`).
- ActivityLog rows for every mutation.
- `GET /api/health` returns `{ ok: true, db: 'up'|'down', uptime }`.

---

## 3. Frontend Architecture

### 3.1 Route Map (App Router)

(See §1 for the tree.) Notes:
- `(public)` route group has its own `layout.tsx` rendering `Header`/`Footer`.
- `(auth)` is a centered card layout.
- `(admin)` wraps in `AuthGate` + `RoleGate`. `/admin/users` = ADMIN only; `/admin/review-queue` = EDITOR+.
- `app/uploads/[...path]/route.ts` validates resolved path is inside `./uploads`, sets `Content-Type` from DB row's mime, streams via `fs.createReadStream`.

### 3.2 Component Hierarchy (per-page composition)

**Public homepage** — `<PublicLayout><Header/><CategoryNav/><PostList><PostCard/>×N</PostList><PaginationBar/><Footer/>`

**Single post (`/blog/[slug]`)** — `<PostHeader>` → `<PostBody>` (markdown via `react-markdown` + `rehype-sanitize` + `rehype-highlight`) → `<PostTags>`.

**Admin shell** — `<AdminLayout><AdminSidebar/><main><AdminTopbar/><AdminBreadcrumbs/><PageContent/></main></AdminLayout>`. Sidebar items hidden by role.

**Content editor (`/admin/content/[id]/edit`)**
```
<ContentForm>
  <FormField name="title" />
  <FormField name="slug" />               # auto-generated, editable
  <CategoryPicker />                       # multi-select combobox
  <TagPicker />                            # multi-select w/ create-on-enter
  <FormField name="excerpt" />
  <MediaPicker name="featuredMediaId" />   # opens modal to MediaGrid
  <MarkdownEditor name="body" />           # @uiw/react-md-editor, lazy-loaded
  <Sidebar>
    <StatusBadge />
    <TransitionButtons />
    <SchedulePicker />                     # only DRAFT/IN_REVIEW
    <RevisionList />
  </Sidebar>
  <SaveBar />
</ContentForm>
```

**Content list** — `<ContentTable>` (DataTable) with column filters bound to URL search params. Row actions: edit, view, transition, delete.

**Media library** — `<UploadDropzone>` + `<MediaGrid>`; per-card actions: copy URL, delete.

**Review queue** — `<ContentTable>` pre-filtered to `status=IN_REVIEW`. Row actions: approve (→PUBLISHED), request changes (→DRAFT).

**Users** — `<UserTable>` (email, name, role, isActive). Inline role change, toggle active.

**Common** — `<DataTable>`, `<EmptyState>`, `<ConfirmDialog>`, `<FormField>`, `<Toast>` via `sonner`.

### 3.3 State Management

- **Server state** — TanStack Query. `QueryProvider` in root. `staleTime: 30_000`, `refetchOnWindowFocus: true`.
- **Client state** — `useState` + URL search params (deep-linkable filters).
- **Forms** — `react-hook-form` + `zodResolver` reusing `src/server/schemas/*` (these have NO server-only imports). `type CreateContentInput = z.infer<typeof CreateContentSchema>`.
- **Auth state** — `AuthContext` provider; on mount: `apiClient.get('/api/auth/me')` → 401 → try refresh → retry. Access token in module-level `tokenStore` (NOT localStorage).
- **Optimistic updates** — `transitionStatus`, `softDelete`, taxonomy create.
- **Cache invalidation** — see query keys.

```ts
// src/lib/queryKeys.ts
export const qk = {
  auth: { me: ['auth','me'] as const },
  content: {
    all: ['content'] as const,
    list: (f: ContentFilters) => ['content','list', f] as const,
    byId: (id: string) => ['content','byId', id] as const,
    revisions: (id: string) => ['content','revisions', id] as const,
  },
  taxonomy: { categories: ['taxonomy','categories'] as const, tags: ['taxonomy','tags'] as const },
  media: { list: (f: MediaFilters) => ['media','list', f] as const },
  users: { list: ['users','list'] as const },
};
```

### 3.4 API Integration

```ts
// src/lib/api/client.ts
let accessToken: string | null = null;
export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => { accessToken = t; },
};

class ApiError extends Error {
  constructor(public code: string, message: string, public status: number, public fields?: Record<string,string[]>) { super(message); }
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!r.ok) return false;
    const { accessToken: t } = await r.json();
    tokenStore.set(t);
    return true;
  })();
  const result = await refreshing;
  refreshing = null;
  return result;
}

async function request<T>(method: string, url: string, body?: unknown, init?: RequestInit): Promise<T> {
  const make = (): Promise<Response> => fetch(url, {
    method,
    credentials: 'include',
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let res = await make();
  if (res.status === 401 && url !== '/api/auth/refresh' && url !== '/api/auth/login') {
    const ok = await tryRefresh();
    if (!ok) {
      if (typeof window !== 'undefined') window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      throw new ApiError('UNAUTHORIZED', 'Session expired', 401);
    }
    res = await make();
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload?.error?.code ?? 'INTERNAL', payload?.error?.message ?? 'Request failed', res.status, payload?.error?.fields);
  }
  return res.status === 204 ? (undefined as T) : (await res.json() as T);
}

export const apiClient = {
  get:    <T>(url: string)             => request<T>('GET',    url),
  post:   <T>(url: string, body?: any) => request<T>('POST',   url, body),
  patch:  <T>(url: string, body?: any) => request<T>('PATCH',  url, body),
  delete: <T>(url: string)             => request<T>('DELETE', url),
};
```

### 3.5 Public-Site Rendering Strategy

- `(public)/*` pages are **Server Components**, calling repository helpers directly for the rendered page; the public API exists for external consumers and client-side pagination.
- ISR: `export const revalidate = 60` per public page.
- On publish/edit/restore: service calls `revalidatePath('/blog/{slug}')` and `revalidatePath('/')`.
- `app/(public)/sitemap.ts` enumerates all PUBLISHED posts/pages/categories/tags with `lastModified = updatedAt`.
- `app/(public)/robots.ts` allows `/`, disallows `/admin`.
- `generateMetadata` per page: title, description, openGraph (title, description, images: featuredImage, type=article, publishedTime, authors), twitter card.

---

## 4. Cross-Cutting Concerns

### 4.1 Error → API → UI Flow (Worked Example)

Scenario: AUTHOR Bob clicks "Publish" on EDITOR Alice's post.

1. UI — `<TransitionButtons>` calls `useTransitionStatus().mutate({ id, to: 'PUBLISHED' })`.
2. Route handler — `POST /api/content/[id]/transition` wrapped by `withAuth({ roles: ['AUTHOR','EDITOR','ADMIN'] })`. Auth passes. Body validates.
3. Service — `ContentService.transitionStatus(id, 'PUBLISHED', session)` loads content. Bob is not the author AND not EDITOR+. Even if author, AUTHOR cannot DRAFT→PUBLISHED. Throws `ApiError('FORBIDDEN', 'You may not publish this content', 403)`.
4. Mapper — 403 with `{ error: { code: 'FORBIDDEN', message: '...' } }`.
5. Client — `apiClient` throws typed `ApiError`.
6. Mutation — `onError` rolls back optimistic update via `queryClient.setQueryData(qk.content.byId(id), previous)` and `toast.error(err.message)`.

### 4.2 Security Considerations

- **Validation everywhere** — Zod on every body, params, query.
- **Markdown sanitization** — `rehype-sanitize` (default schema, no raw HTML) + `rehype-highlight`. Never `dangerouslySetInnerHTML` raw.
- **File uploads** — MIME allowlist `['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/pdf']`. Size cap 10 MB. Filename `${uuidv7()}.${extFromMime}`; original filename stored only for display.
- **Path traversal** — `safeJoin(root, p)` resolves and asserts `startsWith(root + sep)`. Reject `..` segments and absolute paths. Applied in `/uploads/[...path]` and any storagePath resolution.
- **CSRF** — refresh cookie is `sameSite=lax` + `path=/api/auth` (only auth endpoints get it). Mutations require `Authorization: Bearer ...` header — browsers don't send custom headers cross-site without preflight.
- **CORS** — same-origin only.
- **Rate limit** — in-memory token bucket on `/api/auth/login` and `/api/auth/register`: 5/60s/IP.
- **Passwords** — min 8 chars, ≥1 letter and ≥1 digit. `bcrypt` cost 12.
- **JWT** — `JWT_ACCESS_SECRET` ≥ 32 bytes random in `.env`. Rotation: change secret + revoke all refresh tokens.
- **Slug conflicts** — service catches Prisma `P2002`, returns 409 + suggestion `${slug}-2`.
- **Authorization** — never trust session alone; load row first and compare `authorId` server-side.
- **Soft delete** — repo-level default filter on `deletedAt = null`.
- **Static media route** — sets `Cache-Control: public, max-age=31536000, immutable` (filenames are content-addressed via UUIDv7).

### 4.3 Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Uploads fill local disk | Medium | High | Per-file 10MB cap; admin metric on `SUM(size)`; future quota per user |
| Revision table unbounded | Low | Low | Acceptable for MVP; future job: keep last 50 per content |
| Long scheduled-publish run | Low | Medium | Batch 50/tx; cron every 60s; idempotent (filter `status != PUBLISHED`) |
| Admin endpoints exposed | Low | Critical | Centralized `withAuth({ roles })`; integration test asserts 403 for AUTHOR |
| Refresh token theft via XSS | Low | High | httpOnly + path-restricted; access token in memory (15m blast radius); rehype-sanitize |
| Slug race | Low | Low | DB unique constraint → 409 → suggestion loop |
| State machine bypass via PATCH | Medium | High | `PATCH /api/content/[id]` rejects `status` in body; only `/transition` mutates status |
| Markdown stored XSS | Medium | High | Sanitize on render every read path |
| Path traversal via `/uploads` | Medium | Critical | `safeJoin` + `realpath` check; tested with `..`, URL-encoded `..%2F`, absolute |
| Login brute force | Medium | Medium | Per-IP rate limit + bcrypt cost 12 |
| Prisma N+1 on content list | Medium | Low | Single query with `include` shaped correctly |
| Cron secret leaked | Low | Medium | 32-byte random; check via `timingSafeEqual`; rotate on incident |
| Soft-deleted reachable via public slug | Medium | Medium | Public repo helpers always include `deletedAt: null AND status: 'PUBLISHED'` |
| Bundle bloat from MarkdownEditor | Low | Low | `next/dynamic` `ssr: false` for `MarkdownEditor` and `MediaPicker` |

---

## Key TS Interfaces (cross-cutting)

```ts
// src/server/types/session.ts
export type SessionUser = { id: string; email: string; name: string | null; role: 'ADMIN'|'EDITOR'|'AUTHOR' };

// src/lib/types.ts
export type ContentSummary = {
  id: string; type: 'POST'|'PAGE'; title: string; slug: string; status: ContentStatus;
  excerpt: string | null; publishedAt: string | null; scheduledFor: string | null;
  updatedAt: string; author: { id: string; name: string | null };
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
};
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number };
export type ApiErrorBody = { error: { code: string; message: string; fields?: Record<string,string[]> } };
```

---

## Summary of Decisions

- **One Next.js app**, route handlers as the API; services in `src/server`, never imported by client.
- **Auth:** 15-min JWT access in memory + opaque hashed refresh in httpOnly cookie with rotation + reuse detection.
- **Content workflow:** strict server-side state machine; status mutations only via `/transition`.
- **Revisions:** snapshot-on-update inside a tx; restore is itself an update (creates a new revision).
- **Media:** local filesystem under `./uploads/YYYY/MM/`, served via dedicated `app/uploads/[...path]` route with path-traversal hardening; metadata in `Media` table.
- **Public site:** Server Components + ISR (`revalidate: 60`) + on-demand revalidation after publish.
- **Frontend state:** TanStack Query (server), URL params (filters), react-hook-form + Zod (forms — schemas shared with backend), Sonner (toasts), no global store.
- **Errors:** centralized `ApiError` + `toResponse`; Zod errors auto-mapped to 422 with field details.
- **Security:** Zod everywhere, sanitized markdown, MIME/size-checked uploads, sameSite=lax cookies + Bearer for writes, rate-limited login, bcrypt 12.

This design is implementation-ready: every file has a clear owner, every endpoint has a service and error contract, every UI surface has a defined data source.
