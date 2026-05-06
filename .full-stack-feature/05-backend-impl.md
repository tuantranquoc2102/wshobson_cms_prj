# Step 5 — Backend Implementation

## Status: Complete

All endpoints from architecture §2.1 are implemented. ~44 TypeScript files created across services, schemas, HTTP plumbing, route handlers, scripts, and tests.

## Files created

### Server lib (`src/server/lib/`)
- `jwt.ts` — `signAccessToken` / `verifyAccessToken` (jose HS256, 15-min TTL).
- `password.ts` — bcrypt cost-12 wrappers.
- `refreshToken.ts` — 256-bit base64url generator + SHA-256 hasher; 30-day TTL constant.
- `cookies.ts` — `cms_rt` httpOnly/sameSite=lax cookie scoped to `/api/auth`.
- `logger.ts` — pino + pino-pretty in dev. `requestId.ts` — UUIDv4 + child-logger helper.
- `rateLimit.ts` — in-memory token bucket (default 5/60s) + `_resetRateLimit` test hook.
- `markdown.ts` — `unified` → `remark-parse` → `remark-gfm` → `remark-rehype` → `rehype-sanitize` → `rehype-stringify`.
- `files.ts` — `safeJoin` (rejects `..`, URL-encoded `..%2F`, NUL, absolute, malformed encoding), `uploadRoot()`, `extFromMime`, `ALLOWED_MIME_TYPES`.
- `clientIp.ts` — XFF / x-real-ip extractor for rate-limit keys.

### Zod schemas (`src/server/schemas/`)
`auth.schema.ts`, `user.schema.ts`, `content.schema.ts`, `taxonomy.schema.ts`, `media.schema.ts`. All client-safe; inferred types exported. `UpdateContentSchema = CreateContentSchema.partial().strict()` rejects unknown keys (e.g. `status` injection).

### HTTP plumbing (`src/server/http/`)
`apiError.ts` (8-code union + `ApiError` class), `respond.ts` (`toResponse` ZodError→422 / ApiError→its status / else 500; `ok`, `noContent`, `zodFieldMap`), `withAuth.ts` (Bearer-only, optional `roles` gate), `withValidation.ts` (`validateBody`, `validateQuery`).

### Services (`src/server/services/`)
- `activity.service.ts` — best-effort log writer.
- `auth.service.ts` — register/login/rotateRefresh (with reuse detection that revokes the entire chain) / revoke.
- `user.service.ts` — admin list/create/update.
- `content.service.ts` — visibility-filtered list, getById, create with slug-suffix retry on P2002, update with Revision snapshot inside `prisma.$transaction`, full state-machine transition table, schedule, softDelete. `revalidatePath` calls wrapped in try/catch.
- `revision.service.ts` — list + restore (snapshot-then-overwrite tx).
- `taxonomy.service.ts` — Category/Tag CRUD, slug derivation, in-use guard via `_count`.
- `media.service.ts` — MIME allowlist + 10MB cap + UUID-prefixed filename under `uploads/YYYY/MM/`, optional dynamic `sharp` import wrapped in try/catch, file cleanup on DB-insert failure.
- `publishing.service.ts` — idempotent batch publish + per-row revalidation + activity audit.

### Route handlers (`src/app/api/...` and `src/app/uploads/[...path]/`)
All endpoints from architecture §2.1 implemented:
- `auth/{register, login, refresh, logout, me}`
- `users`, `users/[id]`
- `content`, `content/[id]`
- `content/[id]/{transition, schedule}`
- `content/[id]/revisions`, `content/[id]/revisions/[version]/restore`
- `categories`, `categories/[id]`
- `tags`, `tags/[id]`
- `media`, `media/[id]`
- `health`
- `cron/publish-scheduled` (timing-safe `x-cron-secret` compare)
- `public/posts`, `public/posts/[slug]` (renders markdown at read time)
- `public/pages/[slug]`, `public/categories/[slug]/posts`, `public/tags/[slug]/posts`
- `app/uploads/[...path]/route.ts` (safe-resolves, looks up Media row for canonical mime, streams via `Readable.toWeb`, sets `Cache-Control: public, max-age=31536000, immutable`)

### Scripts (`scripts/`)
- `create-admin.ts` — env-driven idempotent ADMIN upsert.
- `run-scheduled-publish.ts` — POSTs to local cron endpoint with `x-cron-secret`.

### Tests (`tests/`)
Unit (vi.mock'd repos):
- `auth.service.test.ts` — login (happy / wrong-pw / unknown email / rate-limit); rotateRefresh (happy + reuse detection + unknown).
- `content.service.test.ts` — transition matrix (allowed + AUTHOR forbidden + invalid 409 + same-state 409 + missing 404); update (creates Revision in tx + AUTHOR-non-DRAFT 403 + non-owner 403).
- `media.service.test.ts` — oversized, bad MIME, empty, valid PNG creates row.
- `publishing.service.test.ts` — empty no-op, publishes due, idempotent.
- `lib/files.test.ts` — `..`, URL-encoded `..%2F`, absolute, NUL, malformed encoding all rejected.

Integration (real Postgres):
- `tests/integration/_setup.ts` + `auth.test.ts` + `content.test.ts`. Uses `describe.skipIf(!process.env.TEST_DATABASE_URL)`. Run via `vitest run -c vitest.integration.config.ts`.

## Caveats / notes for next step

- **Markdown deps were missing from `package.json` and have been added (post-agent)**: `unified`, `remark-parse`, `remark-rehype`, `rehype-stringify`. After `npm install`, `markdown.ts` resolves.
- **Two vitest configs**: `vitest.config.ts` (unit, Prisma stubbed) and `vitest.integration.config.ts` (integration, real Prisma). Both required because the unit-test alias intentionally throws if a test touches the default Prisma client.
- **`PATCH /api/content/[id]` defensively strips `status`** in addition to schema-level `.strict()` rejection.
- **`revalidatePath`** is dynamically imported and wrapped in try/catch so unit tests (no server-render context) don't fail.
- The repo `update`/`transitionStatus` `_actorId` parameters are now consumed at the service layer for Revision and ActivityLog writes.

## What's pending for Step 6

- Frontend: `app/layout.tsx`, public pages, login/register pages, admin shell, content editor, media library, taxonomy/users admin, all components, hooks, providers. The architecture doc §1 and §3 are the spec.
