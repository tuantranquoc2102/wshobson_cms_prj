# API Reference

REST API for the multi-author CMS. All handlers live under `src/app/api/*`.
Validation is performed with Zod schemas exported from `src/server/schemas/*`.

## Conventions

- **Base URL**: same-origin (the Next.js app at `http://localhost:3000`).
- **Auth header** (where required): `Authorization: Bearer <accessToken>`.
- **Refresh cookie**: `cms_rt` (httpOnly, SameSite=Lax, scoped to `/api/auth`).
  Issued by login/register/refresh; cleared by logout.
- **Cron secret**: `x-cron-secret: <CRON_SECRET>` (timing-safe compare).
- **Pagination**: `?page` (1-based) `&pageSize` (default 20, max 100). The
  envelope is `Page<T> = { items: T[]; total: number; page: number; pageSize: number }`.
- **Error body**: `{ "error": { "code": "<ERROR_CODE>", "message": "...", "fields"?: { "<path>": ["..."] } } }`.

### Error codes

| Code            | HTTP | Meaning                                                  |
| --------------- | ---- | -------------------------------------------------------- |
| `BAD_REQUEST`   | 400  | Malformed input not covered by Zod                       |
| `UNAUTHORIZED`  | 401  | Missing/invalid access token, refresh expired or replayed |
| `FORBIDDEN`     | 403  | Role gate failed or row-level ownership check failed     |
| `NOT_FOUND`     | 404  | Entity not found or soft-deleted                         |
| `CONFLICT`      | 409  | Slug taken, invalid state transition, taxonomy in-use    |
| `UNPROCESSABLE` | 422  | Zod validation failure; carries `fields`                 |
| `RATE_LIMITED`  | 429  | Auth endpoint throttle exceeded                          |
| `INTERNAL`      | 500  | Unhandled                                                |

---

## Auth

### POST `/api/auth/register`

Create a new user (always `AUTHOR` role) and issue tokens.

| Property | Value |
| --- | --- |
| Auth | none |
| Role | – |
| Schema | `RegisterSchema` |

| Field | Type | Required |
| --- | --- | --- |
| `email` | string (email, max 254) | yes |
| `name` | string (1–120) | yes |
| `password` | string (min 8, must contain a letter and a digit) | yes |

**Response (201)**: `{ "user": SessionUser, "accessToken": "<jwt>" }` and a `cms_rt` cookie.

**Errors**: `409` (email taken), `422` (validation).

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"new@example.com","name":"New User","password":"hunter12a"}'
# {"user":{"id":"clxx...","email":"new@example.com","name":"New User","role":"AUTHOR"},"accessToken":"eyJhbGciOi..."}
```

### POST `/api/auth/login`

| Property | Value |
| --- | --- |
| Auth | none |
| Role | – |
| Schema | `LoginSchema` |

| Field | Type | Required |
| --- | --- | --- |
| `email` | string (email) | yes |
| `password` | string | yes |

**Response (200)**: `{ "user": SessionUser, "accessToken": "<jwt>" }` and `cms_rt` cookie.

**Errors**: `401` (bad credentials), `429` (rate-limited per-IP), `422`.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -c cookies.txt \
  -d '{"email":"admin@local","password":"admin1234"}'
# {"user":{"id":"...","email":"admin@local","name":"Site Admin","role":"ADMIN"},"accessToken":"eyJ..."}
```

### POST `/api/auth/refresh`

Reads `cms_rt` cookie, rotates the refresh token (old token revoked, new
issued), returns a fresh access token. Reuse of an already-revoked token
**revokes the entire chain** for that user.

| Property | Value |
| --- | --- |
| Auth | refresh cookie |
| Role | – |
| Body | none |

**Response (200)**: `{ "user": SessionUser, "accessToken": "<jwt>" }`, new `cms_rt` cookie.

**Errors**: `401` (missing/expired/revoked refresh).

```bash
curl -X POST http://localhost:3000/api/auth/refresh -b cookies.txt -c cookies.txt
```

### POST `/api/auth/logout`

| Property | Value |
| --- | --- |
| Auth | refresh cookie (best-effort) |
| Role | – |
| Body | none |

**Response (200)**: `{ "ok": true }`. Clears `cms_rt` cookie.

