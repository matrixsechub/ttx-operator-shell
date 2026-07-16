# DEPLOY_PLAN_PROD - PR #7

Generated: 2026-07-16T00:18:00-06:00
Repository: `matrixsechub/ttx-operator-shell`
Branch: `codex/hsx-scope-gate-validation`
PR: `#7`
Disposition: `RUNBOOK_READY_ROLLOUT_BLOCKED`

## Preconditions

Do not start Production rollout until all are true:

1. PR #7 checks are green.
2. Preview/Staging `N8N_WEBHOOK_SECRET` is provisioned.
3. Authenticated Preview/Staging valid packet returns `200`.
4. Preview/Staging logs show `hsx.scope_gate.approved` or `hsx.scope_gate.denied`.
5. `TTX_STATE` telemetry key is visible for the smoke event.
6. Production has `N8N_WEBHOOK_SECRET`, `GOVERNANCE_RECEIPT_SIGNING_KEY`, and `BEACON_SIGNING_KEY`.
7. Telemetry PR #21 is either healthy in Production or the Operator explicitly approves decoupling HSX from telemetry recovery.

## Local Validation

```powershell
cd C:\Users\wevrw\Dev\ttx-operator-shell-hsx-scope-gate-validation
node --import tsx --test tests/hsxScopeGate.test.ts tests/governanceEnforcement.test.ts tests/governanceRoutes.test.ts
npm run typecheck
git diff --check
```

Observed on 2026-07-16:

```text
focused governance tests: pass, 24/24
typecheck: pass
git diff --check: pass
```

## Preview/Staging Secret Provisioning

```powershell
npx wrangler secret put N8N_WEBHOOK_SECRET --env staging
npx wrangler secret list --env staging
```

Verify existing:

```powershell
npx wrangler secret list --env staging
```

Expected names:

```text
AUTH_SIGNING_KEY
BEACON_SIGNING_KEY
GOVERNANCE_RECEIPT_SIGNING_KEY
N8N_WEBHOOK_SECRET
```

## Preview/Staging Deploy

Preferred GitHub/Cloudflare integration:

```text
Use PR #7 branch codex/hsx-scope-gate-validation and wait for Workers Builds success.
```

Manual staging deploy if approved:

```powershell
npx wrangler deploy --env staging
```

## Preview/Staging Smoke

Unauthenticated:

```bash
curl -i -X POST "https://<preview-or-staging-host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  --data '{"packet":"test"}'
```

Expected:

```text
HTTP/1.1 401 Unauthorized
{"code":"SCOPE_GATE_AUTH_REQUIRED"}
```

Authenticated malformed packet:

```bash
curl -i -X POST "https://<preview-or-staging-host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: <N8N_WEBHOOK_SECRET>" \
  --data '{"packet":"test"}'
```

Expected:

```text
HTTP/1.1 400 Bad Request
{"ok":false,"decision":{"outcome":"denied","reason_code":"SCHEMA_INVALID"}}
```

Authenticated valid low-risk packet:

```bash
curl -i -X POST "https://<preview-or-staging-host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: <N8N_WEBHOOK_SECRET>" \
  --data @valid-low-risk-hsx-packet.json
```

Expected:

```text
HTTP/1.1 200 OK
{"ok":true,"decision":{"outcome":"approved","reason_code":"SCOPE_GATE_APPROVED"}}
```

## Production Secret Provisioning

Only after approval:

```powershell
npx wrangler secret put N8N_WEBHOOK_SECRET
npx wrangler secret put GOVERNANCE_RECEIPT_SIGNING_KEY
npx wrangler secret put BEACON_SIGNING_KEY
npx wrangler secret list
```

## Production Deploy

After PR #21 telemetry is healthy and PR #7 Preview/Staging smoke passes:

```powershell
npx wrangler deploy
```

## Monitoring

First 15 minutes:

```text
valid HSX evaluation success rate >= 99%
TRACKING_WRITE_FAILED = 0
TRACKING_READ_FAILED = 0
SIGNED_BEACON_NOT_ACTIVE = 0 after secrets verified
unexpected auth bypass events = 0
```

Representative filters:

```text
route="/api/governance/hsx/scope-gate/evaluate"
name="hsx.scope_gate.approved"
name="hsx.scope_gate.denied"
reason_code="TRACKING_WRITE_FAILED"
reason_code="TRACKING_READ_FAILED"
reason_code="SIGNED_BEACON_NOT_ACTIVE"
```

## Rollback

Rollback triggers:

- HSX route 5xx > 1% for 10 minutes.
- Valid n8n/operator requests are denied after secret verification.
- `TTX_STATE` decision persistence fails.
- Beacon/signing-key failure persists after secrets are verified.

Rollback steps:

1. Roll back Worker deployment to prior version or revert PR #7 merge.
2. Preserve Worker logs and representative packet ids.
3. Rotate `N8N_WEBHOOK_SECRET` if it was used in failed validation.
4. Keep HSX scope gate disabled or fail-closed until fix is reviewed.
