import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  // Update to your app's production URL (e.g., https://yourapp.hasanat.dev)
  site: "https://yourapp.hasanat.dev",

  // Arabic-first, with English support
  i18n: {
    defaultLocale: "ar",
    locales: ["ar"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },

  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: "ar",
        locales: { ar: "ar" },
      },
    }),
  ],

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
