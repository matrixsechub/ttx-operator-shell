# Flywheel governance

All Flywheel routes require an authenticated Operator access token. Tenant authority comes only from `FLYWHEEL_TENANT_ID`; mismatched client tenant values are denied.

Material commands create an existing-format `ActionProposal` and return HTTP 202. Approval creates the repository's signed receipt and executes through `runGovernedMutation`, which verifies proposal revision, expiry, Beacon and Codex hashes, environment, action digest, signature, and Receipt Authority reservation before invoking the Durable Object. Receipt replay returns the prior execution receipt; a different command digest for an existing idempotency key is denied.

Low-risk safeguards are read/analyze, pause, lower autonomy, request evidence, and enter safe mode. Stage advancement, safe-mode resume, termination, scaling, and cycle activation require signed C2+ approval. `DEPLOY` is unconditionally denied.

Primary denial codes include `GOVERNANCE_MISSING_BEACON`, `GOVERNANCE_HASH_INVALID`, `GOVERNANCE_APPROVAL_REQUIRED`, `GOVERNANCE_SCOPE_MISMATCH`, `GOVERNANCE_AUTONOMY_EXCEEDED`, `GOVERNANCE_INVALID_TRANSITION`, `GOVERNANCE_DUPLICATE_COMMAND`, `GOVERNANCE_TENANT_MISMATCH`, `GOVERNANCE_EVIDENCE_MISSING`, and `GOVERNANCE_SAFE_MODE_ACTIVE`.
