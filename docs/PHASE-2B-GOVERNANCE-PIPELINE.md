# Phase 2B — Governance Pipeline

## Architecture

```text
Operator UI (/operator/governance)
  → /api/operator/governance/*
  → proposal store (KV)
  → council review (deterministic, advisory)
  → operator decision (KV)
  → approval receipt (signed, GOVERNANCE_RECEIPT_SIGNING_KEY)
  → ReceiptAuthority DO (reserve / complete / replay block)
  → governed executor (runGovernedMutation)
  → execution receipt + audit bundle
  → governance telemetry (KV index)
```

## Proposal lifecycle

1. **Create** — `POST /api/operator/governance/proposals` with action class, payload, beacon/codex hashes.
2. **Council review** — advisory positions; never mints receipts.
3. **Operator decision** — approve (exact digest), deny, or request revision.
4. **Receipt issued** — time-bounded signed approval bound to action digest.
5. **Execute** — ReceiptAuthority reserves; exactly one mutation succeeds under concurrency.
6. **Audit** — events + execution receipt + bundle ID linked in artifact chain.

## Action classes (C0–C6)

| Class | Mutation | Requirements |
|-------|----------|--------------|
| C0 | No | Read-only observation |
| C1 | No | Advisory / draft only |
| C2 | Yes | Signed operator approval |
| C3 | Yes | Approval + rollback plan |
| C4 | Yes | Approval + trust evidence |
| C5 | Yes | Approval + explicit rationale |
| C6 | Yes | Strongest gate; blocked in safe mode |

Action classes are validated against the codex action registry — not agent text alone.

## Receipt lifecycle

- Issued on operator approval with `actionDigest`, `beaconHash`, `codexHash`.
- Reserved in ReceiptAuthority DO per `approvalId`.
- Consumed on successful execution; replays return `RECEIPT_CONSUMED`.
- Tampered payloads fail `ACTION_DIGEST_MISMATCH` before mutation.

## Telemetry

Events emitted to `governance:v2:telemetry:*` KV keys. Readable via `GET /api/operator/governance/telemetry`.

Phase 2B event names include:

- `governance_review_requested`, `governance_review_completed`, `governance_review_failed`
- `governance_operator_approved`, `governance_operator_denied`, `governance_revision_requested`
- `governance_safe_mode_entered`, `governance_safe_mode_exited`

## Staging validation

Phase 1 staging proof (`artifacts/staging-governance-proof.json`) established ReceiptAuthority integrity.

Phase 2B staging proof script: `scripts/ci/staging-phase-2b-governance-proof.mjs`  
Artifact: `artifacts/staging-phase-2b-governance-proof.json`

**Production remains separate.** Do not enable `AI_FULFILLMENT_ENABLED` as part of Phase 2B.

## Rollback

- Operator rollback plans are required on C3+ proposals.
- Execution rollback of live state requires a separately approved rollback action (not autonomous).

## Scope lock

Phase 2B does not introduce RBAC, multi-tenant auth, autonomous agents, RAG, or public batch inference.
