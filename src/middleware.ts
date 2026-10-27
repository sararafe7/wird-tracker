import { defineMiddleware } from "astro:middleware";

/**
 * Auth middleware — verifies sessions via auth.hasanat.dev.
 *
 * For Cloudflare-hosted apps: uses the shared .hasanat.dev session cookie.
 * For external apps: use the OAuth flow instead (see .github/skills/hasanat-auth/).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const cookie = context.request.headers.get("cookie") || "";

  // Check auth for API routes and protected pages
  const needsAuth =
    context.url.pathname.startsWith("/api/") || context.url.pathname.includes("/dashboard");

  if (needsAuth && cookie.includes("authjs.session-token")) {
    try {
      const authUrl =
        context.url.hostname === "localhost" ? "http://localhost:8788" : "https://auth.hasanat.dev";

      const res = await fetch(`${authUrl}/api/auth/session`, {
        headers: { cookie },
      });

      if (res.ok) {
        const session = await res.json();
        if (session?.user) {
          context.locals.user = session.user;
        }
      }
    } catch {
      // Auth service unreachable — continue without user
    }
  }

  // Default: no user
  if (!context.locals.user) {
    context.locals.user = null;
  }

  return next();
});
