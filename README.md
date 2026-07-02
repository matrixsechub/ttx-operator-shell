# MSH OPS Storefront

Operator storefront SPA, served directly by a Cloudflare Worker (no Pages dependency).

Built clean from the [MSH OPS](https://www.mshops.net) spec — preserves the "Enter the System" /
cockpit / marketplace spirit of the legacy site, but with a clean architecture. The legacy
`MSHOPS` repo (Pages Functions, dual-distro routing) is reference-only and not reused.

## Stack

- **SPA**: React 19 + Vite + TypeScript + React Router + Tailwind CSS v4 (dark operator theme)
- **Serving**: Cloudflare Worker with [Static Assets](https://developers.cloudflare.com/workers/static-assets/)
  (`assets.directory: ./dist`, `not_found_handling: single-page-application`)
- **API**: Worker proxies `/api/*` to `ENGINE_API_URL` (harness/engine), preserving method,
  headers, and body

## Routes

| Path | Page |
|---|---|
| `/` | Enter the System (landing) |
| `/dashboard` | Operator cockpit |
| `/marketplace` | Marketplace catalog |
| `/status` | System / harness health |

Frontend calls `GET /api/marketplace/catalog`, `GET /api/system/status`, and (optionally)
`POST /api/auth/login` — all same-origin, proxied by the Worker. See `src/lib/apiClient.ts`
and `src/lib/types.ts`; the response shapes there are best-guess and should be aligned to the
real harness/engine API contract.

## Develop

```bash
npm install
npm run dev          # Vite dev server on :5173, proxies /api to ENGINE_API_URL for local dev
npm run worker:dev    # Build + run the actual Worker locally via `wrangler dev` (closest to prod)
```

## Build & typecheck

```bash
npm run build         # tsc -b && vite build -> dist/
npm run typecheck
```

## Deploy

```bash
npm run deploy         # builds, then `wrangler deploy`
```

This deploys `ttx-operator-shell` as defined in `wrangler.jsonc`. To point the production
`ENGINE_API_URL` at a different backend, edit `wrangler.jsonc` `vars.ENGINE_API_URL` (non-secret)
or use `wrangler secret put` for anything sensitive.

### Staging

`wrangler.jsonc` already defines an `env.staging` block, currently unused by any script. Deploy
there first as a manual pre-production check:

```bash
npm run build
wrangler deploy --env staging   # deploys ttx-operator-shell-staging
```

Smoke-test the staging URL, then promote with `npm run deploy` (no `--env` flag) once satisfied.
There is no automated staging pipeline yet — this is a manual step, not something CI triggers.

### CI

`.github/workflows/ci.yml` runs `npm run typecheck` and `npm run build` on push/PR. It will not
execute anywhere until this repo has git history and a GitHub remote — that's a manual setup step
(`git init`, initial commit, create + push to a GitHub repo), intentionally not done automatically.

### Auth setup

`/api/auth/login`, `/api/auth/me`, and `/api/auth/logout` are served by the Worker itself
(`worker/auth.ts`) — a single operator credential, stateless HS256 session tokens, no database.
Auth returns 503 until these three secrets are configured:

```bash
node scripts/hash-password.mjs "<your passphrase>"   # prints the OPERATOR_PASSWORD_HASH value

wrangler secret put OPERATOR_CALLSIGN        # your login callsign
wrangler secret put OPERATOR_PASSWORD_HASH   # paste the hash from the script
wrangler secret put AUTH_SIGNING_KEY         # any long random string (e.g. 32+ hex chars)
```

Add `--env staging` to each `secret put` for the staging Worker. For local `wrangler dev`, put
the same three values in `.dev.vars` (gitignored — see the committed example values' format in
this README's history, never commit the file itself).

`OPERATOR_ROLE` / `OPERATOR_ACCESS_LEVEL` in `wrangler.jsonc` are display-only labels rolled
into the session token; nothing enforces them (no RBAC, per `SCOPE-LOCK.md`).

### Rollback

See [ROLLBACK.md](./ROLLBACK.md).

**Not done by this scaffold (requires explicit, manual action):**
- No deploy has been run — `wrangler deploy` was never executed against the Cloudflare account.
- No custom domain / route has been attached to `www.mshops.net`.
- The legacy Cloudflare Pages project for `MSHOPS` has not been touched or removed.

Per the spec, this storefront should eventually be the only thing serving `www.mshops.net`
(zero Pages dependency). Attaching the domain and decommissioning the old Pages project are
infrastructure changes that touch live traffic — do them deliberately, not as part of a build
step.

## Project layout

```
src/
  components/   shared UI (OperatorShell nav/layout, StatusPill, telemetry panel, modal)
  pages/        Landing, Dashboard, Marketplace, Status, NotFound
  routes/       React Router route table
  lib/          apiClient, shared types, useApiResource hook
worker/
  index.ts      Worker entry: /api/* proxy, everything else -> ASSETS binding
```
