import type { APIRoute } from "astro";

/** The app used to live under /ar; send old links to the same page at the root */
export const ALL: APIRoute = ({ params, url }) => {
  const path = params.path ? `/${params.path}` : "/";
  return new Response(null, {
    status: 301,
    headers: { Location: `${path}${url.search}` },
  });
};
