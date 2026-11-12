# Hasanat App — Agent Instructions

You are helping build a Hasanat app — a web application that serves
the Muslim community, hosted under the hasanat.dev platform.

## Stack

- **Framework**: Astro 5 (SSR) + React 19
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict)
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: auth.hasanat.dev (shared cookie for Cloudflare-hosted, OAuth for external)
- **Deployment**: Cloudflare Pages
- **i18n**: Arabic (RTL, default) + English

## Conventions

- Use `@/` path aliases for imports
- Use Tailwind logical properties for RTL: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`
- Update both `ar.json` and `en.json` for any new user-facing text
- Use Biome for formatting (not Prettier)
- Use zod for input validation
- Use `lucide-react` for icons

## Auth Integration

Access the current user via middleware:

```typescript
const user = Astro.locals.user;
// Returns { id, name, email, image, role } or null
```

Redirect to sign-in:

```typescript
import { getSignInUrl, requireAuth } from "@/lib/auth";

// In a page: redirect if not logged in
const redirect = requireAuth(Astro.locals.user, Astro.url.href);
if (redirect) return redirect;
```

## Database Access

```typescript
import { getDB, queryAll, queryOne, execute } from "@/lib/db";

const db = getDB(Astro.locals);
const items = await queryAll(db, "SELECT * FROM items WHERE status = ?", "active");
const item = await queryOne(db, "SELECT * FROM items WHERE id = ?", id);
await execute(db, "INSERT INTO items (title_ar) VALUES (?)", title);
```

## API Routes

```typescript
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime.env.DB;
  const { results } = await db.prepare("SELECT * FROM items").all();
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
};
```

## Design Principles

- Arabic-first, RTL by default
- Islamic aesthetic: emerald/teal palette (`#0f766e`)
- Clarity over decoration
- Accessibility: focus states, contrast, screen readers
- Mobile-first responsive design

## File Organization

- Pages go in `src/pages/` (Arabic only, served at the root; `src/pages/ar/[...path].ts` redirects old `/ar/...` links)
- API routes go in `src/pages/api/`
- Shared components go in `src/components/`
- React islands use `client:load` or `client:visible`
- Keep i18n strings in `src/i18n/ar.json` and `en.json`

## Don't

- Don't add Firebase — use auth.hasanat.dev for auth and D1 for data
- Don't add Prettier — use Biome
- Don't hardcode Arabic/English text — use i18n translations
- Don't use `margin-left`/`margin-right` — use `ms-*`/`me-*` for RTL
