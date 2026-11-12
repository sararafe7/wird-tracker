import type { APIRoute } from "astro";
import { json, resolveActor } from "@/lib/api-context";
import { loadData } from "@/lib/server";

/** Everything the signed-in user may see */
export const GET: APIRoute = async ({ locals, url }) => {
  const ctx = await resolveActor(locals, url);
  if ("response" in ctx) return ctx.response;
  return json({ ...(await loadData(ctx.db, locals.runtime.env, ctx.me)), dev: ctx.dev });
};
