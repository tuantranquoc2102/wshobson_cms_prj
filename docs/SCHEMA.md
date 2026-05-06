# Database Schema Reference

Canonical source: [`prisma/schema.prisma`](../prisma/schema.prisma). This page
summarises tables, indexes, foreign keys, migrations, and seed data.

PostgreSQL 16. IDs are `cuid` strings. Soft deletes via `deletedAt` on `User`
and `Content`.

## Enums

| Enum | Values |
| --- | --- |
| `Role` | `ADMIN`, `EDITOR`, `AUTHOR` |
| `ContentType` | `POST`, `PAGE` |
| `ContentStatus` | `DRAFT`, `IN_REVIEW`, `PUBLISHED`, `ARCHIVED` |
| `MediaKind` | `IMAGE`, `VIDEO`, `DOCUMENT`, `OTHER` |

## Entity Relationship Diagram

```mermaid
erDiagram
    User            ||--o{ Content          : authors
    User            ||--o{ RefreshToken     : issues
    User            ||--o{ Revision         : creates
    User            ||--o{ Media            : uploads
    User            ||--o{ ActivityLog      : performs

    Content         ||--o{ Revision         : "has history"
    Content         ||--o{ ContentCategory  : "tagged in"
    Content         ||--o{ ContentTag       : "tagged in"
    Content         }o--|| Media            : "featured image"

    Category        ||--o{ ContentCategory  : groups
    Tag             ||--o{ ContentTag       : labels

    User {
        string   id PK
        string   email UK
        string   passwordHash
        string   name
        Role     role
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }
    RefreshToken {
        string   id PK
        string   userId FK
        string   tokenHash UK
        datetime expiresAt
        datetime revokedAt
    }
    Content {
        string        id PK
        ContentType   type
        string        slug UK
        string        title
        string        body
        ContentStatus status
        datetime      publishedAt
        datetime      scheduledFor
        string        authorId FK
        string        featuredMediaId FK
    }
    Revision {
        string   id PK
        string   contentId FK
        int      version
        string   title
        string   body
        string   authorId FK
    }
    Category { string id PK; string slug UK; string name }
    Tag      { string id PK; string slug UK; string name }
    ContentCategory { string contentId FK; string categoryId FK }
    ContentTag      { string contentId FK; string tagId FK }
    Media {
        string    id PK
        string    storagePath UK
        string    mimeType
        MediaKind kind
        int       sizeBytes
        string    uploadedById FK
    }
    ActivityLog {
        string   id PK
        string   actorId FK
        string   action
        string   entityType
        string   entityId
    }
```

---

## Tables

### `User`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | text (cuid) | no | `cuid()` |
| `email` | text | no | – (unique) |
| `passwordHash` | text | no | – |
| `name` | text | no | – |
| `role` | `Role` | no | `AUTHOR` |
| `createdAt` | timestamp | no | `now()` |
| `updatedAt` | timestamp | no | auto |
| `deletedAt` | timestamp | yes | – |

**Indexes**: `@unique(email)`, `(role)`, `(deletedAt)`.
**FKs out**: – (referenced by `Content.authorId`, `Revision.authorId`,
`RefreshToken.userId`, `Media.uploadedById`, `ActivityLog.actorId`).

### `RefreshToken`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | text | no | `cuid()` |
| `userId` | text | no | – |
| `tokenHash` | text | no | – (unique) |
| `expiresAt` | timestamp | no | – |
| `revokedAt` | timestamp | yes | – |
| `createdAt` | timestamp | no | `now()` |

**Indexes**: `@unique(tokenHash)`, `(userId)`, `(expiresAt)`.
**FKs**: `userId → User.id` (`onDelete: Cascade`).

### `Content`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | text | no | `cuid()` |
| `type` | `ContentType` | no | – |
| `slug` | text | no | – (unique) |
| `title` | text | no | – |
| `excerpt` | text | yes | – |
| `body` | text | no | – |
| `status` | `ContentStatus` | no | `DRAFT` |
| `publishedAt` | timestamp | yes | – |
| `scheduledFor` | timestamp | yes | – |
| `authorId` | text | no | – |
| `featuredMediaId` | text | yes | – |
| `createdAt` | timestamp | no | `now()` |
| `updatedAt` | timestamp | no | auto |
| `deletedAt` | timestamp | yes | – |

