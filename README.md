# MSH OPS Operator Shell

Multi-surface operator storefront served by a Cloudflare Worker with static assets.

**Production:** `https://ttx-operator-shell.sogellagepul.workers.dev`

## Stack

- **Frontend:** React 19 + Vite + TypeScript + React Router + Tailwind CSS v4
- **Worker:** Cloudflare Worker (`worker/index.ts`) — API routes, auth, TTX engine, surface routing
- **Assets:** `dist/` via Wrangler static assets binding (`run_worker_first: true`)

## Surfaces

| Surface | Shell | Routes |
|---|---|---|
| Ecosystem | `ecosystem-shell.html` | `/` |
| Cockpit | `operator-shell.html` | `/dashboard`, `/ttx`, `/systems`, `/ops`, `/status`, … |
| Auth | `auth-shell.html` | `/login` |
| Council | `council-shell.html` | `/council` |
| Storefront | `app/index.html` | `/marketplace`, `/storefront` (built by `vite.storefront.config.ts` in `npm run build`) |

`npm run build` runs Vite (operator + storefront shells) and `scripts/assemble-operator-dist.mjs`, which renames shells, requires `dist/app/index.html`, and writes `dist/.build-manifest.json` for provenance.

## CI and staging (Phase 1 + 2)

GitHub-hosted CI on `ubuntu-latest` runs `pr-gate`, `build-test`, `wrangler-dry-run`, and `security-pr` on every push/PR to `main`. Manual staging deploy uses the **Staging Deploy** workflow — see [docs/STAGING-DEPLOYMENT.md](./docs/STAGING-DEPLOYMENT.md).

## Develop

```bash
npm install
npm run dev           # Vite :5173, proxies /api to VITE_DEV_API_PROXY_TARGET
npm run worker:dev    # build + wrangler dev (closest to production)
```

## Build, test, typecheck

```bash
npm run typecheck
npm test
npm run build
```

## Deploy

```bash
npm run deploy                 # production: ttx-operator-shell
npm run verify:staging-config  # fails until real staging KV ids replace placeholders
npm run deploy:staging         # validates KV config, then builds + deploys staging
```

Set build provenance at deploy time:

```bash
GIT_COMMIT_SHA=$(git rev-parse HEAD) BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ) npm run deploy:staging
```

### Staging

Staging uses **separate KV namespaces** from production. Run `npm run verify:staging-config` after replacing placeholder ids in `wrangler.jsonc`. Full checklist: [docs/RELEASE.md](./docs/RELEASE.md).

### Auth setup

Worker auth (`worker/auth.ts`) — single operator, stateless JWT, KV revocation denylist:

```bash
node scripts/hash-password.mjs "<passphrase>"
wrangler secret put OPERATOR_CALLSIGN
wrangler secret put OPERATOR_PASSWORD_HASH
wrangler secret put AUTH_SIGNING_KEY
```

Use `--env staging` for staging secrets. For local `wrangler dev`, use `.dev.vars`.

### API surfaces

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/build-info` | Public | Deploy provenance (commit SHA, version, env) |
| `GET /api/engine/health` | Public | Worker liveness |
| `GET /api/engine/version` | Public | App version + build metadata |
| `GET /api/system/status` | Operator | Compatibility status contract |
| `GET /api/system/state` | Operator | Unified kernel state (Status page) |
| `GET /api/marketplace/catalog` | Public | Storefront catalog |
| `POST /api/auth/login` | Public | Operator login |
| `/api/ttx/*`, `/api/security/*`, … | Operator | Default-deny; requires cockpit Bearer token |

### CI

`.github/workflows/ci.yml` runs `typecheck` → `test` → `build` on push/PR.

**Recommended:** enable branch protection on `main` requiring CI to pass before merge.

### Release verification

See [docs/RELEASE.md](./docs/RELEASE.md) for the full staging → production checklist.

```bash
node scripts/verify-operator-deploy.mjs https://ttx-operator-shell-staging.sogellagepul.workers.dev
wrangler deploy --dry-run --outdir /tmp/ttx-dry-run
```

### Rollback

See [ROLLBACK.md](./ROLLBACK.md).

## Project layout

```
src/entries/     Per-surface SPA entry points
src/routes/      Per-surface React Router configs
src/operator/    Operator modules (including TTX scaffold)
worker/          Cloudflare Worker handlers
scripts/         Build assembly + verification scripts
docs/RELEASE.md  Release runbook
```
