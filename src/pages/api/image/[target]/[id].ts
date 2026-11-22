import type { APIRoute } from "astro";
import { json, resolveActor } from "@/lib/api-context";
import { loadImage } from "@/lib/server";

/** An initiative's image, for people who may see it (checked in loadImage) */
export const GET: APIRoute = async ({ locals, url, params }) => {
  const ctx = await resolveActor(locals, url);
  if ("response" in ctx) return ctx.response;
  const image =
    params.target === "initiative" && params.id
      ? await loadImage(ctx.db, ctx.actor, params.id)
      : null;
  if (!image) return json({ error: "not found" }, 404);
  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.mime,
      // The URL carries the image's version, so a new upload gets a new URL
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
};
