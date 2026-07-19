# Flywheel PR #9 Secondary Findings Evidence

Mission ID: `FW-PR9-SECONDARY-FINDINGS-20260719-001`  
Generated: `2026-07-19T07:51:00Z`  
Operator worktree: `C:\Users\wevrw\Dev\ttx-flywheel-pr-clean`  
Branch: `release/flywheel-engine-v1-clean`  
Start SHA: `e232271f194921329eb5711626fab1f78de7aec3`  
Final SHA: `dc2bb217a4348b591cbb0db288f3cbd6e6e9699b`  
PR: https://github.com/matrixsechub/ttx-operator-shell/pull/9

## Objective

Resolve the remaining human-review secondary findings (command idempotency; governed-mutation digest continuity), add focused ReceiptAuthority regression tests, run the full non-mutating release gate, and request exact-SHA human re-review — without merge or deploy.

## Finding dispositions

| Finding | Disposition | Change |
|---|---|---|
| FlywheelDO marks `completed` before `execute` | **RESOLVED** | Non-approval commands insert as `accepted`; `completed` only after successful `execute`; failures become `denied`; idempotency replays only `completed`/`denied`, returns `in_progress` for `accepted`/`awaiting_approval` |
| Execution receipt digest ≠ approval digest | **RESOLVED** | `GovernedMutationInput.actionDigest` required; `routes.ts` passes approval digest; execution receipt stamps `mutation.actionDigest` |

Neither finding was accepted as a known limitation.

## Code / test changes

| Path | Change |
|---|---|
| `worker/flywheel/idempotency.ts` | State-aware `resolveIdempotency` (`in_progress` vs `replay`) |
| `worker/flywheel/do.ts` | `accepted` insert; `denyCommand` on early execute failure; in-progress replay handling |
| `worker/flywheel/mainCompat.ts` | Required `actionDigest` on governed mutation input; receipt uses it |
| `worker/flywheel/routes.ts` | Pass computed approval `actionDigest` into `runGovernedMutation` |
| `tests/flywheel/runtime.test.ts` | Idempotency state-machine coverage |
| `tests/flywheel/receiptAuthority.test.ts` | `evaluateReceiptReserve` regression suite |
| `tests/flywheel/digestContinuity.test.ts` | Approval digest stamped on execution receipt |
| `package.json` | `test:flywheel` includes new test files |

Migration tags untouched: `v1` → `v36` → `v37-receipt-authority` → `v38-flywheel-engine`.

## Release gate (non-mutating)

| Gate | Result |
|---|---|
| `npm run test:flywheel` | PASS **25/25** |
| `npm test` | PASS **120/120** |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npx wrangler deploy --dry-run` | PASS (`RECEIPT_AUTHORITY` + `FLYWHEEL`) |
| `npx wrangler deploy --env staging --dry-run` | PASS (`RECEIPT_AUTHORITY` + `FLYWHEEL`) |

## Authorization

| Authority | Status |
|---|---|
| Merge PR #9 | NOT_GRANTED / not performed |
| Deploy staging / production | NOT_GRANTED / not performed |
| Rename/reorder migration tags | NOT_PERFORMED |

## Human re-review request

After push, PR #9 comment requests exact-SHA human re-review at the mission final HEAD (checklist: full ReceiptAuthority, migration continuity, secondary findings closed, CI green). No self-approve / merge.

## Result block

```text
FLYWHEEL_PR9_SECONDARY_FINDINGS_RESULT
Status: PASS
MissionID: FW-PR9-SECONDARY-FINDINGS-20260719-001
PRNumber: 9
StartSHA: e232271f194921329eb5711626fab1f78de7aec3
FinalSHA: dc2bb217a4348b591cbb0db288f3cbd6e6e9699b
IdempotencyFinding: RESOLVED
DigestFinding: RESOLVED
ReceiptAuthorityTests: ADDED
ReleaseGate: PASS
HumanRereviewRequested: YES
MergeAuthorization: NOT_GRANTED
DeploymentAuthorization: NOT_GRANTED
```
