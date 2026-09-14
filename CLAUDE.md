# CLAUDE.md — MSH OPS Operator Shell

Read this first. It records the repo as it exists. Pair with `AGENTS.md` (doctrine) and
`SCOPE-LOCK.md` (scope). Where this file and the code disagree, the code wins; fix this file.

## Governance posture (non-negotiable)

- **Beacon is the governance authority**: `msh-ops/beacon/northstar.json` (v1), `northstar-v2.json`, signed releases in `msh-ops/beacon/releases/`, integrity via `beaconHash.ts` / `beaconIntegrity.ts`.
- **The Operator is the sole approval authority.** Agents and assistants are advisory until granted an explicit mission.
- **Bounded autonomy, fail-closed.** On ambiguity, missing approval, or integrity doubt: `HOLD` / `SAFE_MODE`, escalate to Operator. Autonomy checks live in `msh-ops/governance/checkAutonomy.ts`; refactor approval in `approveRefactor.ts`.
- **Do not**, without an explicit Operator mission: mutate git remotes, secrets, production, Beacon files, `wrangler*.jsonc` env blocks, or KV/DO binding IDs. Never print secret values. Never undraft, merge, or deploy.
- **Claims require evidence** (paths, commands, hashes). Otherwise label `UNVERIFIED`.
- **End substantive turns with a handoff packet** per `.cursor/rules/20-packet-contract.mdc`.
- Preserve unrelated and dirty-tree changes.

## Stack

React 19 + Vite + TypeScript (strict) + React Router + Tailwind v4. Cloudflare Worker (`worker/index.ts`) serves API routes, auth, TTX engine, and surface routing over a static assets binding (`ASSETS`, `run_worker_first: true`). Production: `https://ttx-operator-shell.sogellagepul.workers.dev`.

## Commands

| Purpose | Command |
|---|---|
| Install | `npm ci` |
| Dev (Vite :5173) | `npm run dev` |
| Worker dev | `npm run worker:dev` |
| Typecheck | `npm run typecheck` (`scripts/typecheck.mjs`) |
| Build | `npm run build` (`scripts/build.mjs`, assembles operator/public/storefront dists) |
| Full tests | `npm test` (explicit file list in `package.json`, `node --test` via `tsx`) |
| Subset tests | `npm run test:flywheel`, `test:beacon`, `test:operator-auth` |
| Wrangler dry run | `npm run cf:preview-validate` / `cf:preview-validate:staging` |
| Deploy (Operator only) | `npm run deploy`, `deploy:staging`, `deploy:mshops-public`, `deploy:mshops-operator` |
| Staging checks | `npm run verify:staging-config`, `test:staging-smoke`, `verify:step5` |
| Brand lint | `npm run lint:brand` |
| Organizer agent | `npm run organizer`, `organizer:scheduled` |

Fresh clones have no `node_modules`; run `npm ci` before tests.

## Surfaces (from README)

| Surface | Shell | Routes |
|---|---|---|
| Ecosystem | `ecosystem-shell.html` | `/` |
| Cockpit | `operator-shell.html` | `/dashboard`, `/ttx`, `/systems`, `/ops`, `/status` |
| Auth | `auth-shell.html` | `/login` |
| Council | `council-shell.html` | `/council` |
| Storefront | `app/index.html` | `/marketplace`, `/storefront` |

Root HTML entries: `index.html`, `cockpit.html`, `auth.html`, `council.html`, `ecosystem.html`, `storefront.html`. Static public pages in `public/`. Routing logic: `worker/surface.ts`, `surfaceRegistry.ts`, `surfaceSpa.ts`, `publicPaths.ts`.

## Repository layout

```
worker/          Cloudflare Worker (entry: index.ts)
  beacon/ do/ edge/ flywheel/ governance/ data/   subsystem folders
src/             React app: components/, operator/, pearl/, pages/, routes/, entries/, lib/, future/
shared/flywheel/ contracts, events, stages shared by worker and UI
msh-ops/         governance tooling: beacon/, governance/, agent/, agents/ (Organizer), mcp/
tests/           node:test suites (see below)
scripts/         build, deploy, verify-*, probe-*; scripts/ci/ = CI lint and smoke tools
docs/            runbooks, evidence/, flywheel/, planning artifacts
pages-bind/      Cloudflare Pages binding (functions/, static/, own wrangler.jsonc)
data/            static agent datasets (*.js)
.cursor/         agent prompts (arch-01, sec-01, qa-01) and always-on rules
.github/         ci.yml, security-pr.yml, staging-deploy.yml, deploy-production.yml, organizer-schedule.yml
```

