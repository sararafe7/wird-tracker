---
name: hasanat-auth
description: "Add shared Hasanat sign-in (auth.hasanat.dev, Google and GitHub) to an app served on a *.hasanat.dev subdomain. Use when reading the signed-in user, protecting pages or API routes, adding sign-in and sign-out links, or deciding how an app outside *.hasanat.dev can get Hasanat sign-in."
---

# Hasanat Auth Skill

## Overview

This skill covers sign-in with auth.hasanat.dev, the shared authentication service for apps served on `*.hasanat.dev`. Users sign in with Google or GitHub.

Builder guide: https://platform.hasanat.dev/services/sign-in/

## Architecture

auth.hasanat.dev runs Auth.js with JWT sessions.

- After sign-in it sets the session cookie `authjs.session-token` on the `.hasanat.dev` domain (httpOnly, Secure, SameSite=Lax). Browsers send it to every `https://*.hasanat.dev` site.
- The cookie is encrypted with a secret that only the auth service holds. Apps never decode it. They ask the auth service instead: `GET https://auth.hasanat.dev/api/auth/session` with the incoming `cookie` header. The response is the session JSON, or `null` when nobody is signed in.
- Sign-in page: `https://auth.hasanat.dev/api/auth/signin?callbackUrl=<url-encoded return URL>`. Return URLs are accepted for `https://hasanat.dev`, single-level subdomains such as `https://name.hasanat.dev`, and `http://localhost`. Any other return URL sends the user to auth.hasanat.dev instead.
- Sign-out: `https://auth.hasanat.dev/api/auth/signout`.
- Users manage their profile and connected accounts at `https://auth.hasanat.dev/account`.

**Apps outside `*.hasanat.dev`:** there is no OAuth flow for external apps. `auth.hasanat.dev/oauth/authorize` and `/oauth/token` do not exist, and no client IDs or client secrets are issued. To use Hasanat sign-in, serve the app on a `*.hasanat.dev` subdomain, or ask for sign-in support from the platform dashboard at https://platform.hasanat.dev/dashboard. Leave the commented `HASANAT_CLIENT_ID` and `HASANAT_CLIENT_SECRET` lines in the starter's `.env.example` unused.

## Session shape

```json
{
  "user": {
    "id": "…",
    "name": "…",
    "email": "…",
    "image": "…",
    "provider": "google",
    "githubUsername": null,
    "role": "user"
  },
  "expires": "…"
}
```

`role` comes from the auth service's user record and defaults to `"user"`. It is read when the user signs in, so a change applies after the next sign-in. It is not a Hasanat project role such as lead or moderator. Keep your app's own permissions in its own database, keyed by `user.id`.

## Usage in the starter

### How the middleware works

```
1. A request arrives at your app.
2. src/middleware.ts checks the session only for paths that start with /api/
   or contain /dashboard.
3. If the request carries the authjs.session-token cookie, the middleware
   forwards the cookie header to /api/auth/session on the auth service.
4. If the response has a user, it is stored in Astro.locals.user.
   Otherwise Astro.locals.user is null.
5. If the auth service is unreachable, the request continues without a user.
```

Widen `needsAuth` in `src/middleware.ts` if other pages must know the signed-in user. For example, the starter's home page shows a sign-in button even for signed-in users until you do.

### Accessing the User

```typescript
// In any .astro page or API route covered by the middleware:
const user = Astro.locals.user;

if (user) {
  // user.id — unique identifier
  // user.name — display name
  // user.email — email address
  // user.image — profile image URL
  // user.role — "user" by default; isAdmin() checks for "admin"
}
```

### Requiring Authentication

```typescript
import { requireAuth } from "@/lib/auth";

// Redirects to sign-in if not authenticated
const redirect = requireAuth(Astro.locals.user, Astro.url.href);
if (redirect) return redirect;
```

### Sign-In / Sign-Out Links

```typescript
import { getSignInUrl, getSignOutUrl } from "@/lib/auth";

const signIn = getSignInUrl(Astro.url.href);
const signOut = getSignOutUrl();
```

### Admin Check

```typescript
import { isAdmin } from "@/lib/auth";

if (isAdmin(Astro.locals.user)) {
  // Show admin controls
}
```

### From the browser

Pages served on a `*.hasanat.dev` subdomain can ask for the session from the browser. The auth service allows credentialed requests from `*.hasanat.dev` origins:

```js
const res = await fetch("https://auth.hasanat.dev/api/auth/session", {
  credentials: "include",
});
const session = await res.json(); // null when signed out
```

## Local development

The session cookie is scoped to `.hasanat.dev`, so it is never sent to `localhost`. In development, the starter's helpers point to `http://localhost:8788`, a local copy of the auth service. Its repository is private and most builders do not run it. Locally, `Astro.locals.user` stays `null` and sign-in links do not complete. Keep public pages working without a user, and test sign-in on a deployed `*.hasanat.dev` subdomain.

## Environment Variables

None. Shared sign-in needs no secrets in your app. Never ask for, copy, or set the auth service's `AUTH_SECRET` in an app.

## Important Notes

- Never store passwords, auth tokens, or the session cookie in your app.
- Use `Astro.locals.user` or the session endpoint. Do not try to decode the cookie yourself.
- The cookie is httpOnly, Secure, SameSite=Lax. Page JavaScript cannot read it.
- Idle sessions expire after 30 days, the Auth.js default. Each session check extends them.
- The sign-in page is in English today.
- Follow the starter's `DATA_POLICY.md`. Your app receives the user's ID, name, email, and image.
- Do NOT add Firebase Auth, Clerk, or any other auth provider.
