# ARCH_PREVIEW_EVIDENCE - PR #7

Generated: 2026-07-16T00:18:00-06:00
Repository: `matrixsechub/ttx-operator-shell`
Branch: `codex/hsx-scope-gate-validation`
PR: `#7`
Disposition: `FAIL_CLOSED_CONFIRMED_AUTHENTICATED_BLOCKED`

## CI and Version Evidence

PR #7 status checks are green:

```text
pr-gate: success
security-pr: success
build-test / build-test: success
wrangler-dry-run / wrangler-dry-run: success
Workers Builds: ttx-operator-shell: success
```

Latest inspected Worker version:

```text
Version id: 4eaae44e-6a10-43bb-abb3-7627f886b581
Commit: 73e76669
Alias: codex-hsx-scope-gate-validation
has_preview: false
```

Because `has_preview` is false, no separate Worker preview URL was available from Wrangler for authenticated smoke.

## Fail-Closed Probe

Safe unauthenticated probe against the live Worker route:

```text
POST https://ttx-operator-shell.sogellagepul.workers.dev/api/governance/hsx/scope-gate/evaluate
HTTP/1.1 401 Unauthorized

{"error":"Operator authentication required","code":"OPERATOR_AUTH_REQUIRED"}
```

This confirms unauthenticated access is rejected before evaluation.

## Authenticated Preview Probe

Not completed.

Blockers:

```text
N8N_WEBHOOK_SECRET is missing from inspected staging secret names.
No approved operator bearer token value was available locally.
No distinct Worker preview URL was exposed by the inspected Worker version.
```

Required rerun after Preview/Staging secret and endpoint are available:

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

Representative audit event expected in Worker logs and `TTX_STATE`:

```json
{
  "name": "hsx.scope_gate.approved",
  "packet_id": "<redacted>",
  "decision_id": "<redacted>",
  "outcome": "approved",
  "reason_code": "SCOPE_GATE_APPROVED"
}
```

## Local Validation Evidence

```text
node --import tsx --test tests/hsxScopeGate.test.ts tests/governanceEnforcement.test.ts tests/governanceRoutes.test.ts
Result: pass, 24/24

npm run typecheck
Result: pass

git diff --check
Result: pass
```