## Worker module map (`worker/`)

- **Entry and routing:** `index.ts`, `surface.ts`, `surfaceRegistry.ts`, `surfaceSpa.ts`, `publicPaths.ts`, `splash.ts`, `storefront.ts`, `canonical.ts`, `mode.ts`, `env.ts`
- **Auth and sessions:** `auth.ts`, `apiAuth.ts`, `passwordHash.ts` (PBKDF2), `sessionBridge.ts`, `operator.ts`, `security.ts`
- **Governance and Beacon:** `governance/`, `governanceAutomation.ts`, `governanceDefaults.ts`, `northstarBeaconRoutes.ts`, `beacon/`, `policyResponse.ts`, `kernel.ts`
- **TTX:** `ttx.ts`, `ttxScoring.ts`, `ttxAnalytics.ts`, `ttxHistory.ts`, `ttxIntelligence.ts`, `liveSession.ts`, `liveTtxProtocol.ts`, `liveTtxRoute.ts`, `localScenarioRoutes.ts`, `scenarioGraph.ts`, `scenarioManifest.ts`
- **Marketplace and billing:** `marketplaceEdge.ts`, `marketplaceIntentRouter.ts`, `marketplaceBillingWorker.ts`, `entitlementsWorker.ts`, `tierWorker.ts`, `catalogData.ts`, `fulfillmentAgentRoutes.ts`, `recommendationEngine.ts`, `qualificationRuntime.ts`
- **Flow and behavior intelligence:** `flow*.ts`, `behaviorIntelligence.ts`, `behaviorRoute.ts`, `experimentation*.ts`, `funnelRecovery.ts`, `adaptation.ts`, `wildcardAdvancement.ts`, `trafficActivation.ts`, `trafficSources.ts`, `usage.ts`, `usageModeMetrics.ts`
- **Ops and telemetry:** `health.ts`, `telemetry.ts`, `auditLite.ts`, `webhookTrigger.ts`, `operatorNotifications.ts`, `buildInfo.ts`, `bundledBuildInfo.ts`, `backbone.ts`, `backboneEnv.ts`, `edge/`, `hsxEdge.ts`, `fedgrade.ts`, `ghost.ts`, `blueprintGenerator.ts`, `engine.ts`
- **Flywheel:** `flywheel/`, `do/` (Durable Objects)

## Cloudflare bindings (`wrangler.jsonc`)

- KV: `AUTH_REVOCATION`, `WEBHOOK_EVENTS`, `SECURITY_EVENTS`, `TTX_STATE`
- Durable Objects: `GOVERNANCE`, `SESSION`, `MARKETPLACE`, `LIVE_TTX_SESSIONS`, `RECEIPT_AUTHORITY`, `FLYWHEEL`
- Service binding: `HARNESS` → `msh-ops-os-harness`
- `env.staging` has its own name, vars, and KV IDs. Observability is enabled.
- Do not edit binding IDs. Do not add secrets to `vars`.

## Tests (`tests/`)

- Runner: `node --import tsx --test` over an explicit file list in the `test` script. A new test file is **not** run until added to that list.
- Root suites: auth (`apiAuth`, `operatorAuth`, `cockpitSessionBoundary`), TTX (`ttxSession`), billing/entitlements, agents, routing (`surfaceRegistry`, `statusRoute`, `buildManifest`), intelligence (`flowIntelligence`, `funnelRecovery`, `recommendationEngine`).
- Folders: `tests/flywheel/`, `tests/beacon/`, `tests/msh-ops/{beacon,governance,mcp,organizer}/` (with `fixtures/`), `tests/ci/` (`.mjs`, workflow and script shape tests).
- **Not in `npm test` as of 2026-09-14:** `experimentation`, `governanceAutomation`, `adaptiveEntry`, `policyResponse`, `behaviorIntelligence`, `usage`. Status unknown until run.
- Never skip, disable, or quarantine a test to get green.

