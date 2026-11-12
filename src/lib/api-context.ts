import { getSignInUrl } from "@/lib/auth";
import { getActor, supervisorEmails } from "@/lib/server";
import type { Staff } from "@/lib/store";

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
  return [...supervisorEmails(env), ...results.map((r) => r.email)];
}

/**
 * Resolve the signed-in staff member for an API request,
 * or the response to send instead (signed out, or signed in but not added).
 */
export async function resolveActor(
  locals: App.Locals,
  url: URL,
): Promise<{ db: D1Database; me: Staff; dev?: string[] } | { response: Response }> {
  const env = locals.runtime.env;
  const db = env.DB;
  const dev = await devEmails(db, env);
  if (!locals.user) {
    return {
      response: json(
        { reason: "signed_out", signInUrl: getSignInUrl(`${url.origin}/`), dev },
        401,
      ),
    };
  }
  const me = await getActor(db, env, locals.user);
  if (!me) {
    return { response: json({ reason: "not_added", email: locals.user.email ?? "", dev }, 403) };
  }
  return { db, me, dev };
}
