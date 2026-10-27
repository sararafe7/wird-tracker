/**
 * Auth helpers for auth.hasanat.dev integration.
 *
 * Cloudflare-hosted apps use shared cookies automatically.
 * External apps should use the OAuth flow.
 */

const AUTH_URL = import.meta.env.DEV ? "http://localhost:8788" : "https://auth.hasanat.dev";

/** Redirect the user to the Hasanat sign-in page */
export function getSignInUrl(callbackUrl?: string): string {
  const callback =
    callbackUrl || (import.meta.env.DEV ? "http://localhost:4321" : import.meta.env.SITE);
  return `${AUTH_URL}/api/auth/signin?callbackUrl=${encodeURIComponent(callback)}`;
}

/** Redirect to sign out */
export function getSignOutUrl(): string {
  return `${AUTH_URL}/api/auth/signout`;
}

/** Check if a user object represents an admin */
export function isAdmin(user: App.Locals["user"]): boolean {
  return user?.role === "admin";
}

/** Require authentication — redirect to sign-in if not logged in */
export function requireAuth(user: App.Locals["user"], redirectUrl: string): Response | null {
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { Location: getSignInUrl(redirectUrl) },
    });
  }
  return null;
}
