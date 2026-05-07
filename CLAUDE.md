# CLAUDE.md — Figma → Code Integration Rules

This document describes the design-system conventions Claude must follow when
translating Figma designs (via the Figma MCP server) into code in this
repository. It is the single source of truth for stack, tokens, components,
and styling decisions when generating UI.

---

## TL;DR — Mandatory rules for Figma → code

1. **Stack:** Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS 3 ·
   shadcn-style primitives over Radix UI · `lucide-react` icons.
2. **Tokens:** *Never* use raw hex/rgb/Tailwind palette colors. Use the
   semantic Tailwind tokens (`bg-background`, `text-foreground`,
   `border-border`, `bg-primary`, `text-primary-foreground`, …) which resolve
   via CSS variables in `src/app/globals.css`.
3. **Reuse, don't recreate:** Before generating a new component, check
   `src/components/ui/` for an existing primitive and `src/components/<feature>/`
   for higher-level pieces. Compose them; don't fork them.
4. **Class composition:** Always merge classes through `cn(...)` from
   `@/lib/utils`. Variant-driven primitives must use `class-variance-authority`
   (`cva`).
5. **Path alias:** Import via `@/...` (mapped to `src/...`).
6. **Server/Client:** App-Router layouts and pages are server components by
   default. Add `'use client'` *only* when the component uses state, effects,
   browser APIs, or React Hook Form.
7. **Icons:** `lucide-react` only. No SVG dumps from Figma — match the closest
   Lucide icon, sized via Tailwind (`h-4 w-4`, `h-3.5 w-3.5`).
8. **Typography & spacing:** Use Tailwind utilities (`text-sm`, `tracking-tight`,
   `space-y-2`, `gap-2`, `p-6`). Don't introduce arbitrary values like
   `text-[15px]` unless Figma's spec is *deliberately* off-grid.

---

## 1. Token Definitions

### Where tokens live

| Concern        | Source of truth                                      |
| -------------- | ---------------------------------------------------- |
| Color tokens   | `src/app/globals.css` (CSS custom properties, HSL)   |
| Token → utility binding | `tailwind.config.ts` (`theme.extend.colors`) |
| Border radius  | `--radius` in `globals.css`, mapped in tailwind cfg  |
| Spacing/typography | Tailwind defaults (no custom scale today)        |
| Dark mode      | `class` strategy — `.dark { ... }` in `globals.css`  |

### Format

Colors use the **shadcn HSL-channel pattern**: variables store space-separated
HSL components (no `hsl()` wrapper), and Tailwind wraps them at consumption:

```css
/* src/app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
  --radius: 0.5rem;
}
.dark { --background: 222.2 84% 4.9%; /* ... */ }
```

```ts
// tailwind.config.ts
colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
  // border, input, ring, secondary, destructive, muted, accent, popover, card
}
```

### Semantic token mapping (use these — not raw colors)

| Figma role             | Tailwind utility                                      |
| ---------------------- | ----------------------------------------------------- |
| Page background        | `bg-background`                                       |
| Body text              | `text-foreground`                                     |
| Surface / panel        | `bg-card text-card-foreground`                        |
| Subtle surface         | `bg-muted text-muted-foreground`                      |
| Primary action         | `bg-primary text-primary-foreground`                  |
| Secondary action       | `bg-secondary text-secondary-foreground`              |
| Hover/selected accent  | `bg-accent text-accent-foreground`                    |
| Destructive / error    | `bg-destructive text-destructive-foreground`          |
| Borders & dividers     | `border` (consumes `border-border` via globals.css `*` rule) |
| Input borders          | `border-input`                                        |
| Focus ring             | `ring-ring`                                           |
| Pop surface (menus)    | `bg-popover text-popover-foreground`                  |

Status accents in `Badge` (`success`, `warning`, `info`) are the **only**
direct palette colors allowed (`bg-emerald-500`, `bg-amber-500`, `bg-sky-500`).
Don't add more without a corresponding semantic token.

### No transformation pipeline

There is **no** Style Dictionary / token transformer. Tokens are authored once
in `globals.css` and referenced via Tailwind. If Figma exports tokens, map
them by hand into `globals.css` (light + dark) and add a Tailwind utility in
`theme.extend.colors` if the role is new.

