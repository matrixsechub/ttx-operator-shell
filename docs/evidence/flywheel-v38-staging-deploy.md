# Flywheel V38 Staging Deploy Evidence

Mission ID: `FW-V38-STAGING-DEPLOY-20260719-001`  
Generated: `2026-07-19T08:35:00Z`  
Target Worker: `ttx-operator-shell-staging`  
Deploy source SHA: `da1bbd3cf27031d0832d6d30ed47df9a115a3464` (`origin/main`)  
PR #9 merge ancestor: `731cd701589befdce56581aa5c0583f6db82c46e`

## Objective

Deploy merged Flywheel Engine V1 to staging via non-versioned Wrangler deploy, apply additive `v38-flywheel-engine`, run authenticated smoke, collect runtime evidence, and stop before production.

## Deploy

| Field | Value |
|---|---|
| Method | `npm run deploy:staging` → `wrangler deploy --env staging` (non-versioned) |
| Result | **PASS** |
| Version ID | `e25bb3e2-3a40-43f4-94a6-60771fcac159` |
| Deployment ID | `f1b5fed7-770e-4225-ac19-404a4f63870e` |
| URL | https://ttx-operator-shell-staging.sogellagepul.workers.dev |
| Deployed at | `2026-07-19T08:27:29Z` |

### Bindings confirmed live (API settings)

- `FLYWHEEL` → `FlywheelDO`
- `RECEIPT_AUTHORITY` → `ReceiptAuthority`
- `FLYWHEEL_TENANT_ID` = `mshops-staging`
- `DEPLOY_ENV` = `staging`

### Migration sequence (repo + deploy path)

`v1-operator-backbone` → `v36-live-ttx-sessions` → `v37-receipt-authority` → `v38-flywheel-engine`

Non-versioned deploy succeeded with new `FlywheelDO` binding present; live migration for `v38` applied as part of this staging deploy (not via `versions upload`).

## Authenticated smoke

Raw report: `docs/evidence/_flywheel-staging-smoke-raw.json`  
Script: `scripts/flywheel-staging-smoke.mjs`

Access: Cloudflare Access service token used for edge ingress (staging hostname is Access-protected). Operator login used staging secrets aligned to local operator hash for this mission.

| Step | Result |
|---|---|
| Operator login | PASS |
| Stages require auth | PASS |
| Stages list | PASS |
| Create queued run | PASS |
| C0 ANALYZE | PASS |
| C1 SCAN creates evidence | PASS |
| Evidence persisted | PASS |
| C2 SYNTH → 202 approval | **FAIL** — `GOVERNANCE_MISSING_BEACON` (requires Beacon `verified_v2`) |
| Approve | SKIPPED (no proposal) |
| Safe mode | PASS |
| Material denied in safe mode | PASS |
| Beacon v2 gate observed | PASS (expected fail-closed) |
| DEPLOY permanently denied | PASS |
| System status | PASS |

**Smoke core OK:** YES  
**Smoke full approval path OK:** NO

## Remaining blockers (pre-production)

1. **Beacon v2 for C2+ approvals:** `worker/flywheel/governance.ts` requires `beacon.status === "verified_v2"` when `approvalRequired`. Staging `mainCompat.resolveBeaconRuntimeState()` currently resolves `legacy_v1` / `invalid`, so material C2 proposals fail closed with `GOVERNANCE_MISSING_BEACON`. Fix requires signed Beacon v2 activation or an explicitly authorized governance policy change — **not performed in this mission**.
2. Production deploy: **NOT_GRANTED**.

## Authorization accounting

| Authority | Status |
|---|---|
| Staging deploy | **CONSUMED** |
| Production deploy | **NOT_GRANTED** |
| Live production migration / state | **NOT_PERFORMED** |

## Final verdict

**PASS_WITH_BLOCKERS** — Staging Worker deployed with `v38` / `FlywheelDO` live; core authenticated Flywheel runtime smoke passed; C2 approval path blocked by Beacon v2 requirement until a follow-up mission addresses Beacon status on staging.

## Recommended next action

Authorize a Beacon-v2 / governance follow-up mission for staging so C2 proposal+approve can complete, then re-run full approval-path smoke before any production deploy authorization.

## Result block

```text
FLYWHEEL_V38_STAGING_DEPLOY_RESULT
Status: PASS_WITH_BLOCKERS
MissionID: FW-V38-STAGING-DEPLOY-20260719-001
TargetWorker: ttx-operator-shell-staging
DeploySHA: da1bbd3cf27031d0832d6d30ed47df9a115a3464
VersionID: e25bb3e2-3a40-43f4-94a6-60771fcac159
MigrationSequence: v1>v36>v37>v38
LiveMigrationExecuted: YES_STAGING_V38
StagingDeployPerformed: YES
ProductionDeployPerformed: NO
SmokeCore: PASS
SmokeApprovalPath: FAIL_BEACON_V2_REQUIRED
RemainingBlockers: GOVERNANCE_MISSING_BEACON_FOR_C2
DeploymentAuthorizationProduction: NOT_GRANTED
EvidenceArtifact: docs/evidence/flywheel-v38-staging-deploy.md
```
