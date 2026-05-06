-- Partial index for the public feed query (homepage / category / tag listings).
-- Hit by every public page request. Smaller than the full composite because
-- it only covers PUBLISHED, non-soft-deleted rows.
CREATE INDEX "content_public_feed_idx"
  ON "Content" ("type", "publishedAt" DESC)
  WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;
