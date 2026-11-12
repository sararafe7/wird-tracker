import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://wird.hasanat.dev",

  // Arabic only, served at the root (no /ar prefix; old /ar links redirect)
  integrations: [react(), sitemap()],

  // Cloudflare Pages SSR
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),

  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["clsx", "tailwind-merge"],
    },
  },
});
