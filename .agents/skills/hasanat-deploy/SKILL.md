---
name: hasanat-deploy
description: "Deploy a Hasanat starter app to Cloudflare and connect a name.hasanat.dev subdomain. Use when building for production, deploying with Wrangler, setting environment variables or secrets, adding CI/CD, or requesting a subdomain from platform.hasanat.dev."
---

# Hasanat Deploy Skill

## Overview

Deploy Hasanat apps to Cloudflare. The starter uses Astro 5 with Cloudflare Pages (`pages_build_output_dir` in `wrangler.toml`).

With Astro 6 or later, the Cloudflare adapter deploys to Workers only: build with `astro build`, deploy with `npx wrangler deploy`, and attach the subdomain to the Worker as a Custom Domain.

Builder guide: https://platform.hasanat.dev/services/deploy-and-subdomains/

## Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
3. Authenticated: `npx wrangler login`

Ask the user before deploying, and only after `npm run check` and `npm run build` pass.

## Deployment Steps

### 1. Configure wrangler.toml

Edit `wrangler.toml` with your app name:

```toml
name = "your-app-name"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
PUBLIC_SITE_URL = "https://your-app.hasanat.dev"
PUBLIC_APP_NAME = "Your App Name"

# Uncomment if using D1
# [[d1_databases]]
# binding = "DB"
# database_name = "your-app-db"
# database_id = "your-database-id"
```

### 2. Build and Deploy

```bash
npm run build
npx wrangler pages deploy dist/
```

### 3. Request Subdomain

After your app is deployed and working, request a subdomain from the platform dashboard at https://platform.hasanat.dev/dashboard (sign in with auth.hasanat.dev). Include:

- the name you want: lowercase letters, digits, and hyphens, one level only (`your-app.hasanat.dev`);
- where the app runs: a Cloudflare Pages project or Worker (and in which account), or another host;
- its current URL, for example `your-app.pages.dev`.

Never put secrets in the request. A maintainer connects the subdomain and replies in the request's note.

### 4. Set Up Custom Domain

If the Pages project is in your own Cloudflare account, add the domain to it first: in the Cloudflare dashboard go to **Workers & Pages** → your project → **Custom domains** → **Set up a domain**, and enter `your-app.hasanat.dev`. A maintainer then adds a CNAME record for `your-app` pointing to `your-app.pages.dev` in the hasanat.dev zone. If the project is in the Hasanat account, the maintainer adds the domain and Cloudflare creates the DNS record.

A Worker can only get a Custom Domain on hasanat.dev when it runs in the Cloudflare account that holds the hasanat.dev zone. Discuss this with the maintainer in your request.

## Environment Variables

Set these in the Cloudflare dashboard or in `[vars]`:

| Variable | Value |
|----------|-------|
| `PUBLIC_SITE_URL` | `https://your-app.hasanat.dev` |
| `PUBLIC_APP_NAME` | Your app's display name |

Shared sign-in needs no secrets. If your app needs a secret of its own, set it with `npx wrangler pages secret put NAME` (Pages) or `npx wrangler secret put NAME` (Workers). Never commit secrets or send them in a platform request.

## CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist/ --project-name=your-app-name
```

Store `CLOUDFLARE_API_TOKEN` as a GitHub Actions secret, never in the repository.

## Hosting Elsewhere

If you're not using Cloudflare:

1. Deploy your app to your preferred platform (Vercel, Netlify, VPS, etc.)
2. Add `your-app.hasanat.dev` as a custom domain in that platform
3. Request the subdomain from https://platform.hasanat.dev/dashboard with the host and your app's URL
4. A maintainer adds the DNS record your host asks for, usually a CNAME
5. Shared sign-in works when the app is served on `your-app.hasanat.dev`. There is no OAuth flow for apps outside `*.hasanat.dev`.

## Troubleshooting

- **Build fails**: Run `npm run check` to catch TypeScript errors
- **D1 not found**: Ensure database_id is correct in wrangler.toml
- **Auth not working**: Shared sign-in only works on `https://*.hasanat.dev` hosts. The session cookie is never sent to `localhost`, `*.pages.dev`, or `*.workers.dev`. Also check that `src/middleware.ts` covers the path.
- **404 on routes**: Ensure `output: "server"` in astro.config.mjs
