# Governance Console

Phase 2B operator surface for governed decision-making.

## Route

- Cockpit UI: `/operator/governance`
- Legacy panel: `/dashboard/governance`

## Capabilities

1. Inspect pending proposals with filters (status, action class).
2. View action digest, beacon hash, codex hash, rollback plan, and evidence refs.
3. Run deterministic council review (advisory only).
4. Approve, deny, or request revision with optional constraints and rationale.
5. Execute approved proposals through ReceiptAuthority (single mutation).
6. Inspect audit timeline events for a proposal.
7. Enter/exit governance safe mode (operator-only).

## API namespace

All routes require Worker operator authentication (`Authorization: Bearer`).

| Method | Route |
|--------|-------|
| GET | `/api/operator/governance/health` |
| GET/POST | `/api/operator/governance/proposals` |
| GET | `/api/operator/governance/proposals/:id` |
| POST | `/api/operator/governance/proposals/:id/review` |
| POST | `/api/operator/governance/proposals/:id/approve` |
| POST | `/api/operator/governance/proposals/:id/deny` |
| POST | `/api/operator/governance/proposals/:id/request-revision` |
| POST | `/api/operator/governance/proposals/:id/execute` |
| GET | `/api/operator/governance/proposals/:id/audit` |
| GET | `/api/operator/governance/receipts/:receiptId` |
| GET | `/api/operator/governance/telemetry` |
| GET/POST | `/api/operator/governance/safe-mode/*` |

Cloudflare Access (when enabled on staging) is an additional edge gate; it does not replace Worker auth.

## Safe mode

When governance safe mode is active:

- C0/C1 observation and advisory flows remain available.
- C2–C5 mutations return `SAFE_MODE_MUTATION_BLOCKED`.
- C6 destructive actions are denied unless registered as containment actions.

## Failure codes

Common governance denial codes surfaced in the console:

- `RECEIPT_REQUIRED`, `RECEIPT_CONSUMED`, `RECEIPT_IN_PROGRESS`
- `ACTION_DIGEST_MISMATCH`, `BEACON_DRIFT`, `BEACON_HASH_MISMATCH`
- `SAFE_MODE_MUTATION_BLOCKED`
- `ROLLBACK_PLAN_REQUIRED`, `TRUST_EVIDENCE_REQUIRED`, `OPERATOR_RATIONALE_REQUIRED`

## Local testing

```bash
npm run typecheck
npm run test:phase2b-governance
npm test
npm run codex:validate
```

Staging proof (prepare only — does not deploy):

```bash
npm run test:staging-phase-2b-governance-proof -- https://ttx-operator-shell-staging.sogellagepul.workers.dev <commit-sha>
```
