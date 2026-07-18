# Operator Flywheel Engine v1 staging verification

## Verdict

`STAGING_DEPLOYMENT_AUTHORIZATION_REQUIRED`

Originally verified at: `2026-07-15T10:03:09Z`
Reconciled at: `2026-07-18T16:30:00Z` for immutable implementation RC.

No staging or production deployment was performed. No secret values were displayed or modified. All Wrangler results below are **dry-run only** and do not constitute live runtime proof.

## Candidate identity (reconciled)

- Worktree: `C:\Users\wevrw\Dev\ttx-flywheel-engine-v1`
- Branch: `codex/flywheel-engine-v1`
- Base HEAD: `d02cafe67e38259755acd07b6b896ea2d1f23d20`
- Implementation RC SHA: `0b242edf3319dafefc70c9e258ff1a7c5224e121`
- Implementation commit: `feat(flywheel): implement governed Flywheel Engine V1`
- Provenance: implementation RC is an immutable child of the base HEAD on the Flywheel branch

## Migration and binding preflight

- Migration order: `v1-operator-backbone` -> `v36-live-ttx-sessions` -> `v37-receipt-authority` -> `v38-flywheel-engine`.
- `v38-flywheel-engine` is declared for production and staging and adds `FlywheelDO` as a SQLite Durable Object.
- Production and staging dry-runs both resolved `FLYWHEEL`, `RECEIPT_AUTHORITY`, `GOVERNANCE`, `TTX_STATE`, authentication KV, assets, AI, and service bindings.
- Production and staging dry-runs both resolved a non-secret `FLYWHEEL_TENANT_ID` (`mshops` / `mshops-staging`).

## Credential presence

Presence was checked without displaying values.

- Wrangler authenticated session: present (at original verification time).
- Staging Worker secret names checked for presence only: `OPERATOR_CALLSIGN`, `OPERATOR_PASSWORD_HASH`, `AUTH_SIGNING_KEY`, `GOVERNANCE_RECEIPT_SIGNING_KEY`.
- Local operator bearer / staging callsign-password / Access service-token pair: not assumed present for this evidence packet.

## Validation results

| Gate | Result |
|---|---|
| `npm run test:flywheel` | PASS — 17/17 |
| `npm test` | PASS — 357/357 |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| Wrangler production dry-run | PASS |
| Wrangler staging dry-run | PASS |
| `git diff --check` / cached check | PASS |

## Blocking decision

The repository's staging deployment contract requires:

1. An immutable target commit — now satisfied by `0b242edf3319dafefc70c9e258ff1a7c5224e121`.
2. Explicit manual confirmation `DEPLOY_STAGING` for that exact commit — **not granted**.
3. Approved operator authentication material for post-deploy proof — not assumed present.
4. Cloudflare Access credentials only if the staging hostname requires Access.

Because deployment authorization is absent, this packet records dry-run verification only. It does **not** claim live staging deployment, authenticated Flywheel API proof, Durable Object runtime proof, or post-deploy smoke success.

## Recommended next action

Provide explicit `DEPLOY_STAGING` authorization for SHA `0b242edf3319dafefc70c9e258ff1a7c5224e121`, then run staging-only deploy and authenticated post-deploy verification under a separate governed mission.
