import type { APIRoute } from "astro";
import { json, resolveActor } from "@/lib/api-context";
import { HttpError, loadSummaries } from "@/lib/server";

/** App admins only: every initiative's name, supervisors and counts */
export const GET: APIRoute = async ({ locals, url }) => {
  const ctx = await resolveActor(locals, url);
  if ("response" in ctx) return ctx.response;
  try {
    return json(await loadSummaries(ctx.db, ctx.actor));
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    throw error;
  }
};