---

## 2. Component Library

### Architecture

Three-tier component layout:

```
src/components/
├── ui/         # shadcn-style primitives (button, card, input, dialog, …)
├── common/     # cross-feature composites (DataTable, EmptyState, FormField, …)
└── <feature>/  # feature-specific pieces (admin, content, public, media, …)
```

- `ui/*` wraps **Radix UI** primitives + `cva` variants. These are the
  building blocks Figma components should map onto.
- `common/*` are app-agnostic but project-wide (e.g. `EmptyState`,
  `ConfirmDialog`).
- `<feature>/*` is feature-scoped (e.g. `public/PostCard.tsx`,
  `admin/AdminSidebar.tsx`, `content/StatusBadge.tsx`).

### Available primitives (`src/components/ui/`)

`badge`, `button`, `card`, `checkbox`, `command`, `dialog`, `dropdown-menu`,
`form`, `input`, `label`, `popover`, `select`, `separator`, `skeleton`,
`spinner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`.

### Variant pattern (`cva`)

When a Figma component has multiple visual variants, model them with `cva`:

```tsx
// src/components/ui/button.tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: { default: 'h-9 px-4 py-2', sm: 'h-8 px-3 text-xs', lg: 'h-10 px-6', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
```

Rules for new variant components:
- Always export both the component and the `*Variants` function.
- Use `forwardRef` for primitives that wrap a DOM element.
- Set `displayName`.
- Support `asChild` (Radix `Slot`) when the element role is composable.

### Composable card pattern

`Card` decomposes into `CardHeader`, `CardTitle`, `CardDescription`,
`CardContent`, `CardFooter`. Mirror this when a Figma card has header / body /
footer regions — don't pass slots as props.

### Forms

Use the `react-hook-form` + Zod stack already wired through
`src/components/ui/form.tsx`:

```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/common/FormField';
import { Input } from '@/components/ui/input';
```

`FormField` connects to RHF's `Controller`; `FormControl` is a Radix `Slot`
that wires `id`/`aria-describedby`/`aria-invalid` automatically.

### No Storybook / no docs site

There is no Storybook. The closest reference for "how a primitive is used" is
its consumers — grep `src/components/<feature>/` and `src/app/`. When adding
a new primitive, also add at least one consumer usage in the same PR.

---

## 3. Frameworks & Libraries

| Concern              | Choice                                                |
| -------------------- | ----------------------------------------------------- |
| Framework            | **Next.js 15** (App Router, RSC) on **React 19**      |
| Language             | TypeScript 5.6, `strict: true`, `noUncheckedIndexedAccess` |
| Styling              | **Tailwind CSS 3.4** + CSS variables                   |
| Class composition    | `clsx` + `tailwind-merge` exposed as `cn()`           |
| Variants             | `class-variance-authority` (cva)                      |
| Headless primitives  | `@radix-ui/react-*` (dialog, dropdown, popover, …)    |
| Icons                | `lucide-react`                                        |
| Forms                | `react-hook-form` + `zod` + `@hookform/resolvers`     |
| Data fetching        | `@tanstack/react-query`                               |
| Toasts               | `sonner` (mounted via `ToastProvider`)                |
| Markdown editor      | `@uiw/react-md-editor` (admin only)                   |
| Markdown render      | `react-markdown` + `remark-gfm` + `rehype-sanitize`   |
| Build / bundler      | Next.js (Turbopack/Webpack — managed by Next)         |
| PostCSS              | `tailwindcss` + `autoprefixer`                        |
| Testing              | Vitest (unit + integration), Playwright (E2E)         |

> Do **not** introduce a new styling lib (styled-components, emotion, CSS
> Modules) — Tailwind + CSS vars is the project standard.

---

## 4. Asset Management

### User-uploaded media

