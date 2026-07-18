# Flywheel deployment preparation

No deployment is authorized by this mission.

Prerequisites:

1. Review and approve the additive `v38-flywheel-engine` SQLite Durable Object migration.
2. Confirm `FLYWHEEL` is bound to `FlywheelDO` in the target environment.
3. Confirm the non-secret `FLYWHEEL_TENANT_ID` matches the deployment tenant.
4. Confirm existing Beacon v2, Receipt Authority, signing-key, authentication, `TTX_STATE`, and audit dependencies are healthy.
5. Run `npm ci`, `npm run typecheck`, `npm run test:flywheel`, `npm test`, `npm run build`, `npm run verify:staging-config`, and both Wrangler dry-runs.

Staging smoke tests should authenticate as Operator, create a queued run, run a C0 analysis, confirm C2 returns 202, approve the proposal, enter safe mode, verify material denial, and confirm Stage 10 creates but does not activate a next cycle. Production requires a separate War Room release packet and explicit operator approval.
