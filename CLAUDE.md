# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

MatrixSecHub (MSHOPS) operator storefront — a React SPA served directly by a Cloudflare Worker
(no Pages dependency), with a growing set of real, Worker-native backend features plus a large
UI scaffold for features that don't have a backend yet.

**Read `SCOPE-LOCK.md` before trusting any of the `PHASE*.md` / `*-REPORT*.md` / `*-REVIEW*.md`
files at the repo root.** Those are point-in-time planning artifacts from earlier phases; several
describe a fictional AI-agent/RBAC/compliance platform that was explicitly retired. `SCOPE-LOCK.md`
is the enforcement reference for what's real. When in doubt, trust the code over any prose
document, and trust `SCOPE-LOCK.md` over any other prose document.

**This project is built almost entirely by an AI agent working in successive "Phase N" commits**
(see `git log`). Comments throughout the code cite phase numbers and explain *why* a decision was
made, often including what was explicitly rejected and why (e.g. "not D1, because..."). Read
those comments before re-deriving a decision that's already been made — and continue the pattern
in new code.

## Stack

- React 19 + React Router 7 + TypeScript (strict) + Tailwind CSS v4 (dark "operator" theme)
- Vite 6 for the SPA build
- Cloudflare Worker (`worker/index.ts`) serves the built SPA via Static Assets and handles
  `/api/*` itself where a route is implemented, otherwise proxies to `ENGINE_API_URL`
- Cloudflare KV for all real persistence (no database — see "Persistence" below)
- No test framework is configured. Verification is `npm run typecheck` + `npm run build` (also
  what CI runs)

## Repo layout

```
src/
  components/       Shared UI: OperatorShell (nav/layout), StatusPill, panels, modals, cards
  pages/            Route-level pages (Landing, Dashboard, Marketplace, Status, About, ...)
  pages/dashboard/  Dashboard widgets/panels (mission board, telemetry, TTX status, etc.)
  pages/divisions/  Division registry (`data.ts`) + index/detail pages
  pages/marketplace/ Marketplace category registry (`categories.ts`) + index/detail pages
  pages/systems/    Operator-systems index/detail pages (wraps `operator/registry.ts`)
  operator/         One folder per "operator system" (recon, hunter, vault, terminal, ...),
                     wired into `operator/registry.ts`. Mostly presentational scaffolds.
  operator/ttx/     The "TTX SaaS" UI scaffold — see "Two TTX systems" below.
  future/           `registry.ts` of explicitly-not-built future modules + a generic detail page
  lib/              apiClient, auth, types, ecosystem cross-ref graph, TTX session/scoring
                     services, telemetry/security/webhook client services
  routes/router.tsx Single React Router route table — this is the source of truth for routes
  styles/index.css  Tailwind v4 `@theme` tokens (op-bg, op-accent, op-panel, ...) + keyframes
worker/
  index.ts          Entry point: prefix dispatch over /api/*, rate limiting, ASSETS fallback
  auth.ts           /api/auth/* — real, stateless HS256 session tokens, single operator credential
  engine.ts         /api/engine/* — self health/version (no upstream call)
  security.ts       /api/security/* — security signal recording/read
  webhookTrigger.ts /api/webhooks/* — webhook trigger persistence
  ttx.ts            /api/ttx/sessions/{scenarios,start,next,reset,state} — real session engine
  scenarioManifest.ts  Builtin scenario definitions + shared validation for authored scenarios
  scenarioGraph.ts     Node/transition graph traversal logic for a session
  localScenarioRoutes.ts /api/ttx/local-scenarios/* — operator-authored scenario CRUD, export/import
  ttxAnalytics.ts   Per-session append-only analytics packet (KV)
  ttxScoring.ts     /api/ttx/sessions/score — post-session scoring against scenario metadata
  ttxHistory.ts     /api/ttx/sessions/history — derived from the same score packets
  ttxIntelligence.ts /api/ttx/sessions/intelligence — trend/insight synthesis over history
  catalogData.ts    Static marketplace catalog data served by /api/marketplace/catalog
scripts/hash-password.mjs   Produces OPERATOR_PASSWORD_HASH for `wrangler secret put`
```

