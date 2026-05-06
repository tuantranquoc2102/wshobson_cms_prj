# Step 4 — Database Layer Implementation

## Status: Complete

## Files created (relative to repo root)

### Project foundation
- `package.json` — Next.js 15, React 19, Prisma 5, jose, bcrypt, zod, pino, TanStack Query, react-hook-form, react-markdown + remark-gfm + rehype-sanitize + rehype-highlight, sharp, sonner, Tailwind, shadcn/Radix, lucide-react, @uiw/react-md-editor. DevDeps: vitest, prisma, tsx, eslint, prettier, playwright, typescript, @types/*. Scripts: `dev`, `build`, `start`, `lint`, `prisma:generate`, `prisma:migrate`, `prisma:seed`, `db:up`, `db:down`, `test`, `test:watch`, `test:e2e`, `cron:publish`.
- `tsconfig.json` — strict, ES2022, `baseUrl: "."`, `@/* → src/*`, `noUncheckedIndexedAccess: true`.
- `tsconfig.test.json` — extends base + vitest globals + node types.
- `next.config.ts` — `reactStrictMode: true`.
- `tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css` — Tailwind + shadcn HSL CSS variables (light + dark).
- `.env.example` — `DATABASE_URL`, `JWT_ACCESS_SECRET`, `CRON_SECRET`, `NODE_ENV`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- `.gitignore` — node_modules, `.next`, `.env*`, `uploads/*` (keeps `.gitkeep`); migrations are committed.
- `docker-compose.yml` — `postgres:16` on 5432, named volume, healthcheck, `cms/cms/cms`.
- `uploads/.gitkeep`.
- `README.md` — quickstart + seed credentials table.

### Prisma
- `prisma/schema.prisma` — exact match to design §2: enums (Role, ContentType, ContentStatus, MediaKind), models (User, RefreshToken, Content, Revision, Category, Tag, ContentCategory, ContentTag, Media, ActivityLog), every `@@index`, `@@unique`, FK directive, cuid IDs.
- `prisma/migrations/migration_lock.toml` — `provider = "postgresql"`.
- `prisma/migrations/0001_init/migration.sql` — hand-written CREATE TYPE / CREATE TABLE / CREATE INDEX / FK constraints.
- `prisma/migrations/0002_partial_indexes/migration.sql` — `content_public_feed_idx` partial index.
- `prisma/seed.ts` — idempotent upserts: 1 admin (env-driven), 1 editor, 2 authors, 5 categories, 12 tags, 10 posts spanning all four statuses (incl. one scheduled), 1 PAGE (`about`).

### Database client & repos
- `src/server/db/prisma.ts` — HMR-safe `PrismaClient` singleton.
- `src/server/db/repos/user.repo.ts` — `findByEmail`, `findById`, `create`, `updateRole`, `softDelete`, `listActive`.
- `src/server/db/repos/refreshToken.repo.ts` — `create`, `findByTokenHash`, `revoke`, `revokeAllForUser`, `deleteExpired`.
- `src/server/db/repos/content.repo.ts` — `listPublicHomepage`, `listPublicByCategory`, `listMyDrafts`, `listReviewQueue`, `getPublicBySlug`, `findScheduledDue`, `publishScheduled`, `create`, `update`, `transitionStatus`, `softDelete`. Exports `ContentWithRelations`, `CreateContentInput`, `UpdateContentInput`. Public listing/detail queries always include `deletedAt: null`, `status: 'PUBLISHED'`, `publishedAt: { lte: now }`. `transitionStatus` sets `publishedAt = now()` and clears `scheduledFor` when entering PUBLISHED.
- `src/server/db/repos/revision.repo.ts` — `list`, `get`, `appendFromContent`, `nextVersion`.
- `src/server/db/repos/taxonomy.repo.ts` — categories: `listCategories`, `upsertCategory`, `setContentCategories`. Tags: `listTags`, `upsertTag`, `setContentTags`.
- `src/server/db/repos/media.repo.ts` — `create`, `findById`, `listByUploader`, `delete`.
- `src/server/db/repos/activityLog.repo.ts` — `record`, `listRecent`, `listForEntity`.
- `src/server/types/session.ts`, `src/server/types/pagination.ts` — `SessionUser`, `Pagination`, `Page<T>`, `toSkip` helper.
- `src/server/lib/slugify.ts` — kebab-case normalizer; uniqueness deferred to service layer.

Every repo method accepts an optional `tx?: Prisma.TransactionClient` and falls back to the singleton via a small `db(tx)` helper, so services can compose them inside `prisma.$transaction`.

### Tests
- `vitest.config.ts` — node env, aliases `@ → src`, `server-only → tests/stubs/server-only.ts`, `@/server/db/prisma → tests/stubs/prisma.ts` (Proxy that throws if anyone touches default client; tests must pass `tx`).
- `tests/stubs/{server-only,prisma}.ts`.
- `tests/unit/repos/_mockPrisma.ts` — `makePrismaStub()` helper (vi.fn per Prisma model + `asTx()` cast).
- `tests/unit/repos/{user,refreshToken,content,revision,taxonomy,media,activityLog}.repo.test.ts` — for every method, asserts the underlying Prisma call shape (args, where/data/include/orderBy/skip/take). Branch coverage for `ContentRepo.transitionStatus` (PUBLISHED vs other), `update` (featuredMedia disconnect), `publishScheduled` (empty list), `setContentCategories`/`setContentTags` (empty-list path).
- `tests/unit/lib/slugify.test.ts` — covers all six normalization rules.

## Skipped (out of scope for this step)

- `npm install` — user runs.
- `prisma generate` / `prisma migrate` — user runs after Postgres is up.
- Test execution — tests written but not run.
- Services, route handlers, Zod schemas, `withAuth`, JWT/bcrypt helpers, scripts (`run-scheduled-publish.ts`, `create-admin.ts`), UI components, app/layout/pages — all reserved for Steps 5 & 6.

## Notes for next step

- Repo `update` and `transitionStatus` accept an `_actorId` parameter that is intentionally unused at the repo layer — services thread it into Revision and ActivityLog writes.
- Repo layer applies `deletedAt: null` filter centrally on public/visibility queries; admin/editor visibility filters happen in the service layer.
- `prisma generate` MUST be run before any TS type-check so `@prisma/client` exports are populated.
