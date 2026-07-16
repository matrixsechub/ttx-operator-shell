# HSX_SCOPE_GATE_REENABLE_CHECKLIST

Generated: 2026-07-16T00:35:00-06:00
Repository: `matrixsechub/ttx-operator-shell`
PR: `#7`
Disposition: `REENABLE_BLOCKED_ON_RUNTIME_EVIDENCE`

## Preconditions

Do not enable HSX_SCOPE_GATE until:

1. PR #21 telemetry recovery is merged, deployed, and production smoke passes.
2. Production telemetry monitoring runs for 15 minutes without rollback triggers.
3. PR #7 Preview/Staging authenticated smoke passes.
4. `TTX_STATE` contains HSX decision and telemetry records from smoke.
5. Worker logs show `hsx.scope_gate.approved` and a representative denied event.
6. Operator explicitly approves HSX_SCOPE_GATE activation.

## Secret Requirements

Preview/Staging:

```text
N8N_WEBHOOK_SECRET
AUTH_SIGNING_KEY
GOVERNANCE_RECEIPT_SIGNING_KEY
BEACON_SIGNING_KEY
```

Production:

```text
N8N_WEBHOOK_SECRET
AUTH_SIGNING_KEY
GOVERNANCE_RECEIPT_SIGNING_KEY
BEACON_SIGNING_KEY
```

## Smoke Commands

Unauthenticated:

```bash
curl -i -X POST "https://<host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  --data '{"packet":"test"}'
```

Expected:

```text
HTTP/1.1 401 Unauthorized
```

Authenticated malformed packet:

```bash
curl -i -X POST "https://<host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: <N8N_WEBHOOK_SECRET>" \
  --data '{"packet":"test"}'
```

Expected:

```text
HTTP/1.1 400 Bad Request
decision.outcome = "denied"
decision.reason_code = "SCHEMA_INVALID"
```

Authenticated valid packet:

```bash
curl -i -X POST "https://<host>/api/governance/hsx/scope-gate/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: <N8N_WEBHOOK_SECRET>" \
  --data @valid-low-risk-hsx-packet.json
```

Expected:

```text
HTTP/1.1 200 OK
decision.outcome = "approved"
decision.reason_code = "SCOPE_GATE_APPROVED"
```

## Monitoring Window

First 15 minutes after activation:

```text
valid HSX evaluation success rate >= 99%
TRACKING_WRITE_FAILED = 0
TRACKING_READ_FAILED = 0
SIGNED_BEACON_NOT_ACTIVE = 0 after secret verification
unexpected operator_bypass = 0
```

Rollback triggers:

- HSX 5xx > 1% for 10 minutes.
- Valid n8n/operator packets are denied after secret verification.
- `TTX_STATE` decision persistence fails.
- Beacon/signing-key failure persists.

## Activation Decision

Current decision:

```text
DO_NOT_ENABLE
```

Reason:

```text
Runtime authenticated smoke and TTX_STATE evidence are not complete.
```
