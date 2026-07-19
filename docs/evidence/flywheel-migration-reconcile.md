# Flywheel Migration Reconciliation Evidence

Mission ID: `FW-MIGRATION-RECONCILE-20260719-001`  
Generated: `2026-07-19T07:18:00Z`  
Operator worktree: `C:\Users\wevrw\Dev\ttx-flywheel-pr-clean`  
Branch: `release/flywheel-engine-v1-clean`

## Objective

Reconcile repository Durable Object migration history with live production tag `v37-receipt-authority`, and correct Cloudflare PR / non-production Workers Builds behavior — without merging PR #9 or deploying.

## Live vs repository (before)

| Source | Migration tags |
|---|---|
| Live production Worker (Workers Builds warning) | includes `v37-receipt-authority` |
| Clean branch `wrangler.jsonc` (pre-fix) | `v1` → `v36-live-ttx-sessions` → `v38-flywheel-engine` (v37 missing) |
| Historical Flywheel commit `0b242edf` | `v1` → `v36` → `v37-receipt-authority` → `v38-flywheel-engine` |

## Repository changes

1. Restored exact historical migration declaration:
   ```jsonc
   {
     "tag": "v37-receipt-authority",
     "new_sqlite_classes": ["ReceiptAuthority"]
   }
   ```
   Inserted after `v36-live-ttx-sessions` and before `v38-flywheel-engine` (production + staging).
2. Restored `RECEIPT_AUTHORITY` → `ReceiptAuthority` binding (production + staging).
3. Added minimal historical class export `worker/do/receiptAuthority.ts` (`export class ReceiptAuthority extends DurableObject {}`) and `export { ReceiptAuthority }` from `worker/index.ts` so Wrangler class/export continuity matches the restored tag without shipping full Receipt Authority application logic.
4. Appended Flywheel migration remains `v38-flywheel-engine` / `FlywheelDO` (tag not renamed or reused).
5. Added non-mutating package scripts:
   - `cf:preview-validate`
   - `cf:preview-validate:staging`
6. Updated `docs/flywheel/deployment-runbook.md` and `docs/flywheel/rollback-runbook.md` for the reconciled sequence.

Final migration sequence:

`v1-operator-backbone` → `v36-live-ttx-sessions` → `v37-receipt-authority` → `v38-flywheel-engine`

## Cloudflare Workers Builds configuration (non-mutating)

| Trigger | UUID | Change |
|---|---|---|
| prod non-production | `de945fd8-dbaa-4254-a470-4fcdebe1e9a7` | `deploy_command`: `npx wrangler versions upload` → `npx wrangler deploy --dry-run`; renamed to validate dry-run |
| staging non-production | `e7276a99-2149-4300-a0a8-13fac9535a9c` | `build_command`: `` → `npm run build`; `deploy_command`: versions upload → `npx wrangler deploy --env staging --dry-run` |
| staging default (`main`) | `6a062df4-7e54-44e3-95cf-23ffc3d39957` | `build_command`: `` → `npm run build` (deploy command unchanged: `npx wrangler deploy`) |

Production default-branch deploy trigger (`da27da03-…`, `npx wrangler deploy` on `main`) was **not** altered.

No staging or production deploy was executed by this mission.

## Validation

| Gate | Result |
|---|---|
| `npm run test:flywheel` | PASS 17/17 |
| `npm test` | PASS 120/120 |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npx wrangler deploy --dry-run` | PASS (shows RECEIPT_AUTHORITY + FLYWHEEL) |
| `npx wrangler deploy --env staging --dry-run` | PASS (shows RECEIPT_AUTHORITY + FLYWHEEL) |

## Authorization status

| Authority | Status |
|---|---|
| Merge PR #9 | NOT_GRANTED / not performed |
| Deploy staging | NOT_GRANTED / not performed |
| Deploy production | NOT_GRANTED / not performed |
| Modify live DO state | NOT_PERFORMED |
| Rename/reuse migration tags | NOT_PERFORMED |

## Remaining notes for later authorized deploy

- Applying `v38-flywheel-engine` still requires a non-versioned `wrangler deploy` (not `versions upload`).
- The historical `ReceiptAuthority` stub preserves class/tag continuity; restoring full Receipt Authority application behavior (if required) is a separate mission.
- After this commit is pushed to `release/flywheel-engine-v1-clean`, Cloudflare non-prod builds should validate via dry-run instead of failing on DO migration version uploads.
