import type { APIRoute } from "astro";
import { json, resolveActor } from "@/lib/api-context";
import { opSchema } from "@/lib/ops";
import { HttpError, runOp } from "@/lib/server";

/** Apply one change after validating it and checking the user's permission */
export const POST: APIRoute = async ({ locals, url, request }) => {
  const ctx = await resolveActor(locals, url);
  if ("response" in ctx) return ctx.response;
  const parsed = opSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid change" }, 400);
  try {
    await runOp(ctx.db, ctx.me, parsed.data);
    return json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("[wird] op failed", parsed.data.type, error);
    return json({ error: "server error" }, 500);
  }
};
