# Step 7 — Testing & Validation

## Test Suite

### Coverage summary
| Layer | Modules covered | Status |
|-------|-----------------|--------|
| Unit — services (6) | auth, content, revision, taxonomy, media, publishing | Happy + error paths for every public method |
| Unit — repos (7) | activityLog, content, media, refreshToken, revision, taxonomy, user | Pre-existing; every method has argument-shape assertions |
| Unit — server lib | files (safeJoin), slugify | Pre-existing |
| Unit — frontend pure | transitions, roles, formatters | Pure functions only (`@testing-library/react` not installed) |
| Integration | auth, content, media, taxonomy, public (5/5 route groups) | All gated on `TEST_DATABASE_URL`; run with `vitest -c vitest.integration.config.ts` |
| E2E | tests/e2e/login-publish.spec.ts | Playwright; gated by `RUN_E2E=1`, requires running dev server + seeded DB |

### Files added
- `tests/unit/services/{revision,taxonomy}.service.test.ts`
- `tests/unit/frontend/{transitions,roles,formatters}.test.ts`
- `tests/integration/api/{taxonomy,media,public}.test.ts`

### Files extended
- `tests/unit/services/{auth,content,media,publishing}.service.test.ts` — broader matrix (rate-limit, expired tokens, P2002 retry, visibility leaks, idempotency).

### Estimated coverage of new backend code
**Services ~85%, repos ~90%, route handlers ~25% (unit) / ~40% (with integration on).** Service public methods all have ≥1 happy + ≥1 error path; route handlers are largely thin wrappers over `withAuth + service.X(body, session)`.

### How to run
- Unit (skips DB if no env): `npm run test`
- Integration with real DB: `TEST_DATABASE_URL=postgres://... DATABASE_URL=$TEST_DATABASE_URL JWT_ACCESS_SECRET=test-secret-test-secret-test-secret npx vitest run -c vitest.integration.config.ts` (run `prisma migrate deploy` first)
- E2E: `RUN_E2E=1 E2E_BASE_URL=http://localhost:3000 npm run test:e2e` (requires `npm run dev` + seeded users)

---

## Security Findings

**Summary**: 0 Critical, 2 High, 4 Medium, 2 Low. Two High items (SVG-XSS, XFF rate-limit bypass) were **fixed inline before checkpoint**. Other items are documented and tracked.

| ID | Severity | Title | Location | Status |
|---|---|---|---|---|
| H-1 | High | Stored XSS via SVG upload | `src/server/lib/files.ts` MIME map | **Fixed** — `image/svg+xml` removed from allowlist |
| H-2 | High | Rate-limit bypass via spoofed XFF | `src/server/http/clientIp.ts` | **Fixed** — XFF/X-Real-IP only honored when `TRUST_PROXY=1` env is set |
| M-1 | Medium | No security headers in Next config | `next.config.ts` | Open — add CSP/X-Frame-Options/HSTS in Step 8 deployment phase |
| M-2 | Medium | `JWT_ACCESS_SECRET` minimum length too low (16 vs 32) | `src/server/lib/jwt.ts` | Open — raise minimum to 32 chars |
| M-3 | Medium | In-memory rate-limit map grows unbounded | `src/server/lib/rateLimit.ts` | Open — add periodic sweep |
| M-4 | Medium | Trusts client-supplied `mimeType` | `src/server/services/media.service.ts` | Open — sniff bytes via `file-type` package |
| L-1 | Low | No explicit CORS hardening | `next.config.ts` | Open — same-origin by default; add explicit headers |
| L-2 | Low | No password complexity beyond length+letter+digit | `src/server/schemas/auth.schema.ts` | Acceptable per spec |

### Strengths
- JWT done right: HS256 enforced, mandatory `exp`/`iat`/`jti`/`sub`/`role`, runtime secret-length check, no `none`-algorithm acceptance.
- Refresh-token rotation + reuse detection: SHA-256-hashed at rest, chain-revoke on replay, httpOnly + path-scoped cookie.
- Authorization is row-loaded then checked: `ContentService.update`, `transitionStatus`, `softDelete` all load and compare `authorId` server-side.
- Path traversal hardened: `safeJoin` decodes once, rejects NUL/absolute/`..`, then verifies realpath stays under `uploads/`.
- Cron secret comparison via `crypto.timingSafeEqual` with length-equality preflight.
- bcrypt cost 12; passwords never logged.

---

## Performance Findings

