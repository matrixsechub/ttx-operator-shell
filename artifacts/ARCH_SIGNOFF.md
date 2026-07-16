# ARCH_SIGNOFF - PR #7

Generated: 2026-07-16T00:18:00-06:00
Repository: `matrixsechub/ttx-operator-shell`
Branch: `codex/hsx-scope-gate-validation`
PR: `#7`

## Decision

`CONDITIONAL_CODE_APPROVAL_RUNTIME_BLOCKED`

## Approved

- HSX route contract: `POST /api/governance/hsx/scope-gate/evaluate`.
- Authentication model: operator bearer token or `X-N8N-Webhook-Secret`.
- Fail-closed governance path.
- Signed Beacon v2 and signed approval receipt enforcement.
- Replay blocking.
- KV-backed decision and telemetry persistence under `TTX_STATE`.
- Local validation:
  - Focused tests passed 24/24.
  - `npm run typecheck` passed.
  - `git diff --check` passed.

## Blockers

1. `N8N_WEBHOOK_SECRET` is not present in inspected staging secret names.
2. No distinct Worker preview URL was exposed by the inspected version (`has_preview: false`).
3. Authenticated Preview/Staging smoke could not be run without an approved webhook secret or operator bearer token.
4. Production is missing `N8N_WEBHOOK_SECRET`, `GOVERNANCE_RECEIPT_SIGNING_KEY`, and `BEACON_SIGNING_KEY` by inspected secret-name listing.

## Required Operator Actions

1. Provision Preview/Staging `N8N_WEBHOOK_SECRET`.
2. Provide the correct Preview/Staging endpoint or deploy staging with `npx wrangler deploy --env staging`.
3. Run authenticated valid and denied packet probes.
4. Attach full curl responses and one representative Worker log line.
5. Confirm `TTX_STATE` contains the smoke telemetry event.

## Final Statement

Architect conditionally approves PR #7 code. Architect does not approve Production rollout until authenticated Preview/Staging evidence is attached and required Production secrets are present by name.
