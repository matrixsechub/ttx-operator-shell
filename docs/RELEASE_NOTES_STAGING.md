# Release Notes — Staging Candidate (0.1.0)

Draft for operator review before first staging deploy. Not a production promotion record until staging smoke passes.

## Summary

This release makes the operator shell **deploy-traceable**, **auth-hardened**, and **staging-isolated**, with automated local verification and guarded staging deploy.

## Changes

### Auth default-deny (`worker/apiAuth.ts`)

- New middleware after `edgeAuthGate`: all `/api/*` routes require a valid cockpit JWT unless explicitly allowlisted.
- Public allowlist: login, refresh, logout, catalog, engine health/version, build-info, system health, webhook ingest (HMAC), live join token, marketplace-lifecycle, engagements create.
- Anonymous requests to security events, TTX, webhooks read, telemetry, governance, etc. → **401**.

### Build provenance

- Post-build assembly: [`scripts/assemble-operator-dist.mjs`](../scripts/assemble-operator-dist.mjs) renames SPA shells, writes `dist/.build-manifest.json`, generates `worker/bundledBuildInfo.ts`.
- `GET /api/build-info` — public provenance endpoint (`version`, `commitSha`, `buildTimestamp`, `deployEnv`).
- `GET /api/engine/version` extended with `commitSha` / `buildTimestamp` (backward-compatible `version` field).
- `X-Build-Commit` response header on stamped JSON responses.
- Frontend: `EngineStatusIndicator` shows short commit SHA + env.

### Staging isolation guardrails

- `wrangler.jsonc` `env.staging` uses **dedicated** KV namespace ids (placeholders until provisioned).
- `npm run verify:staging-config` — fails with actionable errors if placeholders remain or ids match production.
- `npm run deploy:staging` — validates KV config **before** build/deploy (`scripts/deploy-staging.mjs`).

### Status endpoint shim (`worker/kernel.ts`)

- `GET /api/system/status` — worker-native `SystemStatus`-compatible JSON (no engine proxy 404).
- Status page continues to use `GET /api/system/state`; `api.getSystemStatus()` now has a working backend.

### TTX scaffold bridge

- `/ttx/*` UI wired to worker APIs via `scenarioBridge.ts`: `ttxSessionService`, `ttxLocalScenarioService`, `ttxScoringService`.
- Dashboard `TTXStatusPanel` uses merged scenario source (not engine-proxy `ttxService`).

### Tests and CI

- `npm test` — 11 cases (auth allowlist, build manifest, staging config, status route, TTX session happy path).
- CI: `typecheck` → `test` → `build` (`.github/workflows/ci.yml`).
- `tsx` devDependency for worker module tests.

### Documentation

- [README.md](../README.md) — current architecture, deploy commands, API auth table.
- [RELEASE.md](./RELEASE.md) — full release runbook.
- [STAGING_EXECUTION.md](./STAGING_EXECUTION.md) — operator step-by-step for first staging deploy.

## Manual Cloudflare steps (required before staging)

1. Create four staging KV namespaces (`AUTH_REVOCATION`, `WEBHOOK_EVENTS`, `SECURITY_EVENTS`, `TTX_STATE`).
2. Replace placeholder ids in `wrangler.jsonc` `env.staging.kv_namespaces`.
3. Set staging secrets: `OPERATOR_CALLSIGN`, `OPERATOR_PASSWORD_HASH`, `AUTH_SIGNING_KEY`.
4. Deploy with `GIT_COMMIT_SHA` and `BUILD_TIMESTAMP` set.
5. Run smoke: `node scripts/verify-operator-deploy.mjs <staging-url> <commit-sha>`.

See [STAGING_EXECUTION.md](./STAGING_EXECUTION.md).

## Known limitations

- `wrangler deploy --env staging --dry-run` does **not** verify KV namespace existence; use `verify:staging-config` instead.
- Marketplace storefront (`dist/app/`) optional — assembly warns if MSHOPS bundle absent.
- Placeholder staging KV ids (`a000…0001–0004`) will block `deploy:staging` until replaced.

## Verification (local, pre-deploy)

| Check | Status |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm test` | Pass (11/11) |
| `npm run build` | Pass |
| `npm run verify:staging-config` | **Expected fail** until KV provisioned |
| `wrangler deploy --env staging --dry-run` | Pass (structural) |

## Release verdict (post-production)

| Gate | Verdict |
|------|---------|
| Code readiness | **GO** |
| Operator-shell production | **DEPLOYED** — see [PRODUCTION_RELEASE.md](./PRODUCTION_RELEASE.md) |
| Full MSHOPS beta | **NO-GO** — `/enter`, `/marketplace` 503 without `dist/app/` |

Verifier modes:

- `npm run verify:deploy:handoff` — operator-shell production gate
- `npm run verify:deploy:beta` — full MSHOPS beta gate
