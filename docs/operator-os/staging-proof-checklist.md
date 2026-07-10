# Staging Proof Checklist — Operator OS v3 Phase 1

Operator-run harness after staging RC deploy. Does not deploy or mutate secrets.

## Authorization

Deploy requires exact token:

`OPERATOR_APPROVAL=DEPLOY_OPERATOR_OS_V3_PHASE_1_RC_TO_STAGING`

This checklist assumes deploy completed and migration `v37-receipt-authority` applied.

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `STAGING_BASE_URL` | Staging worker origin (no trailing slash) |
| `OPERATOR_AUTH_TOKEN` | Bearer JWT for operator routes |
| `CF_ACCESS_CLIENT_ID` | Cloudflare Access service token (if host protected) |
| `CF_ACCESS_CLIENT_SECRET` | Cloudflare Access service token secret |

Optional: `COMMIT_SHA`, `OPERATOR_OS_SMOKE_RUN_ID`, `EXPECTED_BEACON_SHA256`, `EXPECTED_CODEX_HASH`.

Secrets are read from the environment only. Scripts never print token or Access secret values.

## Local harness validation (no staging)

```bash
node scripts/operator-os-staging-smoke.mjs --validate-local
node scripts/operator-os-staging-cleanup.mjs --dry-run
npm run codex:validate
```

## Staging proof run

```bash
export STAGING_BASE_URL="https://ttx-operator-shell-staging.<account>.workers.dev"
export OPERATOR_AUTH_TOKEN="<bearer>"
export CF_ACCESS_CLIENT_ID="<id>"
export CF_ACCESS_CLIENT_SECRET="<secret>"
export COMMIT_SHA="$(git rev-parse HEAD)"

node scripts/operator-os-staging-smoke.mjs
```

Evidence JSON is written to `artifacts/operator-os-staging-evidence-<run_id>.json` with redacted fields only.

## Cleanup

```bash
export OPERATOR_OS_EVIDENCE_PATH="artifacts/operator-os-staging-evidence-<run_id>.json"
node scripts/operator-os-staging-cleanup.mjs
```

## Pass criteria

- System status / beacon: `verified_v2`
- Codex hash present on status or beacon endpoint
- Receipt Authority available (concurrency proof shows single reservation)
- Proposal → approve → governed activation mutation succeeds once
- Replay, tamper, legacy boolean, wrong environment, and disabled legacy routes denied
- Organizer `?scan=1` remains read-only
- Artifact contains no secrets, signatures, or full tokens

## Beacon publish before staging deploy

```bash
BEACON_SIGNING_KEY="<staging-key>" node scripts/publish-beacon-v2.mjs --env staging --force
npm run build
```

Signed envelope lands at `msh-ops/beacon/releases/staging/current.json` only. Production envelope is never overwritten by staging publish.

## Phase gate

Success advances to `PHASE_1::STAGING_PROOF_COMPLETE` (operator attestation). Do not mark `PHASE_1::SYSTEM_WIDE_CLOSED` until this checklist passes against the deployed RC.
