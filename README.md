# Multi-Author CMS

A self-hosted, local-development-friendly content management system for
small editorial teams. Authors draft posts, editors review and schedule
them, admins manage users and taxonomy. The whole stack runs locally with
`docker compose up` (Postgres) and `npm run dev` (Next.js); no cloud
services or external dependencies are required.

## Features

- JWT auth (HS256, 15-min access token in memory + opaque hashed refresh
  token in an httpOnly cookie with rotation and reuse detection).
- Role-based authorization: `ADMIN`, `EDITOR`, `AUTHOR`.
- Posts and pages on a single `Content` table with the editorial workflow
  `DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`.
- Scheduled publishing via a cron endpoint.
- Per-edit revision history with restore.
- Categories and tags (many-to-many).
- Local-filesystem media library with upload, listing, deletion, and a
  path-traversal-hardened static route.
- Public site rendering (Server Components + ISR), including a sitemap and
  robots route.
- Admin SPA: dashboard, content editor, media library, taxonomy and user
  management, review queue.
- Health endpoint, structured logs, security headers, rate-limited auth.

## Tech stack

Next.js 15 (App Router) + React 19 + TypeScript strict, Prisma 5, PostgreSQL
16, TanStack Query, react-hook-form + Zod, shadcn/ui + Tailwind, `jose`
(JWT), `bcrypt`, `pino`, Vitest, Playwright.

## Quick start

```bash
cp .env.example .env       # set JWT_ACCESS_SECRET to >=32 chars
docker compose up -d
npm install
npx prisma migrate deploy && npx prisma generate
npm run prisma:seed
npm run dev
```

App: <http://localhost:3000> · Admin: <http://localhost:3000/admin>.
Full setup, environment variables, troubleshooting, and ops: see
[`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Default seeded credentials

| Role   | Email           | Password     |
| ------ | --------------- | ------------ |
| ADMIN  | `admin@example.com`   | `admin1234`  |
| EDITOR | `editor@example.com`  | `editor1234` |
| AUTHOR | `author1@example.com` | `author1234` |
| AUTHOR | `author2@example.com` | `author1234` |

The admin pair can be overridden via `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` before running `npm run prisma:seed`.

## Project layout

```
wshobson_cms_prj/
├─ prisma/                    # schema.prisma, migrations, seed.ts
├─ scripts/                   # check-env, create-admin, cron loop
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ (public)/            # public site (homepage, blog, pages, taxonomy)
│  │  ├─ (auth)/              # login, register
│  │  ├─ (admin)/admin/       # dashboard, content, media, taxonomy, users
│  │  ├─ api/                 # REST handlers (auth, users, content, taxonomy, media, public, cron, health)
│  │  └─ uploads/[...path]/   # safe media streamer
│  ├─ server/                 # server-only: db/, services/, lib/, schemas/, http/, types/
│  ├─ components/             # ui/, public/, admin/, content/, media/, taxonomy/, users/, common/
│  └─ lib/                    # client-safe: api, auth, hooks, providers, queryKeys, formatters
├─ tests/                     # unit/, integration/, e2e/, stubs/
├─ docs/                      # RUNBOOK, API, SCHEMA, HANDOFF, ADRs
├─ uploads/                   # gitignored runtime media
├─ .env.example
├─ docker-compose.yml         # postgres:16
├─ next.config.ts
├─ package.json
├─ tsconfig.json
├─ vitest.config.ts
└─ vitest.integration.config.ts
```

## Documentation

| File | Purpose |
| --- | --- |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Local-dev runbook: setup, env, healthchecks, troubleshooting, cron loop. |
| [`docs/API.md`](docs/API.md) | REST API reference with request/response shapes and curl examples. |
| [`docs/SCHEMA.md`](docs/SCHEMA.md) | Database schema reference: tables, indexes, FKs, ER diagram, migrations, seed. |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | What was built, how to test, known limitations, file map, where to look first. |
| [`docs/ADR-001-content-table-discriminator.md`](docs/ADR-001-content-table-discriminator.md) | Why one `Content` table instead of separate `Post`/`Page` tables. |
| [`docs/ADR-002-jwt-with-refresh-rotation.md`](docs/ADR-002-jwt-with-refresh-rotation.md) | Why JWT access + opaque refresh with rotation and reuse detection. |
| [`CHANGELOG.md`](CHANGELOG.md) | Release notes. |

## Useful scripts

- `npm run dev` — start the dev server (validates `.env` first).
- `npm run prisma:migrate` — apply migrations during development.
- `npm run prisma:seed` — re-run the idempotent seed.
- `npm run cron:publish` — run the scheduled-publish worker once.
- `npm run test` / `npm run test:watch` — Vitest unit tests.
- `npm run test:e2e` — Playwright e2e (requires running dev server).
- `npm run db:up` / `npm run db:down` — manage the local Postgres container.

## License

MIT (placeholder).