```bash
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt -c cookies.txt
```

### GET `/api/auth/me`

| Property | Value |
| --- | --- |
| Auth | Bearer access token |
| Role | any |

**Response (200)**: `SessionUser = { id, email, name, role }`.

**Errors**: `401`.

```bash
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"
# {"id":"clxx...","email":"admin@local","name":"Site Admin","role":"ADMIN"}
```

---

## Users

### GET `/api/users`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | ADMIN |
| Query | `UserListQuerySchema` (`page`, `pageSize`, `q?`, `role?`) |

**Response (200)**: `Page<User>`.

**Errors**: `403`.

```bash
curl 'http://localhost:3000/api/users?page=1&pageSize=20' -H "Authorization: Bearer $TOKEN"
```

### POST `/api/users`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | ADMIN |
| Schema | `CreateUserSchema` |

| Field | Type | Required |
| --- | --- | --- |
| `email` | string (email) | yes |
| `name` | string (1–120) | yes |
| `role` | `"ADMIN" \| "EDITOR" \| "AUTHOR"` | yes |
| `password` | string (min 8, letter+digit) | yes |

**Response (201)**: `User`.

**Errors**: `403`, `409` (duplicate email), `422`.

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","name":"Jane","role":"EDITOR","password":"editor99"}'
```

### PATCH `/api/users/[id]`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | ADMIN |
| Schema | `UpdateUserSchema` (one of `role`, `softDeleted` required) |

| Field | Type | Required |
| --- | --- | --- |
| `role` | `"ADMIN" \| "EDITOR" \| "AUTHOR"` | one-of |
| `softDeleted` | boolean | one-of |

**Response (200)**: `User`. **Errors**: `403`, `404`, `422`.

```bash
curl -X PATCH http://localhost:3000/api/users/clxx... \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"role":"EDITOR"}'
```

---

## Content

Visibility on `GET /api/content`: AUTHOR sees own content (any status) plus
PUBLISHED of others; EDITOR/ADMIN see everything except soft-deleted rows.

### GET `/api/content`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | any |
| Query | `ContentListQuerySchema` |

| Query field | Type |
| --- | --- |
| `type` | `"POST" \| "PAGE"` (optional) |
| `status` | `ContentStatus` (optional) |
| `authorId` | string (optional) |
| `q` | string (optional, trimmed, 1–200) |
| `categoryId` | string (optional) |
| `tagId` | string (optional) |
| `page` | number (default 1) |
| `pageSize` | number (default 20, max 100) |

**Response (200)**: `Page<ContentSummary>`.

```bash
curl 'http://localhost:3000/api/content?type=POST&status=DRAFT&page=1' \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/content`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | AUTHOR, EDITOR, ADMIN |
| Schema | `CreateContentSchema` |

| Field | Type | Required |
| --- | --- | --- |
| `type` | `"POST" \| "PAGE"` | yes |
| `title` | string (1–200) | yes |
| `slug` | string (kebab-case, max 160) | optional (auto-derived) |
| `excerpt` | string (max 500) | optional |
| `body` | string (max 200000) | yes |
| `featuredMediaId` | string (cuid) | optional |
| `categoryIds` | string[] (max 10) | optional, default `[]` |
| `tagIds` | string[] (max 20) | optional, default `[]` |

**Response (201)**: `Content`. **Errors**: `409` (slug clash; service retries with `-2` suffix once), `422`.

```bash
curl -X POST http://localhost:3000/api/content \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"POST","title":"Hello","body":"# Hi"}'
```

### GET `/api/content/[id]`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | author-of OR EDITOR/ADMIN |

**Response (200)**: `ContentDetail`. **Errors**: `403`, `404`.

```bash
curl http://localhost:3000/api/content/clxx... -H "Authorization: Bearer $TOKEN"
```

### PATCH `/api/content/[id]`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | author-of (DRAFT only) OR EDITOR/ADMIN |
| Schema | `UpdateContentSchema` (`CreateContentSchema.partial().strict()`) |

`status` in the body is **defensively stripped** at the route layer; status
mutations go through `/transition`. Updates write a `Revision` snapshot inside
a transaction before mutating the row.

**Response (200)**: `Content`. **Errors**: `403`, `404`, `409`, `422`.

```bash
curl -X PATCH http://localhost:3000/api/content/clxx... \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"New title"}'
```

### DELETE `/api/content/[id]`

Soft-delete (sets `deletedAt`).

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | EDITOR/ADMIN OR author-of (DRAFT only) |

**Response (204)**. **Errors**: `403`, `404`.

### POST `/api/content/[id]/transition`

Run the editorial state machine.

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | AUTHOR, EDITOR, ADMIN (server enforces transition matrix) |
| Schema | `TransitionSchema` |

| Field | Type |
| --- | --- |
| `to` | `"DRAFT" \| "IN_REVIEW" \| "PUBLISHED" \| "ARCHIVED"` |

Allowed transitions:

| From \ Role | AUTHOR (own) | EDITOR / ADMIN |
| --- | --- | --- |
| `DRAFT` | `IN_REVIEW`, `ARCHIVED` | `IN_REVIEW`, `PUBLISHED`, `ARCHIVED` |
| `IN_REVIEW` | `DRAFT` (withdraw) | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `PUBLISHED` | – | `ARCHIVED`, `DRAFT` (unpublish) |
| `ARCHIVED` | – | `DRAFT` (restore) |

Entering `PUBLISHED` sets `publishedAt = now()` (if null) and clears
`scheduledFor`. **Errors**: `403`, `404`, `409` (invalid transition).

```bash
curl -X POST http://localhost:3000/api/content/clxx.../transition \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"to":"PUBLISHED"}'
```

### POST `/api/content/[id]/schedule`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | EDITOR, ADMIN |
| Schema | `ScheduleSchema` |

| Field | Type | Required |
| --- | --- | --- |
| `scheduledFor` | ISO 8601 datetime in the future | yes |

Sets `scheduledFor` on a `DRAFT` or `IN_REVIEW` row. Status is unchanged; the
cron flips to `PUBLISHED` when due.

**Response (200)**: `Content`. **Errors**: `403`, `422` (past date), `409`.

```bash
curl -X POST http://localhost:3000/api/content/clxx.../schedule \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"scheduledFor":"2026-06-01T09:00:00.000Z"}'
```

---

## Revisions

### GET `/api/content/[id]/revisions`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | author-of OR EDITOR/ADMIN |
| Query | `page`, `pageSize` |

**Response (200)**: `Page<RevisionSummary>`. **Errors**: `403`, `404`.

```bash
curl 'http://localhost:3000/api/content/clxx.../revisions?page=1' \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/content/[id]/revisions/[version]/restore`

Restoring loads version N's payload, writes it as version N+1, and applies it
to the live row (transactional).

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | EDITOR, ADMIN |
| Body | none |

**Response (200)**: `Content`. **Errors**: `400` (invalid version), `403`, `404`.

```bash
curl -X POST http://localhost:3000/api/content/clxx.../revisions/3/restore \
  -H "Authorization: Bearer $TOKEN"
