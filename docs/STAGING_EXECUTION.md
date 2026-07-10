# Staging Execution Checklist

Operator runbook for the **first controlled staging deploy** after release-readiness code is merged. Do not deploy production until every gate at the end of this document passes.

**Staging URL (target):** `https://ttx-operator-shell-staging.sogellagepul.workers.dev`

**Reference:** [RELEASE.md](./RELEASE.md) (full runbook) · [RELEASE_NOTES_STAGING.md](./RELEASE_NOTES_STAGING.md) (what changed)

---

## Pre-flight (local, on release commit)

From the repo root on the commit you intend to ship:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run verify:staging-config   # MUST fail while placeholders remain — expected before step 2
```

Record the release commit SHA:

```bash
# bash/zsh
git rev-parse HEAD

# PowerShell
git rev-parse HEAD
```

---

## Step 1 — Create staging KV namespaces

Run **once** per binding. Save each returned `id` (32-char hex).

```bash
wrangler kv namespace create AUTH_REVOCATION --env staging
wrangler kv namespace create WEBHOOK_EVENTS --env staging
wrangler kv namespace create SECURITY_EVENTS --env staging
wrangler kv namespace create TTX_STATE --env staging
```

Example output shape (your ids will differ):

```json
{ "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

---

## Step 2 — Paste namespace IDs into `wrangler.jsonc`

Edit `env.staging.kv_namespaces` in [wrangler.jsonc](../wrangler.jsonc):

- Replace each placeholder `a000000000000000000000000000000X` **and** matching `preview_id` with the real id from step 1.
- Do **not** change production (top-level) `kv_namespaces`.

Validate:

```bash
npm run verify:staging-config
```

**Do not proceed if:** command exits non-zero or mentions placeholders / shared production ids.

---

## Step 3 — Set staging secrets

```bash
node scripts/hash-password.mjs "<passphrase>"
```

Set secrets (values are never committed):

```bash
wrangler secret put OPERATOR_CALLSIGN --env staging
wrangler secret put OPERATOR_PASSWORD_HASH --env staging
wrangler secret put AUTH_SIGNING_KEY --env staging
```

Confirm presence (not values):

```bash
wrangler secret list --env staging
```

Expected names: `OPERATOR_CALLSIGN`, `OPERATOR_PASSWORD_HASH`, `AUTH_SIGNING_KEY`.

**Do not proceed if:** any of the three secrets is missing from the list.

---

## Step 4 — Deploy staging with build provenance

Set env vars to the **same commit** you recorded in pre-flight, then deploy.

### bash / zsh

```bash
export GIT_COMMIT_SHA="$(git rev-parse HEAD)"
export BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
npm run deploy:staging
```

### PowerShell

```powershell
$env:GIT_COMMIT_SHA = git rev-parse HEAD
$env:BUILD_TIMESTAMP = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
npm run deploy:staging
```

`deploy:staging` runs `verify-staging-config` first, then `build`, then `wrangler deploy --env staging`.

**Do not proceed if:** deploy aborts (placeholders, build failure, or Wrangler error).

---

## Step 5 — Smoke verification (with expected commit)

Replace `<RELEASE_SHA>` with full `git rev-parse HEAD` from step 4.

```bash
node scripts/verify-operator-deploy.mjs https://ttx-operator-shell-staging.sogellagepul.workers.dev <RELEASE_SHA>
```

**Do not proceed if:** script exits non-zero. Inspect JSON `failedChecks`.

---

## Step 6 — Inspect `/api/build-info`

```bash
curl -s https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/build-info
```

Expect:

| Field | Expected |
|-------|----------|
| `deployEnv` | `"staging"` |
| `commitSha` | matches `<RELEASE_SHA>` (full or prefix) |
| `version` | `"0.1.0"` (or current `APP_VERSION`) |

**Do not proceed if:** `commitSha` is `"unknown"` or does not match the deployed commit.

---

## Step 7 — Manual anonymous auth checks

Without an `Authorization` header, protected routes must return **401**:

```bash
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/security/events | head -n 1
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/ttx/sessions/scenarios | head -n 1
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/webhooks/events | head -n 1
```

Public endpoints must return **200**:

```bash
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/build-info | head -n 1
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/engine/health | head -n 1
curl -si https://ttx-operator-shell-staging.sogellagepul.workers.dev/api/system/status | head -n 1
```

**Do not proceed if:**

- Any protected route returns `200` without auth (lockdown failure).
- `/api/system/status` returns `404` or `502` (status shim missing or engine proxy leak).

---

## Step 8 — Record GO / NO-GO

| Gate | Pass criteria |
|------|----------------|
| `verify:staging-config` | Exit 0 after real KV ids pasted |
| `deploy:staging` | Completes without error |
| `verify-operator-deploy` | Exit 0 with expected commit SHA |
| `/api/build-info` | `commitSha` matches release commit |
| Anonymous protected APIs | 401 |
| `/api/system/status` | 200 |

**Staging deploy: GO** only when all rows pass.

**Production deploy: NO-GO** until staging GO is recorded and [RELEASE.md](./RELEASE.md) production promotion gate is satisfied.

---

## Rollback (if smoke fails)

```bash
wrangler deployments list --env staging
wrangler rollback <deployment-id> --env staging
```

Investigate locally, fix, and repeat from step 4.

---

## Quick reference — do not proceed when

1. `npm run verify:staging-config` fails (placeholders or prod id collision).
2. `wrangler secret list --env staging` missing any of the three auth secrets.
3. `npm run deploy:staging` aborts or Wrangler reports KV/secret errors.
4. Anonymous `GET /api/security/events` (or TTX/webhooks) returns **200**.
5. `GET /api/system/status` returns **404** or **502**.
6. `/api/build-info` `commitSha` ≠ intended release commit.
7. `verify-operator-deploy.mjs` exits non-zero.
