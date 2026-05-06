# Changelog

All notable changes to this project are documented in this file. The format
is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-05-05

Initial MVP release. Local-dev only — no production deployment.

### Added
- Next.js 15 (App Router) + React 19 + TypeScript strict baseline.
- Postgres 16 via `docker compose` with persistent named volume.
- Prisma schema, migrations, and seed script (admin / editor / two authors).
- Authentication: bcrypt password hashing, HS256 JWT access tokens (15 min)
  in HttpOnly cookies, opaque refresh tokens with rotation and reuse
  detection, server-side revocation table.
- Role-based authorization (ADMIN, EDITOR, AUTHOR) enforced in API handlers.
- Posts CRUD with draft / scheduled / published lifecycle, slug uniqueness,
  optional cover image upload, markdown body sanitized via rehype-sanitize.
- Tags CRUD and many-to-many post tagging.
- Public site: home feed, post detail, tag archive, RSS feed.
- Admin UI: dashboard, post editor (`@uiw/react-md-editor`), tag manager,
  user manager.
- Rate limiting on auth and write endpoints (in-memory token bucket with
  socket-IP / TRUST_PROXY-aware bucketing).
- Scheduled-publish cron endpoint plus a tsx worker (`npm run cron:publish`)
  and small helper scripts (`scripts/run-cron-loop.{sh,ps1}`).
- Structured logging via pino with redaction for secrets and auth headers;
  pino-pretty in development.
- Health endpoint at `/api/health` reporting `{ ok, db }`.
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, dev-friendly Content-Security-Policy) applied globally
  via `next.config.ts`.
- `scripts/check-env.ts` env validator wired into the `predev` hook so
  missing config fails fast.
- Vitest unit + integration suites and a small Playwright e2e smoke set.
- Local-dev runbook at `docs/RUNBOOK.md`.

### Known limitations
- Single-tenant; no plugin system; no production deployment artifacts.
- CSP relies on `'unsafe-eval'` and `'unsafe-inline'` for the dev server and
  the markdown editor; tighten before any future prod hardening.
- Cron loop is a foreground bash/PowerShell script, not a real scheduler.