```

---

## Categories

### GET `/api/categories`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | any |

**Response (200)**: `Category[]`.

```bash
curl http://localhost:3000/api/categories -H "Authorization: Bearer $TOKEN"
```

### POST `/api/categories`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | EDITOR, ADMIN |
| Schema | `CategorySchema` |

| Field | Type | Required |
| --- | --- | --- |
| `name` | string (1–120) | yes |
| `slug` | string (kebab-case) | optional (auto) |
| `description` | string (max 500) | optional |

**Response (201)**: `Category`. **Errors**: `403`, `409`, `422`.

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Engineering"}'
```

### PATCH `/api/categories/[id]`

Same body as POST. **Role**: EDITOR, ADMIN. **Errors**: `403`, `404`, `409`.

### DELETE `/api/categories/[id]`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | EDITOR, ADMIN |

**Response (204)**. **Errors**: `403`, `404`, `409` (in-use).

---

## Tags

### GET `/api/tags`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | any |

**Response (200)**: `Tag[]`.

### POST `/api/tags`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | EDITOR, ADMIN |
| Schema | `TagSchema` |

| Field | Type | Required |
| --- | --- | --- |
| `name` | string (1–80) | yes |
| `slug` | string (kebab-case) | optional |

**Response (201)**: `Tag`. **Errors**: `403`, `409`, `422`.