Everything under `/api/*` in `worker/index.ts` that isn't explicitly claimed by one of the
handlers above falls through to `proxyToEngine()`, which forwards to `ENGINE_API_URL` unchanged.
This is deliberate graceful degradation, not a bug — a lot of the frontend (e.g. the TTX SaaS
scaffold, marketplace purchase flows) calls endpoints that don't exist on any real Engine yet, and
is written to handle the resulting error responses cleanly rather than assume success.

## Two TTX systems — do not conflate them

There are **two independent, differently-real TTX (tabletop exercise) subsystems**. Mixing them up
is the most likely mistake when touching this code:

1. **`src/operator/ttx/` — "TTX SaaS" scaffold.** Scenario builder, injects, timeline, roles,
   score tabs at `/ttx/*`. Calls `/api/ttx/scenarios`, `/api/ttx/roles`, `/api/ttx/sessions/:id/score`
   via `src/operator/ttx/service.ts`. **None of these routes exist on any real backend** — every
   call proxies through to `ENGINE_API_URL` and surfaces a real (graceful) error. This is UI-only,
   local-state-only (see `ScenarioContext.tsx`), and intentionally left alone by every later phase
   so its reserved paths keep working (or gracefully failing) exactly as before.

2. **The scenario graph engine — real, KV-backed, Worker-native.** `worker/ttx.ts` +
   `worker/scenarioManifest.ts` + `worker/scenarioGraph.ts` + `worker/localScenarioRoutes.ts` +
   `worker/ttxAnalytics.ts` + `worker/ttxScoring.ts` + `worker/ttxHistory.ts` +
   `worker/ttxIntelligence.ts` on the backend; `src/lib/ttxTypes.ts` +
   `src/lib/ttxSessionService.ts` + `src/lib/ttxScoringService.ts` + `src/lib/ttxHistoryService.ts`
   + `src/lib/ttxIntelligenceService.ts` + `src/lib/ttxLocalScenarioService.ts` on the frontend,
   surfaced mainly via `src/pages/dashboard/TTXStatusPanel.tsx`,
   `src/components/TTXPanel.tsx`/`TTXScorePanel.tsx`, and `ScenarioAuthoringPanel.tsx`. This one
   claims a narrow, exact set of sub-paths under `/api/ttx/sessions/*`,
   `/api/ttx/local-scenarios*`, and a couple of other exact paths — see the routing comment at the
   top of `worker/ttx.ts` for the full, current list. It never claims `/api/ttx/scenarios`,
   `/api/ttx/roles`, or `/api/ttx/sessions/:id/score` — those stay reserved for system 1.

Before adding a new `/api/ttx/...` route, read the header comment in `worker/ttx.ts` — it
enumerates exactly which sub-paths are claimed by which system and why, and that enumeration is
kept up to date phase over phase.

## Persistence: KV only, no database

Every piece of real server-side state (auth revocation, webhook events, security signals, TTX
session/analytics/score/authored-scenario data) lives in one of four Cloudflare KV namespaces
declared in `wrangler.jsonc`: `AUTH_REVOCATION`, `WEBHOOK_EVENTS`, `SECURITY_EVENTS`, `TTX_STATE`.
These are real namespaces (not stubs), deliberately shared across local/staging/production rather
than provisioned per-environment. Adding D1 or another database has been considered and rejected
multiple times (see comments in `worker/ttx.ts`, `worker/localScenarioRoutes.ts`) — the workload
shape (one KV key per record, TTL expiry, capped-length retention lists, no joins) doesn't need it.
Don't introduce a new storage system without a workload that actually needs one.

## Auth

Real but intentionally minimal: a single hardcoded operator credential, stateless HS256 session
tokens (`worker/auth.ts`, `src/lib/jwt.ts`), refresh tokens with KV-backed revocation
(`AUTH_REVOCATION`). `OPERATOR_ROLE` / `OPERATOR_ACCESS_LEVEL` (in `wrangler.jsonc`) are
**display-only labels** baked into the token — nothing enforces them anywhere, by design (see
`SCOPE-LOCK.md`: no RBAC, no multi-operator identity model). Don't add permission checks based on
these fields; that would be scope drift.

**Reaffirmed 2026-07-04 (see `SCOPE-LOCK.md` Amendments):** keep `OPERATOR_ROLE` /
`OPERATOR_ACCESS_LEVEL` display-only. Do not reverse this into RBAC enforcement, even
incrementally (e.g. gating a single panel or filtering one list server-side by role) — that is
scope drift and requires an explicit `SCOPE-LOCK.md` amendment before any code, not after.

