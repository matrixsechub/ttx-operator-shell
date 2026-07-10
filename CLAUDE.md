# CLAUDE.md — ttx-operator-shell

Operator storefront SPA served by a Cloudflare Worker. React 19 + Vite + TypeScript + Tailwind CSS v4 on the frontend; a single Cloudflare Worker handles all `/api/*` routes and serves four separate SPA shells from one `dist/` build.

---

## Scope lock — read first

`SCOPE-LOCK.md` is the authoritative constraint document. MatrixSecHub is **a frontend SPA with a marketplace, registries, a TTX module, and non-certifying governance metadata — nothing else.** Before adding any feature, verify it against that file.

**Retired (do not reintroduce):** autonomous agents, RAG/vector store, RBAC, SOC 2 / NIST compliance certification, multi-operator identity, AI orchestration, backend persistence beyond what already exists, Upwork consulting tiers, inject sequencing engine with AI facilitation, SKU/PDF delivery flows.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 (strict mode) |
| Language | TypeScript 5.7 — strict, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` |
| Build | Vite 6 + `@vitejs/plugin-react` |
| CSS | Tailwind CSS v4 via `@tailwindcss/vite` (no config file — uses CSS `@theme`) |
| Routing | React Router DOM v7 (browser router) |
| Worker | Cloudflare Worker, ESM, `compatibility_date: 2026-06-30` |
| Deploy | Wrangler v4 |
| CI | GitHub Actions — typecheck + build only, no deploy, no test runner |
| Package manager | npm (ESM project, `"type": "module"`) |

No test framework. No ESLint. No Prettier. No global state library (no Redux/Zustand/Jotai).

---

## Commands

```bash
npm run dev            # Vite dev server :5173, proxies /api to ENGINE_API_URL
npm run worker:dev     # build + wrangler dev (closest to production)
npm run build          # cf-typegen + tsc -b + vite build → dist/
npm run typecheck      # cf-typegen + tsc -b --noEmit
npm run deploy         # build + wrangler deploy (primary Worker)
npm run deploy:mshops-public    # node scripts/deploy-mshops-public.mjs
npm run deploy:mshops-operator  # node scripts/deploy-mshops-operator.mjs
wrangler deploy --env staging   # manual staging deploy (no script alias)
```

`npm run build` always runs `npm run cf-typegen` first (generates `worker-configuration.d.ts` from `wrangler.jsonc`). That file is gitignored — typecheck/build will fail without it.

---

## Directory structure

```
ttx-operator-shell/
├── src/
│   ├── entries/           Per-surface SPA entry points (4 files)
│   ├── routes/            Per-surface React Router configs
│   ├── components/        Shared UI components
│   ├── pages/             Page components + sub-pages
│   │   ├── dashboard/     Cockpit panel sub-pages
│   │   ├── divisions/     Division registry pages + data.ts
│   │   ├── marketplace/   Marketplace category pages + categories.ts
│   │   ├── ops/           Ops sub-pages (FedGrade, Security, Deploy)
│   │   └── systems/       System registry pages
│   ├── operator/          Operator system modules (12 systems + TTX)
│   │   └── ttx/           TTX SaaS scaffold UI + types + service + context
│   ├── future/            Future modules registry + pages
│   └── lib/               Auth, API client, hooks, services, types
├── worker/                Cloudflare Worker source
│   ├── index.ts           Entry: linear handler waterfall
│   ├── auth.ts            Auth endpoints (login/me/logout/refresh)
│   ├── edge/              Edge auth gate, beta block, rate limit
│   ├── surfaceRegistry.ts Maps URL paths to HTML shells
│   ├── surfaceSpa.ts      Validates + serves the correct SPA shell
│   ├── ttx.ts             TTX graph engine API
│   ├── scenarioGraph.ts   TTX branching scenario graph
│   ├── localScenarioRoutes.ts  /api/ttx/local-scenarios CRUD
│   ├── liveSession.ts     LiveTtxSession DO (WebSocket real-time TTX)
│   ├── backbone.ts        GovernanceDO, SessionDO, MarketplaceDO
│   ├── catalogData.ts     Static CATALOG_ITEMS array
│   └── (many route handlers)
├── scripts/               ~35 .mjs deploy + verification scripts
├── docs/                  Step-level reconciliation notes
├── wrangler.jsonc          Primary Worker config
├── wrangler.mshops-operator.jsonc
├── wrangler.mshops-public.jsonc
├── vite.config.ts
├── tsconfig.json          Composite root (references app/node/worker)
├── tsconfig.app.json      src/ — bundler module resolution, noEmit
├── tsconfig.worker.json   worker/ — @cloudflare/workers-types
└── tsconfig.node.json     vite.config.ts + scripts/
```

---

## Multi-surface SPA architecture

The build produces four separate SPA shells from four HTML entry points. One Worker serves all of them:

| Surface | HTML entry | Entry TS | Default route |
|---|---|---|---|
| Ecosystem | `ecosystem.html` | `src/entries/ecosystem-main.tsx` | `/` (public splash) |
| Cockpit | `cockpit.html` | `src/entries/cockpit-main.tsx` | `/dashboard` (auth required) |
| Auth | `auth.html` | `src/entries/auth-main.tsx` | `/login` |
| Council | `council.html` | `src/entries/council-main.tsx` | `/council` |

`worker/surfaceRegistry.ts` → `resolveHtmlSurface()` maps incoming URL paths to the correct shell. `worker/surfaceSpa.ts` validates the shell's marker strings before serving. Adding a new surface requires: a new HTML file, a new entry `.tsx`, a new router, a new surface entry in the registry, and a Vite `input` entry.

---

## Worker architecture

`worker/index.ts` is a linear waterfall — each handler returns `Response | null`. Null means "not my route, pass to next." Order matters:

```
rate limit → beta block → operator edge auth → HSX edge
→ marketplace edge (public) → edge auth gate
→ cockpit session enforcement → governance kernel
→ fedgrade → marketplace (protected) → HSX protected
→ catalog → engine → webhooks → security → live TTX
→ TTX → auth → governance backbone → marketplace backbone
→ telemetry → ghost → kernel → health
→ engine proxy (catch-all for /api/*)
→ storefront surface routing → ASSETS.fetch()
```

**Handler signature:** `(request: Request, pathname: string, env: Env) => Promise<Response | null>`

**Error shapes:** All worker route errors return `{ error: string }` JSON. Auth module returns 503 (not 500) when secrets are unconfigured. Engine proxy returns 502 on upstream failure.

**Agent debug logging:** `#region agent log` blocks in several worker files fire `fetch()` to `http://127.0.0.1:7654/ingest/...`. These are local development artifacts — ignore them, do not delete them.

---

## Authentication

Single operator credential, stateless HS256 JWT. No database, no multi-user.

- Access token: 12h TTL, stored in `localStorage` as `msh-operator-token`
- Refresh token: 30d TTL, single-use rotated on every refresh, stored as `msh-operator-refresh-token`
- Identity payload stored as `msh-operator-identity`
- Revoked JTIs go in KV `AUTH_REVOCATION`
- `src/lib/AuthContext.tsx` — rehydrates on mount, proactive refresh 60s before expiry, catches up on visibility change
- `src/lib/RequireAuth.tsx` — route guard; initializing state prevents flash redirect

**Secrets (never in `wrangler.jsonc`):**
```bash
node scripts/hash-password.mjs "<passphrase>"   # generates OPERATOR_PASSWORD_HASH
wrangler secret put OPERATOR_CALLSIGN
wrangler secret put OPERATOR_PASSWORD_HASH
wrangler secret put AUTH_SIGNING_KEY
```

For local `wrangler dev`, put these three in `.dev.vars` (gitignored). `OPERATOR_ROLE` and `OPERATOR_ACCESS_LEVEL` in `wrangler.jsonc` are display-only labels — no RBAC enforces them.

---

## API layer

All `/api/*` requests go same-origin to the Worker. The Worker either handles the route internally or proxies to `ENGINE_API_URL`.

**`src/lib/apiClient.ts`** — generic `request<T>()`:
- 10s timeout
- Up to 2 retries with exponential backoff
- No retry on 4xx
- Auto-attaches `Authorization: Bearer <token>` and operator role headers from localStorage
- Returns `ApiResult<T>` — discriminated union: `ApiSuccess<T> | ApiFailure`

**Service pattern:** one file per domain in `src/lib/`, exporting a plain object:
```ts
export const ttxSessionService = {
  list: (): Promise<ApiResult<TTXSession[]>> => request('/api/ttx/sessions'),
  // ...
}
```

**`useApiResource` hook** (`src/lib/useApiResource.ts`): generic data-fetching with optional polling (`pollIntervalMs`), loading state, `lastFetchedAt`. Use for any polling endpoint.

---

## State management

No global state library. Three mechanisms only:

1. **AuthContext** (`src/lib/AuthContext.tsx`) — auth state across the app
2. **ScenarioContext** (`src/operator/ttx/ScenarioContext.tsx`) — active TTX scenario selection within the TTX module
3. **Local `useState` + `useApiResource`** — everything else

---

## TypeScript conventions

- Three separate `tsconfig.*.json` files in a composite build: `app` (src/), `worker` (worker/), `node` (vite.config + scripts/)
- `verbatimModuleSyntax: true` — always use `import type` for type-only imports
- `moduleResolution: Bundler` for the app tsconfig; `Bundler` not available for worker config
- `worker-configuration.d.ts` is generated by `wrangler types` — never edit manually, run `npm run cf-typegen` to regenerate
- `noUnusedLocals` and `noUnusedParameters` are enabled — CI will fail on unused declarations

---

## CSS and design system

Dark "operator terminal" aesthetic. All design tokens live in `src/styles/index.css` under `@theme`:

```css
--color-op-bg: #05070a
--color-op-panel: #0a0d12
--color-op-border: #1a2a2a
--color-op-text: #c9f5e4
--color-op-accent: #39ffc7
```

Font: `"Share Tech Mono"` monospace throughout.

Utility classes (defined via `@utility` in `src/styles/index.css`):
- `.op-panel` — standard panel surface
- `.op-panel-raised` — elevated panel
- `.op-scrollbar` — styled scrollbar

Animations: `scan`, `pulse-glow`, `rise` (defined as `@keyframes`).

Body has a `linear-gradient` grid background. Never override this with a white or light background — the entire UI is dark-only.

---

## Registries (static data)

These are static arrays, not runtime-fetched. Edit the files directly; no migration or API call needed.

| Registry | File | Count |
|---|---|---|
| `OPERATOR_SYSTEMS` | `src/operator/registry.ts` | 12 systems |
| `MARKETPLACE_CATEGORIES` | `src/pages/marketplace/categories.ts` | 11 categories |
| `FUTURE_MODULES` | `src/future/registry.ts` | 7 modules |
| `DIVISIONS` | `src/pages/divisions/data.ts` | — |
| `CATALOG_ITEMS` | `worker/catalogData.ts` | — (worker-side) |

`src/lib/ecosystem.ts` is a cross-reference graph linking all four frontend registries. When adding entries to any registry, check whether `ecosystem.ts` needs a corresponding cross-reference.

---

## TTX system

Two distinct sub-systems exist side-by-side:

**1. SaaS scaffold UI** (`src/operator/ttx/`):
- Scenario CRUD, injects editor, timeline, roles, scoring rubric
- Uses `ttxLocalScenarioService` / `ttxSessionService` etc. in `src/lib/`
- `ScenarioContext` provides active scenario to sub-pages
- Proxies to engine API routes — currently `/api/ttx/sessions/*` and `/api/ttx/local-scenarios/*`

**2. Graph engine** (`worker/ttx.ts`, `worker/scenarioGraph.ts`, `worker/localScenarioRoutes.ts`):
- Branching scenario graph, session state in KV (`TTX_STATE`)
- Analytics, scoring, history, intelligence services

**3. Live sessions** (`worker/liveSession.ts`):
- `LiveTtxSession` Durable Object with WebSocket hibernation API
- Multi-participant real-time TTX: voting, chat, event log
- Client: `src/lib/liveSessionService.ts`

---

## Durable Objects and KV

**Durable Objects** (all use SQLite storage):
| Binding | Class | Purpose |
|---|---|---|
| `GOVERNANCE` | `GovernanceDO` | Governance metadata: northstar, mandates, proposals |
| `SESSION` | `SessionDO` | Operator sessions (max 10, 12h TTL, indexed by operator ID) |
| `MARKETPLACE` | `MarketplaceDO` | Module registry + entitlement validation |
| `LIVE_TTX_SESSIONS` | `LiveTtxSession` | Real-time TTX (Phase 36), WebSocket hibernation |

**KV namespaces:**
| Binding | Purpose |
|---|---|
| `AUTH_REVOCATION` | Refresh token JTI denylist |
| `WEBHOOK_EVENTS` | Webhook event log |
| `SECURITY_EVENTS` | Failed logins, invalid tokens |
| `TTX_STATE` | TTX session state, analytics, scoring, history |

All KV namespaces are shared between production and staging (deliberate simplification for a single-developer project).

---

## Multiple wrangler configs

Three deployment targets, each with a separate config:

| Config | Worker name | Surface mode |
|---|---|---|
| `wrangler.jsonc` | `ttx-operator-shell` | default (storefront) |
| `wrangler.mshops-operator.jsonc` | `mshops-operator` | `MSHOPS_SURFACE=operator` |
| `wrangler.mshops-public.jsonc` | `mshops-public` | `MSHOPS_SURFACE=public` |

`MSHOPS_SURFACE` env var switches the Worker's route behavior. Deploy scripts for MSHOPS surfaces are in `scripts/`.

---

## Version management

`APP_VERSION` in `wrangler.jsonc` `vars` must be manually kept in sync with `package.json` `"version"`. No build step does this automatically. Bump both when releasing.

---

## File naming conventions

- React components: `PascalCase.tsx`
- Services, utilities, hooks: `camelCase.ts`
- No barrel `index.ts` files in `src/components/` or `src/pages/` — import by explicit path
- Scripts in `scripts/` are `.mjs` (Node ESM)

---

## Vite dev proxy

`vite.config.ts` proxies `/api` to `VITE_DEV_API_PROXY_TARGET` (defaults to `https://msh-ops-os-harness.sogellagepul.workers.dev`). For local Worker development use `npm run worker:dev` instead.

---

## CI

`.github/workflows/ci.yml` runs on every push and PR:
1. `npm ci`
2. `npm run typecheck` (includes `cf-typegen`)
3. `npm run build`

No deploy step, no test step. Deployment is always manual.

---

## Staging

```bash
npm run build
wrangler deploy --env staging
```

`wrangler.jsonc` `env.staging` deploys `ttx-operator-shell-staging`. Staging secrets must be set separately with `wrangler secret put ... --env staging`. There is no automated promotion — manual smoke-test then run `npm run deploy`.

---

## Rollback

See `ROLLBACK.md`. Short version: `wrangler rollback` or `wrangler versions rollback`.

---

## What AI assistants should NOT do

- Do not introduce RBAC, agent orchestration, RAG, vector stores, or AI facilitation — see `SCOPE-LOCK.md`
- Do not add a testing framework without explicit instruction — there is none by design currently
- Do not add ESLint or Prettier configuration without explicit instruction
- Do not add barrel `index.ts` files — imports are explicit by path throughout
- Do not add comments explaining what code does — only add comments for non-obvious WHY (hidden constraint, workaround, subtle invariant)
- Do not add `OPERATOR_CALLSIGN`, `OPERATOR_PASSWORD_HASH`, or `AUTH_SIGNING_KEY` to `wrangler.jsonc` — these are secrets managed via `wrangler secret put`
- Do not edit `worker-configuration.d.ts` — it is generated; run `npm run cf-typegen` instead
- Do not use a light/white theme — the design system is dark-only
- Do not add global state libraries — use AuthContext, ScenarioContext, or local state
