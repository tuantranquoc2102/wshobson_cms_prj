# Local-Dev Runbook

Operational notes for running the CMS on a developer laptop. **Local-dev
only** — no production guidance here.

## Prerequisites

- Node.js 20 LTS or newer (`node -v`).
- Docker Desktop (or compatible Docker engine) with `docker compose`.
- Free TCP ports: **3000** (Next.js) and **5432** (Postgres).
- Bash or PowerShell; Git.

## First-time setup

Run from the repo root, in order:

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env and set JWT_ACCESS_SECRET to >=32 random chars.
# Suggested: openssl rand -hex 32

# 2. Start Postgres
docker compose up -d

# 3. Install JS deps
npm install

# 4. Apply committed migrations to the empty DB
npx prisma migrate deploy

# 5. Generate the Prisma client
npx prisma generate

# 6. Seed default users + sample posts
npm run prisma:seed

# 7. Start the dev server (the predev hook validates .env first)
npm run dev
```

App is now at <http://localhost:3000>; admin UI at
<http://localhost:3000/admin>.

## Default seeded credentials

These come from `prisma/seed.ts`. **Change them before sharing the box.**

| Role   | Email           | Password     |
| ------ | --------------- | ------------ |
| ADMIN  | `admin@example.com`   | `admin1234`  |
| EDITOR | `editor@example.com`  | `editor1234` |
| AUTHOR | `author1@example.com` | `author1234` |
| AUTHOR | `author2@example.com` | `author1234` |

The admin pair can be overridden in `.env` via `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` before running `npm run prisma:seed`.

## Healthchecks

```bash
# Liveness + DB ping
curl -s http://localhost:3000/api/health
# → {"ok":true,"db":"up"}

# Authenticated identity check (after logging in via the UI and copying
# the access cookie value)
curl -s http://localhost:3000/api/auth/me \
  -H "Cookie: cms_access=<paste-access-token>"
```

## Common operations

### Promote / create another admin

```bash
SEED_ADMIN_EMAIL=ops@example.com SEED_ADMIN_PASSWORD=$(openssl rand -hex 16) \
  tsx scripts/create-admin.ts
```

The script is idempotent: if the email already exists the user is promoted
to ADMIN and the password is reset.

### Run the scheduled-publish job manually

```bash
npm run cron:publish
```

### Reset the database (full wipe)

```bash
docker compose down -v
docker compose up -d
npx prisma migrate deploy
npm run prisma:seed
```

## Rollback steps

There is no online migration rollback for local dev. To undo a bad
migration:

1. Drop the in-flight migration folder under `prisma/migrations/` (only if
   it has not been committed / shared).
2. Wipe the DB volume: `docker compose down -v`.
3. Bring Postgres back up: `docker compose up -d`.
4. Reapply migrations: `npx prisma migrate deploy`.
5. Re-seed: `npm run prisma:seed`.

If the bad migration was already committed and pushed, write a forward-fix
migration instead — Prisma's `migrate deploy` does not run `down` scripts.

## Troubleshooting

| Symptom                                                  | Fix                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET must be at least 32 chars`            | Run `openssl rand -hex 32` and paste into `.env`.                                                 |
| `Error: bind: address already in use` for port 5432      | Edit `docker-compose.yml`, change `"5432:5432"` to `"5433:5432"`, update `DATABASE_URL` to match. |
| `PrismaClientInitializationError` / out-of-date client   | Run `npx prisma generate`.                                                                        |
| 401s in `/admin` immediately after login                 | Check `GET /api/auth/me` succeeds. The access cookie is scoped to `/api/auth` and expires in 15m — let the client refresh, or log in again. |
| `Environment check failed:` on `npm run dev`             | The `predev` hook caught a missing/short env var. Re-read the message and update `.env`.          |
| Markdown editor styling looks broken in `/admin`         | Hard refresh — the dev CSP allows the inline styles the editor injects, but a stale SW or cached page can interfere. |

## Logging & observability

- All server-side logs go to **stdout** as structured JSON via
  [pino](https://github.com/pinojs/pino).
- In dev, `pino-pretty` is wired in automatically for human-readable output
  (colorized, timestamped).
- Sensitive fields (`password`, `passwordHash`, `authorization`, `cookie`,
  `accessToken`, `refreshToken`, `tokenHash`) are redacted before emit.
- Override the level by exporting `LOG_LEVEL=trace|debug|info|warn|error`.
- Health endpoint: `GET /api/health` → `{ ok: boolean, db: 'up' | 'down' }`.

## Scheduled publish job (dev pattern)

Posts with `status = SCHEDULED` and a `publishAt` in the past are flipped to
`PUBLISHED` by the cron endpoint. To run it on a loop locally, open a
**second terminal** and use one of:

```bash
# Bash (mac/linux/wsl/git-bash)
bash scripts/run-cron-loop.sh

# PowerShell (Windows)
pwsh scripts/run-cron-loop.ps1
```

Or, inline:

```bash
while true; do npm run cron:publish; sleep 60; done
```

> **Dev-only.** This is a foreground polling loop with no supervisor,
> backoff, or jitter. In a production deployment you would replace it with
> a real scheduler (cron, systemd timer, k8s CronJob, hosted scheduler) —
> which is explicitly out of scope for this MVP.
