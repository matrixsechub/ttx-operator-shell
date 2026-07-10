# Production Release Record — Operator Shell 0.1.0

## Deployed release

| Field | Value |
|-------|--------|
| **Scope** | Operator-shell-only (not full MSHOPS beta) |
| **Commit** | `72e7f1e863babf70522fcba254a302d8f3ad0259` |
| **Production version ID** | `eb8b067b-8567-42fc-ab10-05fa3e462588` |
| **Build timestamp** | `2026-07-10T08:05:32Z` |
| **Worker** | `ttx-operator-shell` |
| **URL** | https://ttx-operator-shell.sogellagepul.workers.dev |
| **Rollback target (pre-release)** | `bb274ae6-dcb5-464d-a835-c7bc52ada477` |

## Verification result (release-handoff)

| Gate | Result |
|------|--------|
| `/api/build-info.commitSha` | **PASS** — matches deployed commit |
| `/api/system/status` | **PASS** — 200, `systemMode: PRODUCTION` |
| `/api/engine/health` | **PASS** — 200 |
| `/api/engine/version` | **PASS** — provenance matches commit |
| Anonymous protected APIs | **PASS** — 401 on security/TTX/webhooks |
| Operator routes (`/`, `/login`, `/dashboard`) | **PASS** — 200, no unexpected 5xx |

**Handoff verifier (post-reconciliation):**

```bash
npm run verify:deploy:handoff -- https://ttx-operator-shell.sogellagepul.workers.dev 72e7f1e863babf70522fcba254a302d8f3ad0259
```

## Full MSHOPS beta readiness

**NO-GO** — out of scope for this production release.

| Blocker | Symptom |
|---------|---------|
| Missing storefront bundle | `/enter`, `/marketplace` → **503** (no `dist/app/`) |
| SPA shell vs session gate | `/systems` HTML → 200 without redirect (APIs remain 401) |
| Ghost / telemetry / governance beta probes | Not satisfied anonymously |
| Authenticated system state | `/api/system/state` requires operator JWT |

Use `npm run verify:deploy:beta` only when promoting full MSHOPS beta.

## Recommended annotated tag (not created without approval)

```
operator-shell-v0.1.0-72e7f1e
```

```bash
git tag -a operator-shell-v0.1.0-72e7f1e 72e7f1e863babf70522fcba254a302d8f3ad0259 -m "Operator shell production release 0.1.0"
```

## Rollback

```bash
wrangler deployments list
wrangler rollback bb274ae6-dcb5-464d-a835-c7bc52ada477
```

See [ROLLBACK.md](../ROLLBACK.md).
