# Step 8 — Deployment & Local-Dev Operations

The MVP scope is **local development only** (per requirements §Scope/Out of Scope: no cloud, no production hardening, no CI/CD). This step focuses on ops affordances for someone running the CMS on their laptop.

## Files modified
- `next.config.ts` — added async `headers()` exporting `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a dev-friendly Content-Security-Policy (commented to flag `'unsafe-eval'` / `'unsafe-inline'` as dev-only). Closes security finding M-1.
- `src/server/lib/logger.ts` — added pino `redact` for `password`, `passwordHash`, `authorization`, `cookie`, `accessToken`, `refreshToken`, `tokenHash` (with `*.<field>` wildcards so nested objects are caught).
- `package.json` — added `check:env` and `predev` scripts so `npm run dev` fast-fails on missing env.
- `.env.example` — documented `openssl rand -hex 32` for the JWT secret, added `TRUST_PROXY=0` and optional `LOG_LEVEL`.

## Files created
- `scripts/check-env.ts` — TypeScript env validator. Parses `.env`, merges with `process.env`, verifies `DATABASE_URL`, `CRON_SECRET`, `JWT_ACCESS_SECRET ≥ 32 chars`. Tiny inline `.env` parser (no new dep).
- `scripts/run-cron-loop.sh` and `scripts/run-cron-loop.ps1` — 60s polling loop calling the local cron endpoint (interval configurable via `CRON_INTERVAL_SECONDS`).
- `CHANGELOG.md` — 0.1.0 entry summarizing MVP feature set and known limitations.
- `docs/RUNBOOK.md` — local-dev runbook (prerequisites, ordered first-time setup, seed credentials, healthchecks, common ops, rollback, troubleshooting, scheduled-publish loop).

## Quick reference (from RUNBOOK)

```bash
cp .env.example .env
# Generate a real JWT secret:  openssl rand -hex 32
docker compose up -d
npm install
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
npm run dev
```

Default seeded users (passwords from `.env`):
- `admin@local`     (ADMIN)
- `editor@local`    (EDITOR)
- `author1@local`   (AUTHOR)
- `author2@local`   (AUTHOR)

Healthchecks:
- `curl http://localhost:3000/api/health` → `{ ok: true, db: 'up' }`
- Login → admin dashboard at http://localhost:3000/admin

Scheduled publish (manual or 60s loop):
- `npm run cron:publish` (one-shot)
- `bash scripts/run-cron-loop.sh` (continuous, dev-only pattern)

DB reset:
- `docker compose down -v && docker compose up -d && npx prisma migrate deploy && npm run prisma:seed`

## What is intentionally NOT here

- No Dockerfile for the Next.js app (out of scope per requirements).
- No Kubernetes manifests, CI/CD workflows, or cloud configuration.
- No production-grade CSP — current CSP allows `'unsafe-eval'` / `'unsafe-inline'` for dev convenience; commented as such.
- No external monitoring/alerting; pino logs to stdout.
- No automated backups; `docker compose down -v` wipes the volume — that's the user's reset workflow, not a backup story.

## Open items (carried forward from Step 7)

These remain documented but not implemented (none block local-dev runtime):
- M-2 — `JWT_ACCESS_SECRET` minimum was 16; the new `check:env` enforces 32, so this is now effectively closed at startup.
- M-3 — In-memory rate-limit map cleanup.
- M-4 — Trusts client-supplied `mimeType`; sniff bytes instead.
- P-01 — Lazy-load `useMedia` query in `MediaPicker`.
- P-03/P-04 — Optimize `publishScheduled` to one query.
- P-06 — TanStack Query `refetchOnWindowFocus` flip.
- P-09 — `RevisionRepo.list` `take: 50` cap.