User-uploaded files (the CMS's media library) live **outside `node_modules`**
in the repo-root `uploads/` directory and are served by an authenticated
Next.js route handler:

- Storage path: `<repo-root>/uploads/<storagePath>`
- Public URL: `/uploads/<storagePath>` (handled by
  `src/app/uploads/[...path]/route.ts`)
- The route looks up `Media.mimeType` in the DB, streams the file, and sets
  `Cache-Control: public, max-age=31536000, immutable`.

### Static assets

There is **no `public/` folder** in this project. Static product assets
should be added to `public/` if/when needed; do not put them under
`uploads/` (that directory is reserved for runtime user uploads).

### Optimization

- `sharp@^0.33` is available server-side for image processing in upload
  pipelines (server code only — not a Figma concern).
- The CMS uses `<img>` (with the `@next/next/no-img-element` rule disabled at
  call sites) for media-library thumbnails because URLs are dynamic and
  authenticated. For *new* product/marketing imagery, prefer `next/image`.
- No CDN is configured; the immutable cache header on `/uploads/*` is the
  whole story.

### Referencing media in components

```tsx
const url = `/uploads/${item.storagePath}`;
// eslint-disable-next-line @next/next/no-img-element
<img src={url} alt={item.altText ?? item.filename} className="h-full w-full object-cover" />
```

---

## 5. Icon System

- **Library:** `lucide-react` — exclusively. Do not paste SVGs from Figma.
- **Import style:** Named imports at top of file:
  ```tsx
  import { Trash2, Copy, Check, FileText, Folder, Home } from 'lucide-react';
  ```
- **Aliasing:** When the icon name collides with a domain type, alias it:
  ```tsx
  import { Image as ImageIcon, Tag as TagIcon, Users as UsersIcon } from 'lucide-react';
  ```
- **Sizing:** Always size via Tailwind classes, not the `size` prop:
  - Default in-button: `h-4 w-4`
  - Compact (table actions, inline badges): `h-3.5 w-3.5`
  - Match the line-height of the surrounding text.
- **Color:** Inherit from `currentColor` — let the parent's `text-*` token
  drive it. Don't pass `color="..."`.

If Figma uses an icon Lucide doesn't have, pick the closest match and note it
in the PR description rather than vendoring a new SVG.

---

## 6. Styling Approach

### Methodology

**Utility-first Tailwind.** No CSS Modules, no styled-components. The only
hand-written CSS is `src/app/globals.css` (token vars + a global border-color
reset).

### Class composition rule

Every component that accepts `className` must merge it through `cn`:

```tsx
import { cn } from '@/lib/utils';

className={cn('flex h-9 w-full rounded-md border border-input bg-background …', className)}
```

This guarantees consumer overrides win without producing class duplicates
(`tailwind-merge` resolves conflicts).

### Global styles

The only globals are in `src/app/globals.css`:
1. CSS variables for both themes (`:root` and `.dark`).
2. `* { @apply border-border }` — every border defaults to the token color.
3. `body { @apply bg-background text-foreground }`.

Add new global rules **only** if a Tailwind utility cannot express it.

### Responsive design

Mobile-first Tailwind breakpoints. Standard scale (`sm`, `md`, `lg`, `xl`,
`2xl`). Container is centered with `2rem` padding and a max width of
`1400px` at `2xl`:

```ts
container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } }
```

Common responsive patterns from existing code:
- Sidebar hidden on mobile: `hidden w-60 shrink-0 border-r bg-card md:block`
- Grid scaling: `grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
- Page shell: `<main className="flex-1 py-10"><div className="container">…</div></main>`

### Dark mode

Class-based (`darkMode: ['class']`). Don't write `dark:` overrides for color
— the semantic tokens already swap. Use `dark:` only for layout/structural
deltas if absolutely needed.

### Focus & a11y conventions

- Focus ring: `focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-ring focus-visible:ring-offset-2` (see `Button`).
- Disabled: `disabled:pointer-events-none disabled:opacity-50`.
- Always set `aria-*` and `htmlFor` via the `Form*` primitives — don't
  hand-roll.

---

## 7. Project Structure

### Top-level layout

```
src/
├── app/                        # Next.js App Router
│   ├── (admin)/                # Route group: admin area (auth-gated)
│   ├── (auth)/                 # Route group: login / register
│   ├── (public)/               # Route group: blog homepage, posts, taxonomy
│   ├── api/                    # Route handlers (REST)
│   ├── uploads/[...path]/      # Authenticated media streaming route
│   ├── globals.css             # Tokens + base layer
│   ├── layout.tsx              # Root layout (providers)
│   ├── error.tsx, not-found.tsx, loading.tsx
│
├── components/
│   ├── ui/                     # shadcn-style primitives (Tier 1)
│   ├── common/                 # cross-feature composites (Tier 2)
│   ├── admin/                  # admin shell (sidebar, topbar, gates)
│   ├── content/                # CMS content authoring
│   ├── media/                  # media library
│   ├── public/                 # public-facing blog (Header, PostCard, …)
│   ├── taxonomy/               # categories & tags pickers
│   └── users/                  # user-management UI
│
├── lib/                        # Client-shared utilities
│   ├── api/                    # fetch helpers, ApiError
│   ├── auth/                   # AuthContext, useAuth, AuthGate logic
│   ├── hooks/                  # React Query hooks (useMedia, useDeleteMedia, …)
│   ├── providers/              # QueryProvider, ToastProvider
│   ├── formatters.ts           # formatDate, formatBytes, …
│   ├── queryKeys.ts, roles.ts, types.ts, utils.ts
│
└── server/                     # Server-only code (DB, repos, http helpers) — never imported from client
```

Top-level (outside `src/`):
```
prisma/             # Prisma schema, migrations, seed
scripts/            # tsx scripts (env check, scheduled publish)
tests/              # vitest + playwright suites
uploads/            # runtime user uploads (gitignored content)
docs/               # ADRs, API docs, runbook
```

### Path alias

```json
// tsconfig.json
"paths": { "@/*": ["src/*"] }
```

Always import via `@/components/...`, `@/lib/...`, never relative paths
across directories.

### Route groups & layouts

Each route group has its own layout:

- `(public)/layout.tsx` — `Header` + main `container` + `Footer`.
- `(admin)/layout.tsx` — wraps in `AdminLayout` (sidebar + topbar + auth/role
  gates).
- `(auth)/layout.tsx` — minimal centered layout for login/register.
- `app/layout.tsx` — root: html shell + `QueryProvider` + `AuthProvider` +
  `ToastProvider`.

When generating a Figma-derived page, decide **which route group it belongs
to** first; that determines the surrounding chrome.

### Server vs client components

- Pages and layouts are **server components by default** (no `'use client'`).
  Fetch with Prisma directly (see `src/app/(public)/page.tsx`).
- Add `'use client'` for any component that:
  - Uses hooks (`useState`, `useEffect`, `usePathname`, `useAuth`, …)
  - Uses `react-hook-form`
  - Calls browser APIs (`navigator.clipboard`, `localStorage`)
  - Renders Radix interactive primitives that need state
- Most files in `components/ui/` and `components/<feature>/` are client
  components. Pure presentational pieces (e.g. `PostCard`) can stay server
  components — keep them server unless you need interactivity.

### Feature pattern

A typical feature folder pairs:
- A **list/table** (`ContentTable.tsx`)
- A **form** (`ContentForm.tsx`)
- A **status/visual** helper (`StatusBadge.tsx`, `transitions.ts`)
- Nested **pickers/selectors** when relevant (`CategoryPicker.tsx`,
  `TagPicker.tsx`)

Mirror this layout when a Figma flow introduces a new feature. Don't drop
feature-specific components into `ui/` or `common/`.

---

## Figma → Code workflow checklist

When converting a `get_design_context` response:

1. **Identify the route group** — public / admin / auth — and the surrounding
   layout it inherits.
2. **Map every color** to a semantic token (§1). Reject raw hex unless you've
   added the corresponding token to `globals.css` + `tailwind.config.ts`.
3. **Find the closest primitive** in `src/components/ui/`. Compose it; extend
   variants via `cva` only if the new variant is reusable.
4. **Convert icons** to `lucide-react` (§5).
5. **Wrap text/spacing** in Tailwind utilities; the container, page padding,
   and card padding patterns above are the project defaults.
6. **Decide server vs client** (§7). Default server.
7. **Always import via `@/...`** and merge `className` through `cn`.
8. **Add the consumer** in the appropriate `<feature>/` directory; route
   pages live under `src/app/<group>/...`.
9. **Verify dark mode** — if you used semantic tokens, this is free; if you
   used a palette color, fix it.

If a Figma decision conflicts with the rules above (e.g. a one-off accent
color, a non-Lucide icon, a custom spacing scale), surface the conflict in
the PR description rather than silently bypassing the system.
