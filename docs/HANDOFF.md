# Project Handoff

Multi-author CMS — MVP, version `0.1.0` (2026-05-05). Local development only.

## What was built

- JWT-authenticated multi-user accounts with `ADMIN`, `EDITOR`, `AUTHOR`
  roles, bcrypt-hashed passwords, and an httpOnly refresh-token cookie with
  rotation + reuse detection.
- Single `Content` table for both posts and pages, with editorial workflow
  `DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED` enforced by a server-side
  state machine.
- Author/editor publishing flow: draft, submit for review, approve,
  unpublish, archive, restore.
- Scheduled publishing (`scheduledFor` + cron endpoint) that promotes due
  rows to `PUBLISHED`.
- Per-edit revision history with restore (`restore` writes a new forward
  revision rather than mutating history).
- Categories and tags with many-to-many relations to posts.
- Media library: 10 MB file uploads (PNG/JPEG/WebP/GIF/PDF) on the local
  filesystem under `./uploads/YYYY/MM/`, served via a path-traversal-hardened
  route handler.
- Public site (Next.js Server Components + ISR `revalidate = 60`):
  homepage, post detail, page detail, category and tag archives, sitemap,
  robots.
- Admin SPA: dashboard, content list and editor (`@uiw/react-md-editor`),
  media library, taxonomy and user management, review queue.
- REST API at `/api/*` (Zod validation, centralised error mapping,
  `ActivityLog` audit trail on every mutation).
- Health endpoint, structured logging via `pino` with secret redaction,
  rate limit on auth endpoints, security headers in `next.config.ts`.
- Vitest unit + integration suites and a Playwright e2e smoke test.

## Tech stack

Next.js 15 (App Router) + React 19 + TypeScript strict, Prisma 5, PostgreSQL
16 (via Docker Compose), TanStack Query, react-hook-form + Zod, shadcn/ui +
Tailwind, `jose` (JWT), `bcrypt`, `pino`, Vitest, Playwright.

## How to run it

The full procedure is in [`RUNBOOK.md`](./RUNBOOK.md). Six-line quick start:

```bash
cp .env.example .env       # then set JWT_ACCESS_SECRET (>=32 chars)
docker compose up -d
npm install
npx prisma migrate deploy && npx prisma generate
npm run prisma:seed
npm run dev
```

App: <http://localhost:3000>. Admin: <http://localhost:3000/admin>.

## How to test

| Suite | Command |
| --- | --- |
| Unit | `npm run test` |
| Unit (watch) | `npm run test:watch` |
| Integration (real DB) | `TEST_DATABASE_URL=postgres://... DATABASE_URL=$TEST_DATABASE_URL JWT_ACCESS_SECRET=test-secret-test-secret-test-secret npx vitest run -c vitest.integration.config.ts` |
| E2E (Playwright) | `RUN_E2E=1 E2E_BASE_URL=http://localhost:3000 npm run test:e2e` |

Integration tests gate on `TEST_DATABASE_URL` and require migrations to be
applied. The unit suite stubs out Prisma and `server-only`.

## Default seeded credentials

| Role   | Email           | Password     |
| ------ | --------------- | ------------ |
| ADMIN  | `admin@local`   | `admin1234`  |
| EDITOR | `editor@local`  | `editor1234` |
| AUTHOR | `author1@local` | `author1234` |
| AUTHOR | `author2@local` | `author1234` |

Override the admin pair via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
before running `npm run prisma:seed`.

## What is intentionally NOT included

Per requirements §Out of Scope:

- Production deployment, Dockerfile for the Next.js app, Kubernetes,
  CI/CD, SSL/domain.
- Multi-tenancy or multi-site.
- Plugin / extension system.
- Internationalization (English only).
- Comments / community features.
- Email notifications and password reset (no SMTP).
- Full-text search beyond Postgres `ILIKE`.
- SSO / OAuth / external IdPs.

## Known limitations / open items

Carried forward from `.full-stack-feature/07-testing.md` and `08-deployment.md`:

| ID | Severity | Item |
| --- | --- | --- |
| M-3 | Medium | In-memory rate-limit map is unbounded; needs periodic sweep. |
| M-4 | Medium | Media upload trusts client-supplied `mimeType`; sniff bytes via `file-type` instead. |
| L-1 | Low | No explicit CORS hardening (same-origin by default). |
| P-01 | High (perf) | `MediaPicker` eagerly fetches 100 media on every editor mount; gate query on dialog `open`. |
| P-03 | Medium (perf) | `publishScheduled` loops sequential `update`s; switch to `updateMany`. |
| P-04 | Medium (perf) | `findScheduledDue` + `publishScheduled` re-read same rows; collapse to one query. |
| P-06 | Medium (perf) | `refetchOnWindowFocus: true` causes admin churn; flip to `false` for the editor. |
| P-07 | Medium (perf) | `MediaGrid` not lazy on `/admin/media`; wrap in `next/dynamic`. |
| P-09 | Low (perf) | `RevisionRepo.list` is unbounded; cap at 50. |
| Cron | Operational | Scheduled-publish loop is a foreground bash/PowerShell script — not a real scheduler. |
| CSP | Operational | Dev CSP allows `'unsafe-eval'` / `'unsafe-inline'`; tighten before any prod hardening. |

Inline-fixed before checkpoint: SVG-XSS (H-1), XFF spoofing (H-2), public
list body over-fetch (P-02), search-mixed-with-visibility leak (P-08).

## File map

| Path | Role |
| --- | --- |
| `prisma/` | Schema, migrations (`0001_init`, `0002_partial_indexes`), seed script. |
| `src/app/` | Next.js App Router: `(public)`, `(auth)`, `(admin)` route groups, `api/*` handlers, `uploads/[...path]` streamer. |
| `src/server/` | Server-only code: `db/{prisma,repos}`, `services/`, `lib/`, `schemas/` (Zod), `http/` (`withAuth`, `respond`, `apiError`), `types/`. |
| `src/components/` | React components: `ui/` (shadcn), `public/`, `admin/`, `content/`, `media/`, `taxonomy/`, `users/`, `common/`. |
| `src/lib/` | Client-safe libs: `api/`, `auth/`, `hooks/`, `providers/`, `queryKeys.ts`, formatters, types. |
| `scripts/` | `check-env.ts`, `create-admin.ts`, `run-scheduled-publish.ts`, `run-cron-loop.{sh,ps1}`. |
| `tests/` | `unit/`, `integration/`, `e2e/`, `stubs/`. |
| `docs/` | `RUNBOOK.md`, `API.md`, `SCHEMA.md`, `HANDOFF.md`, ADRs. |
| `uploads/` | Gitignored runtime directory for media files. |
| `.full-stack-feature/` | Design docs that produced the implementation. |

## Where to look first

For someone new to the codebase, in order:

1. [`README.md`](../README.md) — what it is and how to start it.
2. [`docs/RUNBOOK.md`](./RUNBOOK.md) — local-dev operations, env vars,
   troubleshooting.
3. [`docs/API.md`](./API.md) and [`docs/SCHEMA.md`](./SCHEMA.md) — the
   externally-visible contract and the data model.
4. [`docs/ADR-001`](./ADR-001-content-table-discriminator.md) and
   [`docs/ADR-002`](./ADR-002-jwt-with-refresh-rotation.md) — the two
   load-bearing design decisions.
5. `src/server/services/*` — business logic (`auth`, `content`, `revision`,
   `taxonomy`, `media`, `publishing`, `activity`).
6. `src/app/api/*` — thin route handlers wired to those services via
   `withAuth` and Zod.