## CI (`.github/workflows/`)

- `ci.yml`: PR gate (`workflow-permissions-lint`, `audit-action-pins`, sensitive-path advisory) + reusable build-test + wrangler dry run. GitHub-hosted runners only; untrusted PR code never runs on self-hosted runners.
- Actions are pinned by SHA; `scripts/ci/audit-action-pins.mjs` enforces it.
- `staging-deploy.yml`, `deploy-production.yml`: Operator-triggered deploys. Rollback: `ROLLBACK.md`, `docs/flywheel/rollback-runbook.md`.

## Scope lock (`SCOPE-LOCK.md`, effective 2026-07-01)

**Retired — never treat as built:** autonomous agents (Sentinel, Mission Composer, RAG Agent, TTX Agent, Copilot layer); RAG pipeline / vector store / embeddings; agent orchestration mesh / handoff protocol; multi-operator identity, operator tiers, MFA enforcement; RBAC, permission ceilings, scope registries; immutable governance audit log, 3-year retention; SOC 2 / NIST AI RMF / ISO 42001 gap analyses; Upwork consulting tiers; SKU tracking, PDF watermarking, expiring download tokens; backend marketplace delivery flows; inject sequencing engine, real-time TTX trigger loop, AI facilitation; backend persistence beyond the TTX data model; backend auth/session layer, RBAC role assignment; secrets rotation policy; SLO error budgets, observability dashboards for fictional systems; XP/XXP telemetry; any backend not in the repo.

**Real:** React/Vite/TS/Tailwind SPA; Worker deploy with assets binding and `/api/*`; registries `DIVISIONS`, `OPERATOR_SYSTEMS`, `MARKETPLACE_CATEGORIES`, `FUTURE_MODULES`; `ecosystem.ts` graph; marketplace `CatalogGrid` / `CategoryPageBody`; `CatalogItem` extension (`kind: "product" | "content"` and Phase 10 metadata fields); TTX UI scaffold under `src/operator/ttx/`; `src/lib/apiClient.ts`; CI gate, staging, observability, rollback runbook, `/api/*` rate limiting; governance metadata as non-certifying labels; explainability as source/last-updated only.

**Enforcement:** before acting on any phase/blueprint/packet, confirm every named field, component, or system maps to a real file here, and that nothing from the Retired list is presented as existing. Otherwise flag as drift and do not synthesize it as fact.

**Known tension (UNRESOLVED, Operator decision):** `SCOPE-LOCK.md` retires a backend auth/session layer, yet `worker/auth.ts`, `passwordHash.ts`, `sessionBridge.ts`, the `SESSION` DO, and `AUTH_REVOCATION` KV exist and are tested. Treat the code as real. Do not extend auth scope (RBAC, multi-operator, MFA) without an Operator mission that also amends the scope lock.

## Agents (`AGENTS.md`)

| ID | Callsign | Mission |
|---|---|---|
| ARCH-01 | Architect Prime | Architecture, contracts, dependencies, plans |
| SEC-01 (alias THR-01) | Threatwarden | Independent security and governance review |
| QA-01 | Breakpoint Oracle | Skeptical validation, testing, release gating |

Prompts: `.cursor/agents/*.md`. Always-on rules: `.cursor/rules/00-beacon-governance.mdc`, `10-repository-boundaries.mdc`, `20-packet-contract.mdc`, `30-pieces-mcp-governance.mdc`. `FLYWHEEL_RELEASE_CANDIDATE_OPERATOR.md` is mission-specific; do not rewrite.

## Working conventions

- Branch per task; commits in `type(scope): summary` form (`feat`, `fix`, `chore`, `docs`, `test`).
- Repo operations follow the MSH-OPS GitHub SOP linked in `README.md`.
- Before pushing: `npm run typecheck` and `npm test` locally. One validated push over several speculative ones.
- Root-level `*.md` files are mostly historical planning packets; prefer `docs/` and this file for current state. Index: `docs/INDEX.md` (pending).
- Current planning artifact: `docs/BUDGET-EXECUTION-PLAN.md`.
