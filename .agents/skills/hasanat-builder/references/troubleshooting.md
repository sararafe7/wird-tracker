# Troubleshooting

## Clone fails

Confirm the public repository is reachable:

```sh
git ls-remote https://github.com/hasanat-dev/starter.git HEAD
```

If GitHub is temporarily unavailable, do not substitute an untrusted mirror. Open `https://github.com/hasanat-dev/starter`, download the repository archive, extract it into a new empty folder, and continue with `npm install`.

## Folder already exists

Do not overwrite or delete it. Choose a new folder name, or inspect the existing folder and ask whether to continue there.

## Node.js is too old

The starter requires Node.js 20 or newer. Prefer the user's existing version manager. Explain the required version and let the user approve any installation or switch.

## Install fails

Keep `package-lock.json` authoritative and run:

```sh
npm install
```

Do not switch package managers or delete the lockfile as a first response. Read the first actionable npm error, verify Node.js, and retry only after addressing it.

## Environment file is missing

Verify the clone is complete and that `.env.example` exists. Never invent production secrets. For the initial public page, leave optional values blank where the starter permits it.

## Local server uses another port

Astro prints the actual local URL. Open that URL. Do not terminate an unrelated process just to reclaim port 4321.

## Page is blank or errors

Check the terminal and browser console, then run:

```sh
npm run check
npm run build
```

Fix the first root error before adding features. Confirm `.env` exists and was not populated with placeholder values that the app treats as real credentials.

## `npm run check` reports `Cannot find name 'D1Result'`

This is a known issue in the current starter, not in the user's code. Add this line to `src/env.d.ts`, next to the existing `D1Database` type:

```ts
type D1Result = import("@cloudflare/workers-types").D1Result;
```

## `npm run lint` fails with Biome configuration errors

The starter's `biome.json` uses Biome 1 keys, while the starter installs Biome 2. `npx biome migrate --write` updates the configuration, but some rules still report false positives for Astro files and Tailwind CSS. Do not block the first milestone on lint; rely on `npm run check` and `npm run build`, and mention the issue to the user.

## Auth does not work locally

Authentication is not required for the five-minute first page, and shared sign-in does not work on `localhost`. The session cookie is scoped to `.hasanat.dev`, so browsers never send it to a local server. In development, the starter's auth helpers point to `http://localhost:8788`, a local copy of the auth service that most builders do not run. Keep `Astro.locals.user` null locally, finish the public experience first, then read the `hasanat-auth` skill and test sign-in on a deployed `*.hasanat.dev` subdomain.

## D1 is unavailable

Use static or in-memory sample data for the first page when the database is not the core experience. Before creating D1 resources or applying migrations, read the `hasanat-d1` skill and obtain approval.
