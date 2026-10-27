import { defineMiddleware } from "astro:middleware";

/** Local-only stand-in for sign-in, set by the "who are you" switch */
export const DEV_EMAIL_COOKIE = "wird_dev_email";

/**
 * Auth middleware — verifies sessions via auth.hasanat.dev.
 *
 * Uses the shared .hasanat.dev session cookie, so sign-in only works on *.hasanat.dev.
 * In development, the wird_dev_email cookie pretends to be that signed-in email instead;
 * import.meta.env.DEV is false in production builds, so that branch is removed there.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  // Prerendered pages (the privacy notice) have no request headers and need no user
  if (context.isPrerendered) return next();
  const cookie = context.request.headers.get("cookie") || "";

  // Check auth for API routes and protected pages
  const needsAuth =
    context.url.pathname.startsWith("/api/") || context.url.pathname.includes("/dashboard");

  if (import.meta.env.DEV) {
    const devEmail = context.cookies.get(DEV_EMAIL_COOKIE)?.value;
    if (needsAuth && devEmail) {
      context.locals.user = {
        id: `dev:${devEmail}`,
        name: devEmail.split("@")[0],
        email: devEmail,
      };
    }
    return next();
  }

  if (needsAuth && cookie.includes("authjs.session-token")) {
    try {
      const res = await fetch("https://auth.hasanat.dev/api/auth/session", {
        headers: { cookie },
      });

      if (res.ok) {
        const session = await res.json();
        if (session?.user) {
          context.locals.user = session.user;
        }
      } else {
        console.error("[wird] auth session check failed:", res.status);
      }
    } catch (error) {
      // Auth service unreachable — continue without user
      console.error("[wird] auth service unreachable:", error);
    }
  }

  return next();
});
