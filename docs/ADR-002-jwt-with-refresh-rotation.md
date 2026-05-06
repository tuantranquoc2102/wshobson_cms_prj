# ADR-002: JWT access token + opaque refresh token with rotation

## Status

Accepted.

## Context

The CMS is multi-author and runs locally without external identity
providers. Authentication needs to support short-lived API access for
mutations from the admin SPA, longer-lived sessions so writers do not have
to log in for every editing burst, server-side revocation when a user is
deleted or a device is lost, and resistance to common browser threats (XSS,
CSRF). The MVP runs on a single Next.js app — no separate auth service —
and must work cleanly on `http://localhost:3000` in dev.

## Decision

- **Access token**: signed JWT, **HS256**, **15-minute TTL**. Claims:
  `sub`, `role`, `iat`, `exp`, `jti`. Held only in **memory** on the client
  (`tokenStore`). Sent as `Authorization: Bearer <token>` on every API call.
- **Refresh token**: an **opaque** 256-bit base64url random string (not a
  JWT). Stored hashed (SHA-256) in the `RefreshToken` table. Delivered via
  an **httpOnly, SameSite=Lax** cookie (`cms_rt`) scoped to `/api/auth`.
  TTL **30 days**.
- **Rotation**: every successful refresh revokes the old token and issues a
  new one. Replay of an already-revoked refresh **revokes the entire chain**
  for that user (reuse detection). Cron secret comparisons use
  `timingSafeEqual`.

## Consequences

**Pros**

- CSRF resistance: cookies are SameSite=Lax and path-restricted; mutations
  require a Bearer header that browsers do not send cross-site without a
  preflight.
- XSS blast radius is bounded to 15 minutes — refresh cookies are httpOnly.
- Server-side revocation is trivial (delete or revoke the row).
- Stateless verification keeps the hot path fast (`jose.jwtVerify`).

**Cons**

- Refresh-token plumbing is the most complex piece of the auth stack
  (rotation, reuse detection, hashing, single-flight refresh on the client).
- Secret rotation requires a DB action: bump `JWT_ACCESS_SECRET` and
  revoke all outstanding refresh tokens.

## Alternatives considered

- **Session cookies only**: simpler and CSRF-vulnerable unless we add
  same-site + CSRF tokens. Rejected: spec calls for JWT.
- **Long-lived JWT, no refresh**: cannot revoke server-side; accepted blast
  radius too large.
- **OAuth / external IdP**: out of scope; the MVP is self-hosted local-dev.
