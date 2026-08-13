# Flywheel Command Operator verification

## Verdict

`PASS`

Verified at: `2026-07-18T05:15:00Z`

No staging or production deployment was performed. No commit, push, merge, rebase, reset, or secret mutation was performed. No secret values were displayed.

## Candidate identity

- Worktree: `C:\Users\wevrw\Dev\ttx-flywheel-engine-v1`
- Branch: `codex/flywheel-engine-v1`
- HEAD: `d02cafe67e38259755acd07b6b896ea2d1f23d20`
- Provenance: matches expected branch and base HEAD prefix `d02cafe6`
- Candidate state: accepted Flywheel changes remain uncommitted over the base HEAD

## Scope classification

| Path | Class |
|---|---|
| `worker/flywheel/**` | FLYWHEEL_CORE |
| `shared/flywheel/**` | FLYWHEEL_CORE |
| `src/lib/flywheelService.ts` | FLYWHEEL_UI |
| `src/pages/dashboard/FlywheelDashboard.tsx` | FLYWHEEL_UI |
| `src/components/flywheel/**` | FLYWHEEL_UI |
| `src/components/OperatorShell.tsx` | FLYWHEEL_INTEGRATION |
| `src/routes/cockpitRouter.tsx` | FLYWHEEL_INTEGRATION |
| `src/routes/router.tsx` | FLYWHEEL_INTEGRATION |
| `worker/index.ts` | FLYWHEEL_INTEGRATION |
| `wrangler.jsonc` | FLYWHEEL_INTEGRATION |
| `package.json` (`test:flywheel`) | FLYWHEEL_INTEGRATION |
| `tsconfig.app.json` / `tsconfig.worker.json` | FLYWHEEL_INTEGRATION |
| `tests/flywheel/**` | FLYWHEEL_TEST |
| `docs/flywheel/**` | FLYWHEEL_DOCS |
| `docs/evidence/**` | EVIDENCE |
| `tall` | UNRELATED (accidental `less` help dump) |
| `artifacts/**`, `worker/bundledBuildInfo.ts` | GENERATED (build side-effects) |

## Unexpected `tall` artifact

- Exists: yes
- Type: plain text file, no extension
- Size: 16653 bytes
- Content: GNU `less` pager help (`SUMMARY OF LESS COMMANDS`) with backspace overstrike formatting
- Likely origin: accidental shell redirection (`less` help captured to `./tall`)
- Recommendation: `REQUEST_DELETE_APPROVAL` (do not stage; accidental noise)

## Secret scan

Flywheel-scoped paths and a repository pattern scan were reviewed with values redacted.

| Finding class | Result |
|---|---|
| Flywheel source hardcoded secrets | none |
| `worker/flywheel/adapters.ts` `secret` field | VARIABLE_NAME_ONLY (HMAC constructor param; no literal credential) |
| Docs mentioning `CLOUDFLARE_API_TOKEN` | DOCUMENTATION_EXAMPLE / VARIABLE_NAME_ONLY |
| Staging CF Access / AI gateway scripts | VARIABLE_NAME_ONLY |
| `tests/uiux/staging/edgeAuth.test.ts` | TEST_FIXTURE (`test-client-secret`) |
| POSSIBLE_SECRET / CONFIRMED_SECRET | none detected |

## Durable Object and migration

- `FlywheelDO` exported from `worker/index.ts`
- Binding `FLYWHEEL` -> `FlywheelDO` in production and staging
- Migration `v38-flywheel-engine` follows `v37-receipt-authority`
- Tag not duplicated; uses `new_sqlite_classes: ["FlywheelDO"]`
- Tenants: production `mshops`, staging `mshops-staging`
- Same class name in both environments
- No destructive alteration of earlier migration tags observed

## Architecture controls confirmed

- Bounded deterministic mock stage execution with retry ceiling 3
- Governance preflight before command storage/execution
- Operator approval gate for action class >= C2 (HTTP 202 + proposal)
- Telemetry sanitization (depth/size bounds, sensitive key redaction, Bearer redaction)
- Structured JSON success/failure envelopes
- Tenant isolation via `FLYWHEEL_TENANT_ID` and DO `getByName(tenantId)`
- Idempotency replay vs conflict (`GOVERNANCE_DUPLICATE_COMMAND`)
- Safe mode blocks material execution categories
- DEPLOY permanently denied for v1
- No direct secret reads in Flywheel routes; webhook HMAC secret is optional adapter config only
- No uncontrolled recursive inference path in v1 adapters

### Governance precedence mapping

| Required semantics | Implementation |
|---|---|
| DENY | `allowed: false` + structured error code |
| REQUIRE_OPERATOR_APPROVAL | `allowed: true` + `approvalRequired: true` -> proposal + awaiting_approval |
| SANDBOX | run `safe_mode` state; only ANALYZE / REQUEST_EVIDENCE / RESUME permitted |
| ALLOW | `allowed: true` + `approvalRequired: false` |

### Telemetry coverage mapping

| Required evidence | How exposed |
|---|---|
| Cycle started | `flywheel.run.created` / run state transitions |
| Stage entered / completed | Stage execution records in DO + `flywheel.command.accepted` after adapter run |
| Stage denied | Structured governance failure response (`allowed: false`) |
| Operator intervention requested | pause/resume/safe-mode/terminate routes; awaiting_approval |
| Governance decision | `governanceDecision` on emitted events + HTTP decision codes |
| Idempotency replay/rejection | `replay: true` or HTTP 409 `GOVERNANCE_DUPLICATE_COMMAND` |
| Failure | Structured `{ error, code }` responses; stage execution error fields |
| Cycle completed | terminal run states + `flywheel.cycle.proposed` for next queued cycle |

Registered event names also include finer-grained stage/command denial events; runtime currently emits the subset above plus pause/resume/terminate/evidence/safe-mode events. Sanitizer prevents secrets and unbounded payloads.

## Validation results

| Gate | Result |
|---|---|
| `npm run test:flywheel` | PASS — 17/17 |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 357/357 |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| `npx wrangler deploy --dry-run` | PASS — bindings include `FLYWHEEL` / tenant `mshops` |
| `npx wrangler deploy --env staging --dry-run` | PASS — bindings include `FLYWHEEL` / tenant `mshops-staging` |

## Mutations by this operator session

- Source repairs: none (all validation gates passed without defect)
- Evidence added: this file
- Transient raw command captures may exist under `docs/evidence/_flywheel-*.txt` (non-secret build/test logs)
- Build regenerated: `artifacts/**`, `worker/bundledBuildInfo.ts` (leave unstaged)

## Authorizations

- Commit: NOT_GRANTED
- Push: NOT_GRANTED
- Deployment: NOT_GRANTED

## Blockers

None for verification completeness. Release remains blocked pending operator commit + explicit deploy authorization (`DEPLOY_STAGING` / production confirmation per repository contract).

## Recommended next action

1. Operator approval to delete untracked `tall`
2. Operator review of Flywheel changeset
3. Explicit commit authorization (not granted here)
4. Explicit staging deploy authorization after immutable commit SHA exists