Auth returns 503 until three secrets are set — see README.md's "Auth setup" section
(`wrangler secret put OPERATOR_CALLSIGN / OPERATOR_PASSWORD_HASH / AUTH_SIGNING_KEY`, or
`.dev.vars` locally, gitignored).

`src/lib/AuthContext.tsx` handles proactive token refresh (fires before expiry, not on failure),
single-flight refresh guarding, and visibility-change catch-up for throttled background tabs —
read it before changing session lifecycle behavior, the ordering is load-bearing.

## Frontend conventions

- **Registries, not hardcoded lists.** `DIVISIONS` (`src/pages/divisions/data.ts`),
  `OPERATOR_SYSTEMS` (`src/operator/registry.ts`), `MARKETPLACE_CATEGORIES`
  (`src/pages/marketplace/categories.ts`), `FUTURE_MODULES` (`src/future/registry.ts`) are each a
  single source of truth for one entity type. `src/lib/ecosystem.ts` is a pure cross-reference
  graph on top of them (divisions ↔ systems ↔ marketplace categories ↔ future modules ↔ dashboard
  widgets) — it only links slugs that already exist in their source registry; it never introduces
  new entities. Adding a new division/system/category/future-module means adding one entry to its
  registry, then optionally wiring cross-links into `ecosystem.ts`.
- **Tone system.** Four tones (`accent`, `accent-2`, `magenta`, `amber`) map to Tailwind classes
  in `src/lib/tone.ts`, driving consistent color-by-division/category styling instead of ad hoc
  color choices.
- **`src/lib/apiClient.ts`** is the only place that calls `fetch` for API requests. It attaches
  the bearer token + role/access-level headers, retries timeouts/network errors/5xx (never 4xx)
  with capped exponential backoff, and returns a discriminated `ApiResult<T>`
  (`{ ok: true, data }` / `{ ok: false, error }`) — never throws. New API calls should go through
  `request()` or be added to the `api` object here, following the same pattern as
  `src/lib/ttxSessionService.ts` / `webhookTriggerService.ts` / `securityService.ts`.
- **No router library in the Worker.** `worker/index.ts` dispatches purely on string prefixes.
  Sub-resource IDs are passed via query string or request body (e.g. `?sessionId=`), never via a
  path segment — follow this pattern rather than introducing `:id`-style routing.
- Comment style throughout: explain **why**, cite the phase number when relevant, and note what
  alternative was rejected and why. Avoid comments that just restate the code.

## Development

```bash
npm install
npm run dev            # Vite dev server on :5173, proxies /api to ENGINE_API_URL
npm run worker:dev      # Build + `wrangler dev` — closest to production behavior
npm run typecheck       # cf-typegen + tsc -b --noEmit (also what CI runs)
npm run build           # cf-typegen + tsc -b + vite build -> dist/
npm run deploy          # build + `wrangler deploy`
```

`npm run cf-typegen` (`wrangler types`) generates `worker-configuration.d.ts` (the `Env` type)
from `wrangler.jsonc` — it's gitignored and regenerated by `build`/`typecheck`/`worker:dev`. Never
hand-edit or hand-write the `Env` shape.

There is no linter or test suite configured — `typecheck` + `build` are the full verification gate,
both locally and in `.github/workflows/ci.yml` (Node 24, `npm ci`).

Staging: `wrangler.jsonc` has an `env.staging` block (deploy with
`wrangler deploy --env staging`), not wired into any script or CI job — a deliberate manual
pre-production step, see README.md.

Rollback: this repo relies entirely on `wrangler deployments list` / `wrangler rollback` — no
custom checkpoint system. See `ROLLBACK.md` before building anything homegrown here.

## Before committing

- `npm run typecheck && npm run build` must pass clean (strict TypeScript: `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch` are all on).
- If you touch `wrangler.jsonc` bindings/vars, keep `README.md`'s auth-setup / env-var docs and
  any relevant `worker/*.ts` header comments in sync.
- If you add or change an `/api/*` route, update the routing-ownership comment in the relevant
  `worker/*.ts` file (especially `worker/ttx.ts`) so the next person (human or AI) doesn't have to
  re-derive which paths are claimed by which subsystem.
