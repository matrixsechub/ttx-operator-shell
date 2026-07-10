# Phase 7 — Operator Production Gate Report

**Status:** STAGING DEPLOY PENDING OPERATOR APPROVAL  
**Branch:** `main`  
**Commit:** `b0086334`  
**Generated:** 2026-07-10

## Local verification (pass)

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test:activation` | PASS (32 tests) |

## Production pre-deploy snapshot

Current production (`https://ttx-operator-shell.sogellagepul.workers.dev`) does **not** yet include Phase 7:

- `POST /api/traffic/interaction` → 401 (route not on deployed worker)
- `GET /api/traffic/activation` → 200 (legacy snapshot; missing `qualifiedOrganicSessions` fields)

This is expected until staging validation and operator-approved production deploy.

## Staging deploy (operator action required)

```bash
npm run deploy:staging
ACTIVATION_BASE_URL=https://ttx-operator-shell-staging.sogellagepul.workers.dev npm run verify:activation
node scripts/organic-activation-progress-report.mjs https://ttx-operator-shell-staging.sogellagepul.workers.dev
```

## Production promotion (blocked)

Do **not** run `npm run deploy` until:

1. Staging verify suite passes
2. Operator reviews campaign/queue governance on `/operator/traffic-activation`
3. Explicit production authorization recorded

**Rollback:** `wrangler rollback` on the production worker.

## Changed surface area

### New public routes

- `POST /api/traffic/interaction`
- Extended `POST /api/usage/event` (funnel events + attribution params)
- Extended `GET /api/traffic/activation` (organic progress fields)

### New operator routes

- `/api/operator/activation/*` (campaigns, assets, queue, tasks, overview, progress, recommendations)

### New UI

- `/operator/traffic-activation`

### New KV families

- `activation:v1:campaign:*`, `activation:v1:attribution:*`, `activation:v1:quality:*`, `activation:v1:metrics:*`, `activation:v1:queue:*`, `activation:v1:audit:*`

No migration of `usage:v2:*` or `usage:v3:*`.

### Optional env vars

- `ACTIVATION_WEBHOOK_SECRET`
- `ACTIVATION_OPERATOR_NOTIFY_URL`
- `ACTIVATION_SAFE_MODE` (force read-only mutations)

## Known limits

- Qualified organic requires `HUMAN_LIKELY` quality (interaction signals or funnel progression)
- Rate limit: 60 req/min per IP on worker (document 50–80ms between injection sessions)
- No auto-post / auto-spend / experiment winner mutation
- Campaign mutations require `operatorApproval: true` + `reason`

## Acceptance checklist

- [x] Campaign CRUD + approval state machine
- [x] First-touch attribution (`src`, `campaign`, `content`, `cta`)
- [x] Traffic quality classifier + interaction beacon
- [x] Funnel events through usage + funnelRecovery bridge
- [x] Campaign metrics + organic progress gates
- [x] Outreach assets + daily queue + channel allocator
- [x] Safe mode + telemetry + n8n stub
- [x] Operator dashboard
- [x] Tests + verify scripts + npm aliases
- [ ] Staging deploy + verify (awaiting operator)
- [ ] Production deploy (blocked)