```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"typescript"}'
```

### PATCH `/api/tags/[id]`

Same body as POST. **Errors**: `403`, `404`, `409`.

### DELETE `/api/tags/[id]`

**Response (204)**. **Errors**: `403`, `404`.

---

## Media

### POST `/api/media`

`multipart/form-data` upload. MIME allowlist: PNG / JPEG / WebP / GIF / PDF
(SVG removed for stored-XSS reasons). Size cap **10 MB**. Stored under
`./uploads/YYYY/MM/<uuidv7>.<ext>`. Served via `/uploads/[...path]`.

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | AUTHOR, EDITOR, ADMIN |
| Body | multipart: `file` (required), `altText` (optional, max 300) |

**Response (201)**: `Media`. **Errors**: `400` (wrong content-type), `403`, `413` (size), `415` (mime), `422`.

```bash
curl -X POST http://localhost:3000/api/media \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@./photo.png' -F 'altText=Cover'
```

### GET `/api/media`

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | any (AUTHOR sees own; EDITOR/ADMIN sees all) |
| Query | `MediaListQuerySchema` (`page`, `pageSize`, `mime?`) |

**Response (200)**: `Page<Media>`.

```bash
curl 'http://localhost:3000/api/media?page=1&mime=image/png' \
  -H "Authorization: Bearer $TOKEN"
```

### DELETE `/api/media/[id]`

Unlinks the file and removes the row.

| Property | Value |
| --- | --- |
| Auth | Bearer |
| Role | uploader OR EDITOR/ADMIN |

**Response (204)**. **Errors**: `403`, `404`.

### GET `/uploads/[...path]`

Streams media files with `Cache-Control: public, max-age=31536000, immutable`.
Path-traversal hardened (`safeJoin` rejects `..`, URL-encoded variants, NUL,
absolute paths). **Errors**: `400` (traversal), `404`.

```bash
curl http://localhost:3000/uploads/2026/05/01HXX....png -o out.png
```

---

## Public

No auth. Read-only.

### GET `/api/public/posts`

| Query | Type |
| --- | --- |
| `page` | number (default 1) |
| `pageSize` | number (default 20, max 100) |

**Response (200)**: `Page<PublicPost>` (omits markdown body for list payloads;
detail call returns it).

```bash
curl 'http://localhost:3000/api/public/posts?page=1'
```

### GET `/api/public/posts/[slug]`

**Response (200)**: `{ "post": Content, "html": "<p>...</p>" }` — `html` is
sanitized via `rehype-sanitize`.

**Errors**: `404`.

```bash
curl http://localhost:3000/api/public/posts/welcome-to-the-cms
```

### GET `/api/public/categories/[slug]/posts`

Query: `page`, `pageSize`. **Response (200)**: `Page<PublicPost>`. **Errors**: `404`.

### GET `/api/public/tags/[slug]/posts`

Query: `page`, `pageSize`. **Response (200)**: `Page<PublicPost>`. **Errors**: `404`.

### GET `/api/public/pages/[slug]`

**Response (200)**: `{ "page": Content, "html": "..." }`. **Errors**: `404`.

```bash
curl http://localhost:3000/api/public/pages/about
```

---

## System

### GET `/api/health`

| Property | Value |
| --- | --- |
| Auth | none |

**Response (200|503)**: `{ "ok": boolean, "db": "up" \| "down", "uptime": number }`.

```bash
curl http://localhost:3000/api/health
# {"ok":true,"db":"up","uptime":123.45}
```

### POST `/api/cron/publish-scheduled`

Promotes all `DRAFT`/`IN_REVIEW` rows whose `scheduledFor <= now()` to
`PUBLISHED`. Idempotent. Triggers `revalidatePath` per published slug.

| Property | Value |
| --- | --- |
| Auth | header `x-cron-secret` (timing-safe) |
| Role | – |

**Response (200)**: `{ "published": <number> }`. **Errors**: `401`.

```bash
curl -X POST http://localhost:3000/api/cron/publish-scheduled \
  -H "x-cron-secret: $CRON_SECRET"
# {"published":2}
```
