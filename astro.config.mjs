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
    // `astro dev` keeps its own dependency cache: `astro check` and `astro build` re-optimize
    // dependencies too, and in a shared cache they replaced the files a running dev server
    // was serving (504 "Outdated Optimize Dep", leaving the app island blank)
    cacheDir: process.argv.includes("dev") ? "node_modules/.vite-dev" : "node_modules/.vite",
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["clsx", "tailwind-merge"],
    },
  },
});
