import { getSignInUrl } from "@/lib/auth";
import { type Actor, adminEmails, getActor } from "@/lib/server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export { json };

/** Emails offered by the local "who are you" switch; only ever sent in development */
async function devEmails(db: D1Database, env: Env): Promise<string[] | undefined> {
  if (!import.meta.env.DEV) return undefined;
  const { results } = await db.prepare("SELECT email FROM staff ORDER BY created_at").all<{
    email: string;
  }>();
  return [...new Set([...adminEmails(env), ...results.map((r) => r.email)])];
}

/**
 * Resolve the signed-in user for an API request, or the response to send instead (signed out).
 * Anyone signed in gets through; what she may see and change is decided in src/lib/server.ts.
 */
export async function resolveActor(
  locals: App.Locals,
  url: URL,
): Promise<{ db: D1Database; actor: Actor; dev?: string[] } | { response: Response }> {
  const env = locals.runtime.env;
  const db = env.DB;
  const dev = await devEmails(db, env);
  if (!locals.user) {
    return {
      response: json({ reason: "signed_out", signInUrl: getSignInUrl(`${url.origin}/`), dev }, 401),
    };
  }
  return { db, actor: await getActor(db, env, locals.user), dev };
}