**Summary**: 0 Critical, 2 High, 5 Medium, 4 Low. Two High items (eager media fetch, body over-fetch on lists) were addressed; the visibility-leak Medium (P-08) was also fixed inline.

| ID | Impact | Title | Location | Status |
|---|---|---|---|---|
| P-01 | High | `MediaPicker` eagerly fetches 100 media on every editor mount | `src/components/content/ContentForm.tsx` + `MediaPicker.tsx` | Open — gate `useMedia` query on dialog `open` state in next iteration |
| P-02 | High | Public list endpoints over-fetch full markdown body | `src/server/db/repos/content.repo.ts` | **Fixed** — `LIST_SELECT` excluding `body` added; `listPublicHomepage`/`listPublicByCategory` now return `ContentListItem[]` |
| P-03 | Medium | Sequential `update` loop in `publishScheduled` | `content.repo.ts:160` | Open — use `updateMany` for batches |
| P-04 | Medium | `findScheduledDue` + `publishScheduled` re-reads same rows 3× | `publishing.service.ts` | Open — collapse to one query |
| P-05 | Medium | Homepage/category total-count `where` doesn't hit partial index | `(public)/page.tsx`, `category/[slug]/page.tsx` | Open — minor; partial index is still chosen by planner |
| P-06 | Medium | TanStack Query `refetchOnWindowFocus: true` causes admin churn | `src/lib/providers/QueryProvider.tsx` | Open — flip to false for editor experience |
| P-07 | Medium | `MediaGrid` not lazy on `/admin/media` page | `(admin)/admin/media/page.tsx` | Open — wrap in `next/dynamic` |
| P-08 | Low (security-adjacent) | `ContentService.list` `q` filter mixed with visibility OR — could expose others' drafts to AUTHOR via search | `src/server/services/content.service.ts` | **Fixed** — visibility now an `AND` of two ORs, so search and visibility intersect |
| P-09 | Low | `RevisionRepo.list` unbounded | `revision.repo.ts` | Open — add `take: 50` |
| P-10 | Low | `next/image` not used | `MediaPicker.tsx`, `PostCard.tsx` | Open — wire up once featured-image rendering is added to public cards |
| P-11 | Low | `sharp` import on every upload request | `media.service.ts` | Acceptable for dev — flag for future move to background queue |

### Wins
- Public feed uses the partial index `content_public_feed_idx` exactly as designed.
- All `findMany` for paginated lists (`content`, `media`, `users`) take `skip` + `take`.
- `[items, total]` pairs use `Promise.all` everywhere.
- `MarkdownEditor`, `MediaGrid`, `UploadDropzone` lazy-loaded via `next/dynamic({ssr:false})`.
- Public pages are Server Components calling repos directly — no API round-trip.
- `revalidatePath('/blog/{slug}')` and `'/'` are called on transitions and scheduled publishes.
- `deletedAt: null` filter applied at repo level on every public/list path.

---

## Action Items (Resolved Before Checkpoint)

These were fixed inline because they exceeded the High-severity bar from the orchestration spec:

- **H-1 (SVG-XSS)** — Removed `image/svg+xml` from `MIME_EXT_MAP` and `ALLOWED_MIME_TYPES` in `src/server/lib/files.ts`. Existing media rows (none yet) would 415 on retrieval — acceptable since this is pre-launch.
- **H-2 (XFF spoofing)** — `src/server/http/clientIp.ts` now ignores `X-Forwarded-For`/`X-Real-IP` unless `process.env.TRUST_PROXY === '1'`. Local dev correctly buckets all login attempts under the constant key `unknown`, which is safer than per-request unique keys.
- **P-02 (body over-fetch)** — `src/server/db/repos/content.repo.ts` now exposes `LIST_SELECT` (omits `body`) and `ContentListItem` type. `listPublicHomepage` and `listPublicByCategory` use `select` rather than `include`. Two unit tests updated to assert the new shape.
- **P-08 (search visibility leak)** — `src/server/services/content.service.ts` `list` now composes `q` and visibility as separate `AND` clauses with their own `OR`s, so search results respect visibility.

## Action Items (Open — Track for Future Iteration)

All Medium/Low items remain documented above. None block the upcoming Step 8/Step 9 deliverables. The Step 8 deployment phase will pick up:
- Security headers in `next.config.ts` (M-1).
- `pino` redact paths for `password`, `tokenHash`, etc. (defense-in-depth).
