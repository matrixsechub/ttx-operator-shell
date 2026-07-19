# Flywheel ReceiptAuthority Restore Evidence

Mission ID: `FW-RECEIPT-AUTHORITY-RESTORE-20260719-001`  
Generated: `2026-07-19T07:40:00Z`  
Operator worktree: `C:\Users\wevrw\Dev\ttx-flywheel-pr-clean`  
Branch: `release/flywheel-engine-v1-clean`  
Start SHA: `dfed6c426cf37619ba94d42c181e79e4917efeba`  
Restore commit: `0a7229dfb7b397fc76a33e1c020712cbdd0384a4`  
PR: https://github.com/matrixsechub/ttx-operator-shell/pull/9  
PR HEAD after restore: `98843341d920ef0643551adb53911dee98aa6f8a`

## Objective

Restore the complete authoritative historical `ReceiptAuthority` Durable Object and its required dependency on PR #9 without altering migration tags, Flywheel behavior, or unrelated code.

## Source of truth

| Artifact | Source | Blob SHA |
|---|---|---|
| `worker/do/receiptAuthority.ts` | commit `0b242edf` (Flywheel implementation commit; byte-identical to engine-v1 HEAD) | `8a37a3c6ee245c0364dfe32f2cce356268b732e2` |
| `worker/governance/receiptReserveLogic.ts` | commit `0b242edf` | `b250add7301bb8b6975965828e0436d6947b6550` |

Restore method: `git checkout 0b242edf -- <paths>` (exact tree blobs).

## Scope restored

| Path | Action | Notes |
|---|---|---|
| `worker/do/receiptAuthority.ts` | Replaced empty stub with full DO | reserve / complete / fail / health / fetch |
| `worker/governance/receiptReserveLogic.ts` | Added | Sole import dependency of the DO (types + `evaluateReceiptReserve`); zero further imports |

### Explicitly NOT restored (out of mission scope)

Broader governance callers/adapters that are not required for the DO class export itself:

- `worker/governance/receiptAuthorityClient.ts`
- `worker/governance/receiptAuthorityMemory.ts`
- `worker/governance/governedMutation.ts`
- Other `worker/governance/**` / operator governance routes

Flywheel continues to use `worker/flywheel/mainCompat.ts` for its governance shim. No Flywheel files were modified.

## Untouched guards

| Guard | Result |
|---|---|
| `wrangler.jsonc` migration tags | Unchanged: `v1` → `v36` → `v37-receipt-authority` → `v38-flywheel-engine` |
| `worker/flywheel/**`, `shared/flywheel/**` | Diff empty vs HEAD |
| `worker/index.ts` export line | Unchanged (`export { ReceiptAuthority } from "./do/receiptAuthority"`) |
| Merge / deploy | NOT_GRANTED / not performed |

## Validation

| Gate | Result |
|---|---|
| Local blob hash match to `0b242edf` | PASS (both files) |
| `npm run typecheck` | PASS |
| `npm run test:flywheel` | PASS 17/17 |
| `npx wrangler deploy --dry-run` | PASS (shows `RECEIPT_AUTHORITY` + `FLYWHEEL`) |

## Addresses human review blocker

Closes primary release blocker from `FW-PR9-HUMAN-REVIEW-20260719-001`: empty stub vs live full class. After this restore, an authorized future deploy would ship the historical ReceiptAuthority behavior for the `v37` class name rather than an empty DurableObject shell.

Secondary review findings (FlywheelDO idempotency; `mainCompat` digest divergence) were **not** in scope for this mission and remain open.

## Authorization

| Authority | Status |
|---|---|
| Merge PR #9 | NOT_GRANTED / not performed |
| Deploy staging / production | NOT_GRANTED / not performed |
| Modify migration tags | NOT_PERFORMED |
| Force-push | NOT_PERFORMED |

## Recommended next

Re-run human re-review / PR-gate on the new HEAD; secondary Flywheel findings remain optional follow-ups before approve.
