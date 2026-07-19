# Flywheel deployment preparation

No deployment is authorized by this mission.

Prerequisites:

1. Review and approve the additive migration sequence:
   - historical `v37-receipt-authority` (already applied in live production; retained for tag continuity)
   - additive `v38-flywheel-engine` SQLite Durable Object migration for `FlywheelDO`
2. Confirm `RECEIPT_AUTHORITY` remains bound to `ReceiptAuthority` and `FLYWHEEL` is bound to `FlywheelDO` in the target environment.
3. Confirm the non-secret `FLYWHEEL_TENANT_ID` matches the deployment tenant.
4. Confirm existing Beacon, signing-key, authentication, `TTX_STATE`, and audit dependencies are healthy.
5. Run `npm ci`, `npm run typecheck`, `npm run test:flywheel`, `npm test`, `npm run build`, `npm run verify:staging-config`, and both Wrangler dry-runs.

Durable Object lifecycle migrations cannot be applied with `wrangler versions upload`. Authorized deploys must use a non-versioned `wrangler deploy` path after separate deployment authorization.

Staging smoke tests should authenticate as Operator, create a queued run, run a C0 analysis, confirm C2 returns 202, approve the proposal, enter safe mode, verify material denial, and confirm Stage 10 creates but does not activate a next cycle. Production requires a separate War Room release packet and explicit operator approval.
