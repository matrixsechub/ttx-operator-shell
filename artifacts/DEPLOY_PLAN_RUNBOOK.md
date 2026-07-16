# DEPLOY_PLAN_RUNBOOK - PR #7

Repository: `matrixsechub/ttx-operator-shell`
Branch: `codex/hsx-scope-gate-validation`
PR: `#7`

## Local Validation

```powershell
cd C:\Users\wevrw\Dev\ttx-operator-shell-hsx-scope-gate-validation
npm ci
node --import tsx --test tests/hsxScopeGate.test.ts tests/governanceEnforcement.test.ts tests/governanceRoutes.test.ts
npm run typecheck
git diff --check
```

Expected:

- focused tests pass 24/24.
- typecheck passes.
- whitespace check passes.

## Preview Deploy

Preferred: use the Cloudflare Git integration for branch `codex/hsx-scope-gate-validation`.

Manual staging deploy, if operator chooses CLI:

```powershell
cd C:\Users\wevrw\Dev\ttx-operator-shell-hsx-scope-gate-validation
npx wrangler deploy --env staging
```

Do not deploy production from this PR until preview evidence is attached and operator approval is recorded.

## Preview Secrets

Provision Preview/Staging only:

```powershell
npx wrangler secret put N8N_WEBHOOK_SECRET --env staging
npx wrangler secret put AUTH_SIGNING_KEY --env staging
npx wrangler secret put GOVERNANCE_RECEIPT_SIGNING_KEY --env staging
npx wrangler secret put BEACON_SIGNING_KEY --env staging
```

Do not provision `OPERATOR_BOOTSTRAP_TOKEN` for PR #7; HSX does not use it.

## Preview Smoke Tests

Unauthenticated:

```bash
curl -i -X POST "https://<preview-host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  --data '{"packet":"test"}'
```

Expected:

- `401`
- JSON code: `SCOPE_GATE_AUTH_REQUIRED`

Invalid JSON/body with valid secret:

```bash
curl -i -X POST "https://<preview-host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: <PREVIEW_SECRET>" \
  --data '{"packet":"test"}'
```

Expected:

- authenticated request reaches evaluator.
- response is structured; malformed schema should return `400` with `SCHEMA_INVALID`, not auth failure.

Valid low-risk packet:

```bash
curl -i -X POST "https://<preview-host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: <PREVIEW_SECRET>" \
  --data @valid-low-risk-hsx-packet.json
```

Expected:

- `200`
- `decision.outcome = "approved"`
- Worker log contains `hsx.scope_gate.approved`

Denied packet:

```bash
curl -i -X POST "https://<preview-host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: <PREVIEW_SECRET>" \
  --data @denied-hsx-packet.json
```

Expected:

- non-2xx or `decision.outcome = "denied"`
- specific `reason_code`
- Worker log contains `hsx.scope_gate.denied`

## Production Deploy

Production deploy requires:

1. PR CI green.
2. Preview smoke evidence attached to PR #7.
3. Preview logs attached to PR #7.
4. Operator approval.

CLI deploy only after approval:

```powershell
cd C:\Users\wevrw\Dev\ttx-operator-shell-hsx-scope-gate-validation
npx wrangler deploy
```

## Monitoring

First 15 minutes:

- HSX evaluation success rate >= 99% for valid operator/n8n requests.
- No unexpected auth bypass events.
- No persistent `TRACKING_WRITE_FAILED` or `TRACKING_READ_FAILED`.
- No missing Beacon/signing-key failures after secrets are provisioned.

Representative log filters:

```text
route="/api/governance/hsx/scope-gate/evaluate"
event="hsx.scope_gate.approved" OR event="hsx.scope_gate.denied"
reason_code="TRACKING_WRITE_FAILED" OR reason_code="TRACKING_READ_FAILED"
reason_code="SIGNED_BEACON_NOT_ACTIVE"
```

## Rollback

Triggers:

- HSX route returns unexpected 5xx for more than 1% of requests for 10 minutes.
- Valid operator/n8n requests are blocked after secrets are verified.
- Audit events are missing from Worker logs and `TTX_STATE`.
- ReceiptAuthority migration causes Durable Object errors.

Actions:

1. Revert PR #7 merge commit or roll back Worker deployment to previous version.
2. Remove or rotate preview-only secrets if used in testing.
3. Preserve logs and failed packet ids for root-cause review.
4. Reopen PR with minimal fix and rerun focused tests plus preview smoke.

Signed: Architect
