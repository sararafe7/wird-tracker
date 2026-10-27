import type { APIRoute } from "astro";

/** Health check — returns app status */
export const GET: APIRoute = async ({ locals }) => {
  const hasDB = !!locals.runtime?.env?.DB;
  return new Response(
    JSON.stringify({ status: "ok", database: hasDB ? "connected" : "not configured" }),
    { headers: { "Content-Type": "application/json" } },
  );
};
