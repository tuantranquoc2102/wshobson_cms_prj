# Requirements: Build a complete, functional Content Management System (CMS) designed to run on a local development server

## Problem Statement

Editorial teams need a self-hosted, local-development-friendly CMS where multiple authors and editors can collaborate on producing content. The pain point: existing solutions are either too heavy (full SaaS, cloud-only) or too lightweight (single-user blog engines). The MVP targets a **multi-author publishing platform** that can be cloned, run locally with `npm run dev`, and used end-to-end without external services.

**Primary users:**
- **Admin** — manages users, roles, site-level settings.
- **Editor** — reviews drafts, schedules and publishes content, manages categories/tags.
- **Author** — writes drafts, uploads media, submits work for review.
- **Public reader** — consumes published content on the public-facing site.

## Acceptance Criteria

The MVP is "done" when:

- [ ] A user can sign up, log in, and log out via JWT-based authentication.
- [ ] Roles `ADMIN`, `EDITOR`, `AUTHOR` exist and gate access to the right operations.
- [ ] Authenticated users can create, edit, and delete posts and pages with a markdown/rich-text body.
- [ ] Posts have lifecycle states: `DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`, with role-aware transitions.
- [ ] Authors can submit a draft for review; editors/admins can publish or send back to the author.
- [ ] Posts can be **scheduled** for publication (a `publishedAt` future date triggers visibility).
- [ ] Each save creates a **revision** so editors can see/restore prior versions.
- [ ] A media library supports upload, listing, deletion, and embedding into content. Files live on the local filesystem.
- [ ] Public-facing pages render published content via SEO-friendly slugs (`/blog/[slug]`, `/p/[slug]`).
- [ ] Categories and tags exist; readers can browse `/category/[slug]` and `/tag/[slug]`.
- [ ] An admin dashboard summarizes counts (drafts, scheduled, published) and recent activity.
- [ ] The whole app runs locally with `docker compose up` (Postgres) + `npm run dev` (Next.js), seeded with one admin user.

## Scope

### In Scope

- User registration, login, logout, JWT issue/refresh, password hashing (bcrypt).
- Role model (`ADMIN`, `EDITOR`, `AUTHOR`) and permission checks on all mutations.
- Content types: **Post** (timeline content) and **Page** (static content).
- Markdown body with optional rich-text editor; sanitized HTML rendering.
- Editorial workflow: draft → in-review → published → archived; scheduled publish.
- Revision history per content item; restore-to-revision action.
- Media library: upload (local filesystem under `./uploads`), list, delete, embed reference into posts.
- Categories and tags, with many-to-many relations to posts.
- Public site rendering for published content with SSG/ISR where sensible.
- Admin dashboard (counts, recent activity, user management).
- Seed script that bootstraps an `admin@example.com` user and a few sample posts/categories.
- Docker Compose for local Postgres, plus README run instructions.

### Out of Scope

- **Production deployment & cloud hosting**: no Dockerfile for app, no Kubernetes, no SSL/domain, no CI/CD.
- **Multi-tenancy / multi-site**: single CMS instance per database; no tenant isolation.
- **Plugin / extension system**: no dynamic hook system or third-party plugin loader.
- Internationalization (i18n) — not addressed in MVP; English only.
- Comments / community features.
- Email notifications (no SMTP integration; password reset deferred).
- Full-text search beyond Postgres `ILIKE` / basic `tsvector`.
- SSO / OAuth / external IdPs.

## Technical Constraints

- **Authentication**: JWT-based.
  - Access token (short-lived, ~15m) signed with HS256.
  - Refresh token (long-lived, ~7d) stored as httpOnly cookie + DB-tracked for revocation.
  - Tokens carry `sub` (user id) and `role`.
- **Local-dev first**: must run on Windows / macOS / Linux with a single `docker compose up` for Postgres and `npm run dev` for the app. No production hardening required, but secure defaults (no plaintext passwords, sanitized HTML, parameterized queries).
- **Media uploads**: stored under `./uploads/` (gitignored), served from `/uploads/*`. No S3 in MVP.
- **Data integrity**: foreign keys enforced; soft delete for posts (so revisions/refs survive); hard delete for ephemeral data only.
- **Latency**: no strict targets, but pages should render < 500 ms locally and admin lists should paginate at 25 per page.

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui (Radix primitives), TanStack Query for client-side data fetching, react-hook-form + zod for forms.
- **Backend**: Next.js API Routes / Route Handlers (REST), TypeScript. Service layer in `src/server/services/*`. Zod for input validation.
- **Database**: PostgreSQL 16 (via Docker Compose).
- **ORM / Migrations**: Prisma 5+ (schema-first, `prisma migrate`).
- **Auth**: `jose` for JWT signing/verification, `bcrypt` for password hashing, httpOnly refresh-token cookie.
- **Markdown**: `react-markdown` + `remark-gfm` + `rehype-sanitize` for rendering; `@uiw/react-md-editor` (or similar) for authoring.
- **Media**: local filesystem under `./uploads`; `formidable` or Next.js built-in `FormData` for upload parsing; `sharp` only if needed for thumbnails.
- **Testing**: Vitest (unit), Playwright (e2e), Supertest-style integration tests against route handlers.
- **Tooling**: pnpm or npm, ESLint, Prettier, TypeScript strict mode.
- **Infrastructure (local)**: Docker Compose (postgres only), `.env.local` for secrets, seed script via `prisma db seed`.

## Dependencies

- **Self-contained**: No external services required for the MVP.
  - Local Postgres in Docker Compose.
  - Local filesystem for media storage.
  - bcrypt for password hashing in-process.
- **No** email service, search service, image processing service, or analytics service in MVP.
- Future: an SMTP integration would unlock password reset; a search service would improve content discovery; image processing could be added with Sharp for thumbnail variants.

## Configuration

- **Stack**: Next.js + Prisma + PostgreSQL (full-stack TypeScript)
- **API Style**: REST (Next.js Route Handlers)
- **Complexity**: medium
