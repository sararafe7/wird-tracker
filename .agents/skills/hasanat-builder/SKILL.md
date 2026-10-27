---
name: hasanat-builder
description: "Turn a charitable or community-serving idea into a small working Hasanat web app. Use when someone asks to build on Hasanat, work on a Hasanat spec or project, clone the Hasanat starter, shape an idea into a first release, run it locally, add shared auth or Cloudflare D1, prepare Arabic/English RTL support, or request shared services and a project listing through platform.hasanat.dev."
---

# Hasanat Builder

Get the user from an idea to a visible local page before expanding scope. Keep the first run independent of cloud credentials, D1, OAuth, GitHub authentication, or deployment.

For a new project, begin by asking the user what they want to build. Do not require them to prepare a brief or customize a prompt first. Ask at most two short follow-up questions to identify the audience, problem, and first useful action, then continue with the workflow below.

The builder documentation lives at `https://platform.hasanat.dev/` (Arabic first). A plain-text copy for agents is at `https://platform.hasanat.dev/llms-full.txt`.

## How Hasanat works

Hasanat turns community needs into small volunteer-built projects. Work moves through three stages:

**Idea** → picked at the monthly meeting → **Spec** → someone becomes its lead → **Project** (Building → Live)

- Ideas are proposed and upvoted on `https://hasanat.dev`. They only collect needs and votes.
- A spec is a one-page `brief.md` and a detailed `spec.md` in the private repository `https://github.com/hasanat-dev/projects`. Anyone can draft one with the repository's template, as a pull request; the monthly meeting approves a few.
- A signed-in member presses «سأقود هذا المشروع» ("I'll lead this") on a spec awaiting a lead («بانتظار قائد»). A moderator confirms the lead, and the spec becomes a project.
- A confirmed lead has 4 weeks to add a start link (the team's group or the repository). Without it, the spec returns to «بانتظار قائد» ("awaiting a lead").
- Volunteers press «أستطيع المساعدة» ("I can help") on an open role on hasanat.dev. The request goes to the project's lead, who accepts or declines it in «لوحتي» ("my dashboard") at `https://platform.hasanat.dev/dashboard`, where leads also run their project: roles, team, start link and stage.
- A project becomes Live when its lead says the pilot ran with real users. Feature requests for a live project go to its own GitHub issues.
- Team and builder chat is on WhatsApp. Each team has its own group, and the whole community meets in the Hasanat community group: https://chat.whatsapp.com/DaNBXW3W2lbC8nXqQLcZYB. There is no forum.

## Operating principles

- Build for a clear public benefit. Ask what changes for the user, not only what features exist.
- Treat Arabic and English as first-class. Use logical CSS properties and test RTL when either language is in scope.
- Make the first release narrow enough to run locally in one session.
- Never request, print, or write secrets in chat. Ask the user to enter secrets directly in their terminal or local environment file.
- Do not overwrite an existing directory, discard local changes, initialize cloud resources, or deploy without confirmation.
- Use the repository's package manager from its lockfile. The official starter currently uses npm and `package-lock.json`.
- Verify each milestone with an executable check or browser view before moving on.
- Never generate, paraphrase, or complete Quran, hadith, or religious rulings. Use the verified source named in the spec or in the platform's resource bank.

## Choose the path

- **Hasanat spec or project:** read the project's `brief.md`, then its `spec.md`; the spec is the source of truth. Build only section 5 ("النسخة الأولى"), treat section 6 ("نؤجّله لمراحل لاحقة") as out of scope, and ask the user about any item under section 11 ("أسئلة مفتوحة") instead of inventing an answer. Existing projects keep their stack and their own `AGENTS.md`.
- **Leading a spec:** the user signs in on hasanat.dev and presses «سأقود هذا المشروع» on the spec. After a moderator confirms, remind them of the 4-week deadline for the start link.
- **Joining a project:** the user presses «أستطيع المساعدة» on an open role on the project's hasanat.dev page. When the lead accepts, the start link arrives. Coordinate in the team's group and the project's GitHub repository.
- **New app:** follow the five-minute local start below.
- **Existing app:** inspect it, run its own checks, and preserve its framework. Add Hasanat integration only where useful. To list it on hasanat.dev as a project, request a listing from `https://platform.hasanat.dev/dashboard`.
- **Idea only:** propose it on hasanat.dev. To turn an idea into a spec, draft `brief.md` and `spec.md` from the template and open a pull request to the projects repository.
- **No-code or design contribution:** shape the brief, prototype the core flow, and use the platform docs instead of forcing a code workflow.

## Five-minute local start

### 1. Confirm the local target

Ask at most these two questions, and only when the answers are not already known:

- What problem should the first page solve, and for whom?
- What should someone be able to see or do in the first local version?

Turn the answer into one sentence:

> The first version helps **[audience]** do **[one action]** so they can **[benefit]**.

Defer accounts, dashboards, payments, admin tools, and production data unless one is the core action.

### 2. Check prerequisites

Resolve and run the bundled [environment check](./scripts/check-environment.sh) from this skill's installed directory:

```sh
sh <skill-directory>/scripts/check-environment.sh
```

If running before the skill has been installed into a workspace, check `git`, Node.js 20 or newer, and npm directly. Do not install system software without permission. See [troubleshooting](./references/troubleshooting.md) when a prerequisite or port is unavailable.

### 3. Create the project safely

Choose a short kebab-case folder name derived from the idea. Confirm it does not already exist, then run:

```sh
git clone --depth 1 https://github.com/hasanat-dev/starter.git <project-name>
cd <project-name>
npm install
cp .env.example .env
```

The HTTPS clone is public and does not require a GitHub account. If cloning fails, stop and use the fallback in [troubleshooting](./references/troubleshooting.md). Never delete an existing folder to make the command succeed.

### 4. Start before redesigning

Run the starter unchanged first:

```sh
npm run dev
```

Open the URL printed by the server, normally `http://localhost:4321`. Verify that the page renders and check the browser console. If port 4321 is occupied, use the URL Astro selects rather than killing an unrelated process.

Do not continue until the user can see a working page locally.

### 5. Shape the first useful version

Inspect `AGENTS.md`, `README.md`, the page routes, and the existing design tokens. Implement only the agreed first outcome. Preserve the starter's established Astro, TypeScript, Tailwind, i18n, accessibility, and Cloudflare patterns.

Before editing, state one local hypothesis and one cheap check. After the first edit, run the narrowest relevant validation. Finish with:

```sh
npm run check
npm run build
```

Use browser verification at desktop and mobile sizes for user-facing changes. Confirm Arabic layout does not merely reverse English; reading order, alignment, and controls must remain coherent in RTL. Check a 360px width and 200% text size.

## Add platform capabilities only when needed

Use the companion skills from the verified pack. The copies in the starter's `.github/skills/` folder are older; in particular, its auth skill describes an OAuth flow that does not exist.

- **Shared authentication:** read the `hasanat-auth` skill before changing auth code. Shared sign-in only works for sites served on `*.hasanat.dev`; local public pages must still run without it.
- **Cloudflare D1:** read the `hasanat-d1` skill. Ask before creating or migrating a database. Keep schema changes versioned.
- **Hasanat design:** read the `hasanat-design` skill. Use real product content and assets; do not add emoji to the UI.
- **Deployment:** read the `hasanat-deploy` skill. Require a successful local build and explicit deployment approval.

## Request shared services

Shared services are requested from the platform dashboard at `https://platform.hasanat.dev/dashboard` after signing in with auth.hasanat.dev:

- a subdomain such as `name.hasanat.dev`;
- sign-in support for an app that is not served on `*.hasanat.dev`;
- a Cloudflare D1 database;
- listing an existing project on hasanat.dev;
- anything else.

Maintainers handle each request by hand from a written runbook. The user sees its status (new, in progress, done, or declined) and the maintainer's note in the dashboard. Never put passwords, API keys, tokens, or other secrets in a request; whoever needs a secret sets it directly in Cloudflare or GitHub.

## Prepare for launch

Before the project is called Live or listed anywhere, verify:

- The page explains its benefit through the working experience, not marketing filler.
- There is a real lead associated with the project.
- Arabic and English content, metadata, mobile layout, loading, empty, and error states are coherent.
- No secrets, personal data, generated build output, or local environment files are committed.
- `npm run check` and `npm run build` pass.
- The repository and live URL, if any, are accurate.
- A short privacy notice is reachable from the app, as described in the starter's `DATA_POLICY.md`.

To appear on `https://apps.hasanat.dev`, request a listing from the dashboard (choose the "other" request type). Curators review every listing before it is published; nothing is listed automatically.

## Operate the project

1. Keep one accountable lead and a concrete brief. Propose spec changes as a pull request to the projects repository so the lead can review them.
2. Open the roles the project needs on its hasanat.dev page, answer «أستطيع المساعدة» requests promptly, and close roles once they are filled.
3. Keep tasks, bugs, and feature requests in the project's GitHub issues.
4. Run a pilot with real users before calling the project Live. The lead then moves the project to Live and sets its product link.
5. The previous Hasanat feedback widget is paused. Collect pilot feedback through the team's own channels until it returns as a shared service.

## Completion report

End with four concise facts:

1. Local URL and what is working.
2. Files or features changed.
3. Checks that passed.
4. The single next highest-value step.
