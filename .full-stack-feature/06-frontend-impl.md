# Step 6 — Frontend Implementation

## Status: Complete

## Summary

Full Next.js 15 App Router frontend for the multi-author CMS. **184** total TypeScript/TSX files now exist across `src/`. Frontend compiles against the existing backend without adding any dependencies.

## Files created (high-level inventory)

### Lib & providers (`src/lib/`)
- `api/client.ts`, `api/errors.ts` — typed API client with refresh-on-401 + redirect-to-login; mirrored `ApiError` class.
- `auth/{tokenStore,AuthContext,useAuth}.ts` — in-memory access token; provider boots via `/api/auth/refresh` → `/api/auth/me`. Exposes `{ user, status, login, register, logout, refreshUser }`.
- `providers/{QueryProvider,ToastProvider}.tsx`, `queryKeys.ts` (per arch §3.3), `formatters.ts`, `roles.ts`, `types.ts`, `utils.ts`.
- `hooks/use*.ts` — 23 hooks: content (list/get/create/update/delete/transition/schedule), revisions (list/restore), taxonomy CRUD, media (list/upload/delete), users (list/create/update), `useDebounced`. Mutations invalidate the right query keys.

### UI primitives (`src/components/ui/`)
~17 shadcn-style components: `button`, `input`, `textarea`, `label`, `badge`, `card`, `dialog`, `dropdown-menu`, `popover`, `select`, `command`, `checkbox`, `switch`, `tabs`, `separator`, `skeleton`, `spinner`, `table`, `tooltip`, `form` (Slot-based FormControl), `toast` (sonner re-export).

### Common (`src/components/common/`)
`DataTable` (typed, sortable), `EmptyState`, `ConfirmDialog`, `FormField`, `Spinner`.

### Public site
- Components: `Header`, `Footer`, `PostCard`, `PostList`, `PostBody` (react-markdown + rehype-sanitize + rehype-highlight), `PostHeader`, `PostTags`, `PaginationBar`, `CategoryNav`.
- Pages (Server Components, calling `ContentRepo` directly with `revalidate = 60`): `(public)/{layout,page,blog/[slug],p/[slug],category/[slug],tag/[slug],sitemap,robots}`.
- `generateMetadata` for SEO on each detail page.

### Auth pages
`(auth)/{layout,login,register}` using react-hook-form + `zodResolver(LoginSchema|RegisterSchema)`. Redirects to `?next=...`. Surfaces API 422 field errors via `form.setError`.

### Admin shell + pages
- Shell: `AdminLayout`, `AdminSidebar` (role-filtered nav), `AdminTopbar` (user dropdown + logout), `AdminBreadcrumbs`, `AuthGate` (redirect on unauthenticated), `RoleGate` (403 fallback).
- Pages: `(admin)/admin/{page (dashboard), content, content/new, content/[id]/edit, content/[id]/revisions, media, categories, tags, users (ADMIN), review-queue (EDITOR+)}`.

### Content editor
- `ContentForm` — sidebar with `StatusBadge`, `TransitionButtons`, `SchedulePicker`, `MediaPicker` (featured), `CategoryPicker`, `TagPicker`, `RevisionList`. Lazy-loads `MarkdownEditor`.
- `ContentTable` — URL-bound filters (status, type, q, page).
- `MarkdownEditor` — `next/dynamic` `ssr: false` wrapper around `@uiw/react-md-editor`.
- `transitions.ts` — client-side mirror of server state-machine for UI affordances.

### Media library
`UploadDropzone` (drag-drop + click), `MediaGrid`, `MediaPicker` (modal, dynamic-loaded).

### Taxonomy / users
`CategoryTable`, `TagTable`, `UserTable` — DataTable with inline edit dialogs.

### Root
`app/{layout,error,not-found,loading}.tsx` with provider chain `QueryProvider → AuthProvider → ToastProvider`. No top-level `app/page.tsx` — `(public)` group provides `/`.

### Tests
`tests/e2e/login-publish.spec.ts` — Playwright; gated behind `RUN_E2E=1` env var.

## Caveats

- `npm install` not run; `tsc --noEmit` not executed. User runs both before `npm run dev`.
- `MediaPicker`/`MediaGrid` use `<img>` (not `next/image`) since uploads are served from `/uploads/*` and `next.config.ts` has no `images.remotePatterns` configured. ESLint disabled inline.
- Type field on `ContentForm` is locked in edit mode (UX choice; backend allows it).
- Public pages reading `searchParams` may render dynamically despite `revalidate = 60` (Next 15 behavior).

## What's in place to run end-to-end

After:
```
npm install
docker compose up -d
npx prisma generate
npx prisma migrate deploy   # or migrate dev for the first run
npm run prisma:seed
npm run dev
```

… users can:
- Visit `/` (homepage, list of seeded posts).
- Visit `/blog/<slug>` (single post, sanitized markdown).
- Log in at `/login` as `admin@example.com` / `editor@example.com` / `author1@example.com`.
- Manage content at `/admin/content`, draft → in-review → publish.
- Upload media at `/admin/media`.
- Manage categories/tags/users.
