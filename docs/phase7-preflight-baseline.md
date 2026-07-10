# Phase 7 Preflight Baseline

Captured at implementation start. Re-run `git rev-parse --short HEAD` before deploy.

**Branch:** `main`  
**SHA:** `b0086334`

## Commands

```bash
npm run typecheck
npm run build
node --import tsx --test tests/usage.test.ts tests/experimentation.test.ts tests/adaptiveEntry.test.ts
curl -s https://ttx-operator-shell.sogellagepul.workers.dev/api/traffic/activation
```

## Snapshot fields (post-Phase 7)

`/api/traffic/activation` now includes:

- `qualifiedOrganicSessions`
- `confidenceBlockers`
- `promotionEligibleWinner`

## New routes

- Public: `POST /api/traffic/interaction`
- Operator: `/api/operator/activation/*`
- Dashboard: `/operator/traffic-activation`

## KV families

`activation:v1:*` — does not migrate `usage:v2:*` or `usage:v3:*`
