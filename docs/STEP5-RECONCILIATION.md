# Step 5 Unblock — mshops-public Edge Auth Reconciliation

**Status:** Patch applied locally — **do not deploy** until live probes pass.  
**Date:** 2026-07-09

## Phase A — Source Recovery (2026-07-09)

### Git investigation result

| Search | Result |
|---|---|
| `feature/marketplace-enhancement-pass-2` | **Not on any local/remote git branch** |
| Commit `864add69` | **Not in ttx-operator-shell or MSHOPS git** |
| `git grep binding_mismatch` across all branches | **Zero hits** (pre-patch) |
| `git grep Content-Security-Policy` | **Zero hits** (pre-patch) |
| `origin/feature/unified-public-surface` | `mshops-public` wrangler name, JS worker — **no edge auth** |
| `aa0e33cb` (rag-analyzer-phase1) | `mshops-public` wrangler config only |

### Canonical source (runtime evidence)

Recovered from **Cloudflare Workers Builds + `workers_get_worker_code`**:

| Field | Value |
|---|---|
| Worker | `mshops-public` (id `440c79d80a7c4534ab225a6cc01e6f32`) |
| Branch | `feature/marketplace-enhancement-pass-2` |
| Commit | `864add692ac5ad5948bb2be87922c93ad9f1bff0` |
| Prior commit | `71b9cc2` — initial `workers/msh-ops-os-harness.js` edge layer |
| Bundle | `msh-ops-os-harness.js` (proxies to `ORIGIN_URL`) |

Metadata tracked in `worker/edge/canonical/source-meta.ts`.

### Behavioral contract (canonical vs local patch)

| Behavior | Canonical live | Local patch |
|---|---|---|
| Operator JWT gate | Yes, no ctx binding | **Aligned** |
| Marketplace ctx binding | Yes (`binding_mismatch`) | **Aligned** |
| `POST /api/operator/auth` | Yes | **Added** |
| `/api/fedgrade/health` | Proxied (origin 401) | Operator-gated handler (mission requirement) |
| CSP/XFO on HTML | Yes | **Added** (live `/ops/*` lacked CSP — intentional improvement) |
| Phase 35 handlers | N/A (proxy-only) | Preserved (hybrid) |

## Problem

Live `mshops-public` (Cloudflare build from `feature/marketplace-enhancement-pass-2` @ `864add69`) runs an edge-auth proxy layer that **does not exist** on `ttx-operator-shell` `main`. Deploying local `main` would regress:

- HMAC-JWT operator route protection
- Marketplace token + ctx-hash binding (`binding_mismatch`)
- CSP / XFO / nosniff on HTML
- HSX rate limits and session semantics
- FedGrade health posture (`/api/fedgrade/health`)
- Operator cockpit routes (`/ops/fedgrade`, `/ops/security`, `/ops/deploy`)

## Investigation Summary

| Search target | Result in git history |
|---|---|
| `feature/marketplace-enhancement-pass-2` | **Not on remote** — only on Cloudflare deploy metadata |
| `Content-Security-Policy`, `binding_mismatch`, `HSX`, `FedGrade` | **Zero commits** in ttx-operator-shell |
| `/ops/fedgrade` | **Not in source** — live returns SPA shell only |
| `origin/feature/unified-public-surface` | Has `mshops-public` wrangler name + JS worker — **no** edge auth layer |
| Canonical edge source | **Live worker bytecode** fetched from Cloudflare (runtime evidence) |

## Remediation Strategy

**Hybrid merge** — keep Phase 35 TypeScript worker + SPA, prepend live edge-auth behavior:

```
Request
  → edge rate limits (HSX / marketplace)
  → public session issuers (/api/marketplace/session, /api/hsx/session)
  → edgeAuthGate (HMAC-JWT + ctx binding)
  → fedgrade / integrity / hsx handlers
  → existing Phase 35 handlers (auth, ttx, security, webhooks, engine proxy)
  → ASSETS + injectSecurityHeaders (CSP, XFO, nosniff)
```

## Files Added / Changed

| Path | Purpose |
|---|---|
| `worker/edge/crypto.ts` | HS256 JWT sign/verify, ctx hash, timing-safe compare |
| `worker/edge/routeClass.ts` | Operator vs marketplace route classification |
| `worker/edge/rateLimit.ts` | HSX 3/s, marketplace 10/10s |
| `worker/edge/headers.ts` | CSP + XFO DENY + nosniff on HTML |
| `worker/edge/gate.ts` | Main edge auth gate |
| `worker/fedgrade.ts` | `/api/fedgrade/health` (post-gate) |
| `worker/marketplaceEdge.ts` | Session + integrity |
| `worker/hsxEdge.ts` | HSX session + envelope gate |
| `worker/env.ts` | `OPERATOR_SECRET` / `MARKETPLACE_SECRET` typing |
| `worker/index.ts` | Integration + HTML header injection |
| `wrangler.mshops-public.jsonc` | Production worker name `mshops-public` |
| `src/pages/ops/*.tsx` | Cockpit pages |
| `scripts/verify-step5-gate.mjs` | Static + optional live gate checks |

## Secrets Required Before Deploy

```powershell
wrangler secret put OPERATOR_SECRET -c wrangler.mshops-public.jsonc
wrangler secret put MARKETPLACE_SECRET -c wrangler.mshops-public.jsonc
# Fallback: AUTH_SIGNING_KEY (existing Phase 15 auth) if secrets unset
```

## Verification (No Deploy)

```powershell
npm run build
npm run verify:step5

# Live probes against local wrangler dev:
npm run worker:dev
# separate terminal:
node scripts/verify-step5-gate.mjs --base http://127.0.0.1:8787
```

### Expected Live Probes

| Endpoint | Without token | With valid JWT + ctx |
|---|---|---|
| `GET /api/fedgrade/health` | 401 | 200 + posture JSON |
| `GET /api/marketplace/integrity` | 401 | 200 |
| `GET /ops/fedgrade` | 200 HTML + CSP + XFO DENY | same |
| Wrong ctx hash | — | 403 `binding_mismatch` |

## Remaining Gaps (Post-Patch)

1. **`864add69` source recovery** — branch never pushed; consider exporting worker from Cloudflare to a tracked branch for diff audit.
2. **Live `/ops/*` CSP gap** — production `/ops/fedgrade` currently lacks CSP; patch **adds** CSP locally (intentional improvement, verify with stakeholders).
3. **Dual auth systems** — Phase 15 `/api/auth/*` (AUTH_SIGNING_KEY) coexists with edge OPERATOR_SECRET; align secrets in production.
4. **Step 6** — cross-repo integration checks still pending after Step 5 gate passes.

## Deploy Command (When Gate Passes)

```powershell
# ONLY after verify:step5 + live probes pass — NOT during unblock work
npm run deploy:mshops-public
```

**Hard rule:** Do not run deploy until Phase 5 live verification confirms parity with live security contract.
