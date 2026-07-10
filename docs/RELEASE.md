# Release Runbook

Production URL: `https://ttx-operator-shell.sogellagepul.workers.dev`

Staging URL (after first deploy): `https://ttx-operator-shell-staging.sogellagepul.workers.dev`

## Staging Provisioning Checklist

Complete every step before the first `npm run deploy:staging`. The deploy command **refuses to run** while placeholder KV namespace IDs remain in `wrangler.jsonc`.

### 1. Create staging KV namespaces

Run once per binding (save each returned `id`):

```bash
wrangler kv namespace create AUTH_REVOCATION --env staging
wrangler kv namespace create WEBHOOK_EVENTS --env staging
wrangler kv namespace create SECURITY_EVENTS --env staging
wrangler kv namespace create TTX_STATE --env staging
```

### 2. Replace namespace IDs in `wrangler.jsonc`

In `env.staging.kv_namespaces`, replace each placeholder `a000000000000000000000000000000X` id (and matching `preview_id`) with the real Cloudflare namespace id from step 1.

Validate locally before deploying:

```bash
npm run verify:staging-config
```

### 3. Set staging secrets

```bash
node scripts/hash-password.mjs "<passphrase>"

wrangler secret put OPERATOR_CALLSIGN --env staging
wrangler secret put OPERATOR_PASSWORD_HASH --env staging
wrangler secret put AUTH_SIGNING_KEY --env staging
```

Confirm secrets exist (Wrangler does not list values):

```bash
wrangler secret list --env staging
```

You should see `OPERATOR_CALLSIGN`, `OPERATOR_PASSWORD_HASH`, and `AUTH_SIGNING_KEY`.

### 4. Deploy staging with build provenance

**Linux / macOS:**

```bash
export GIT_COMMIT_SHA="$(git rev-parse HEAD)"
export BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
npm run deploy:staging
```

**Windows (PowerShell):**

```powershell
$env:GIT_COMMIT_SHA = git rev-parse HEAD
$env:BUILD_TIMESTAMP = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
npm run deploy:staging
```

`deploy:staging` runs `verify-staging-config` first, then builds and deploys.

### 5. Run smoke verification

**GitHub Actions (recommended after Phase 2):** use the `Staging Deploy` workflow; download `staging-release-evidence` after a successful run.

**Local read-only smoke (GET/HEAD only, no credentials):**

```bash
STAGING_BASE_URL=https://ttx-operator-shell-staging.sogellagepul.workers.dev \
COMMIT_SHA="$(git rev-parse HEAD)" \
npm run test:staging-smoke
```

**Legacy integration script (includes POST checks):**

```bash
node scripts/verify-operator-deploy.mjs https://ttx-operator-shell-staging.sogellagepul.workers.dev
```

Optional: assert build provenance matches the commit you intended to ship:

```bash
node scripts/verify-operator-deploy.mjs https://ttx-operator-shell-staging.sogellagepul.workers.dev "$(git rev-parse HEAD)"
```

### 6. Verify `/api/build-info`

```bash
curl -s https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/build-info
```

Expect:

- HTTP 200
- `deployEnv` = `"staging"`
- `commitSha` matches `git rev-parse HEAD` used at deploy time

### 7. Verify anonymous auth enforcement

```bash
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/security/events | head -n 1
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/ttx/sessions/scenarios | head -n 1
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/webhooks/events | head -n 1
```

Expect `401` on each (no `Authorization` header).

Public endpoints should still return `200`:

```bash
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/build-info | head -n 1
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/engine/health | head -n 1
```

---

## Production Promotion Gate

**Do not deploy production until all staging gates pass.**

| Gate | Requirement |
|------|-------------|
| Staging smoke | `node scripts/verify-operator-deploy.mjs <staging-url>` exits 0 |
| Build provenance | `/api/build-info.commitSha` on staging matches intended git commit |
| Auth lockdown | Anonymous `GET /api/security/events`, `/api/ttx/sessions/scenarios`, `/api/webhooks/events` → 401 |
| Public health | `/api/build-info`, `/api/engine/health`, `/api/engine/version` → 200 |
| Status contract | `/api/system/status` → 200 (not engine-proxy 404) |
| CI | `npm run typecheck`, `npm test`, `npm run build` green on the release commit |

### Promote to production

```bash
export GIT_COMMIT_SHA="$(git rev-parse HEAD)"
export BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
npm run deploy
```

Re-verify on production:

```bash
node scripts/verify-operator-deploy.mjs https://ttx-operator-shell.sogellagepul.workers.dev "$(git rev-parse HEAD)"
curl -s https://ttx-operator-shell.sogellagepul.workers.dev/api/build-info
```

### Rollback (staging or production)

```bash
wrangler deployments list --env staging
wrangler rollback <deployment-id> --env staging

wrangler deployments list
wrangler rollback <deployment-id>
```

See [ROLLBACK.md](../ROLLBACK.md) for full procedure.

---

## Prerequisites (reference)

### Production secrets

```bash
wrangler secret put OPERATOR_CALLSIGN
wrangler secret put OPERATOR_PASSWORD_HASH
wrangler secret put AUTH_SIGNING_KEY
```

### Production KV

Production namespace IDs live in the top-level `kv_namespaces` block of `wrangler.jsonc`. Do not reuse these ids for staging.

---

## Local release verification (pre-deploy)

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run verify:staging-config    # fails until placeholders are replaced — expected before provisioning
wrangler deploy --dry-run --outdir dist-dryrun
wrangler deploy --env staging --dry-run --outdir dist-staging-dryrun
```

**Note:** `wrangler deploy --env staging --dry-run` may succeed even with placeholder KV ids (dry-run does not contact Cloudflare KV). `npm run verify:staging-config` is the authoritative pre-deploy guard — it fails early with a clear message while placeholders remain.

---

## Branch protection (recommended)

Enable GitHub branch protection on `main` requiring these checks before merge:

| Check | Workflow |
|---|---|
| `pr-gate` | CI |
| `build-test` | CI |
| `wrangler-dry-run` | CI |
| `security-pr` | Security PR |

Manual staging deployment procedure: [STAGING-DEPLOYMENT.md](./STAGING-DEPLOYMENT.md).
