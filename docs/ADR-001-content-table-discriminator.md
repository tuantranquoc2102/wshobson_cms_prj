# ADR-001: Single `Content` table with `type` discriminator

## Status

Accepted.

## Context

The CMS supports two editorial entities: **Posts** (timeline content with
categories and tags) and **Pages** (standalone static content like About or
Contact). They share roughly 90% of their attributes — title, slug, body,
excerpt, status lifecycle, author, soft-delete, scheduled publish, SEO
metadata, revisions. They differ only in two ways: pages do not appear in
feeds and pages do not carry taxonomy. We needed to choose a storage shape.

## Decision

Use a **single `Content` table** with a `type: ContentType` column
(`POST | PAGE`) as a discriminator. The taxonomy join tables
(`ContentCategory`, `ContentTag`) reference `Content.id` directly; the
service layer only attaches them when `type = POST`. Revisions, lifecycle
states, scheduled-publish logic, and the public publication filter all live
on `Content`.

## Consequences

**Pros**

- One revision system, one publishing pipeline, one set of indexes, one
  repository class.
- The state machine (`DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`) and the
  scheduled-publish cron operate on a single table.
- Public listings filter by `type` cheaply via the
  `(type, status, publishedAt DESC)` composite index.

**Cons**

- `categoryIds`/`tagIds` are nullable for `PAGE` rows; service-layer guard is
  required to keep them empty rather than a database constraint.
- The `Content` table is wider than a dedicated `Page` table would be — at
  MVP scale this is negligible.

## Alternatives considered

- **Separate `Post` and `Page` tables.** Cleanest semantically, but it
  duplicates lifecycle, revisions, scheduling, soft-delete, and the public
  listing query. Two repos, two services, two migration paths.
- **Single-table inheritance with subtype tables.** Adds JOINs to every read
  for marginal benefit at this scale.

The discriminator approach optimises for less code today and a single source
of truth for content lifecycle, at the cost of a few service-layer guards.