**Indexes**: `@unique(slug)`, `(type, status, publishedAt DESC)`,
`(status, scheduledFor)`, `(authorId, status)`, `(deletedAt)`,
`(updatedAt DESC)`. Plus the partial index `content_public_feed_idx` on
`(type, publishedAt DESC) WHERE status = 'PUBLISHED' AND deletedAt IS NULL`.
**FKs**: `authorId → User.id`, `featuredMediaId → Media.id` (nullable).

### `Revision`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | text | no | `cuid()` |
| `contentId` | text | no | – |
| `version` | integer | no | – |
| `title` | text | no | – |
| `body` | text | no | – |
| `excerpt` | text | yes | – |
| `authorId` | text | no | – |
| `createdAt` | timestamp | no | `now()` |

**Indexes**: `@@unique(contentId, version)`, `(contentId, createdAt DESC)`.
**FKs**: `contentId → Content.id` (`onDelete: Cascade`), `authorId → User.id`.

### `Category`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | text | no | `cuid()` |
| `slug` | text | no | – (unique) |
| `name` | text | no | – |
| `description` | text | yes | – |
| `createdAt` | timestamp | no | `now()` |

**Indexes**: `@unique(slug)`.

### `Tag`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | text | no | `cuid()` |
| `slug` | text | no | – (unique) |
| `name` | text | no | – |
| `createdAt` | timestamp | no | `now()` |

**Indexes**: `@unique(slug)`.

### `ContentCategory` (join)

| Column | Type | Nullable |
| --- | --- | --- |
| `contentId` | text | no |
| `categoryId` | text | no |

PK: `(contentId, categoryId)`. Index: `(categoryId)`.
FKs: both cascade on parent delete.

### `ContentTag` (join)

| Column | Type | Nullable |
| --- | --- | --- |
| `contentId` | text | no |
| `tagId` | text | no |

PK: `(contentId, tagId)`. Index: `(tagId)`. FKs: cascade.

### `Media`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | text | no | `cuid()` |
| `filename` | text | no | – |
| `storagePath` | text | no | – (unique) |
| `mimeType` | text | no | – |
| `kind` | `MediaKind` | no | – |
| `sizeBytes` | integer | no | – |
| `width` | integer | yes | – |
| `height` | integer | yes | – |
| `altText` | text | yes | – |
| `uploadedById` | text | no | – |
| `createdAt` | timestamp | no | `now()` |

**Indexes**: `@unique(storagePath)`, `(uploadedById, createdAt DESC)`, `(kind)`.
**FKs**: `uploadedById → User.id`.

### `ActivityLog`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | text | no | `cuid()` |
| `actorId` | text | no | – |
| `action` | text | no | – |
| `entityType` | text | no | – |
| `entityId` | text | no | – |
| `metadata` | jsonb | yes | – |
| `createdAt` | timestamp | no | `now()` |

**Indexes**: `(createdAt DESC)`, `(actorId, createdAt DESC)`,
`(entityType, entityId)`. **FKs**: `actorId → User.id`.

---

## Migrations

| Migration | Description |
| --- | --- |
| `0001_init` | Generated initial migration: enums, all tables, FKs, base indexes. |
| `0002_partial_indexes` | Hand-written `CREATE INDEX content_public_feed_idx ON "Content" (type, "publishedAt" DESC) WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL;`. |

Apply with `npx prisma migrate deploy`. Reset is `docker compose down -v &&
docker compose up -d && npx prisma migrate deploy && npm run prisma:seed`.

---

## Seed data (`prisma/seed.ts`)

The seed is idempotent (`upsert` on stable keys: email, slug). It bootstraps:

**Users** — passwords are bcrypt-hashed at cost 12.

| Role   | Email             | Password (default)            |
| ------ | ----------------- | ----------------------------- |
| ADMIN  | `admin@local`*    | `admin1234`*                  |
| EDITOR | `editor@local`    | `editor1234`                  |
| AUTHOR | `author1@local`   | `author1234`                  |
| AUTHOR | `author2@local`   | `author1234`                  |

\* Overridable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

**Categories**: Engineering, Design, Product, Culture, Announcements (5).

**Tags**: typescript, nextjs, react, prisma, postgres, design-systems,
accessibility, performance, security, testing, roadmap, release-notes (12).

**Content**: 10 sample posts spanning all four `ContentStatus` values plus
one scheduled post (`scheduledFor` ~2 days out), and 1 PAGE row with slug
`about`. No media is seeded (no real files exist).
