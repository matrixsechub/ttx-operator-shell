# ARCH_PREVIEW_EVIDENCE_UPDATED - PR #7

Generated: 2026-07-16T00:35:00-06:00
Repository: `matrixsechub/ttx-operator-shell`
Branch: `codex/hsx-scope-gate-validation`
Commit: `7575729547aa3b82496e9a95765e5f51da9638cc`
Disposition: `CI_GREEN_RUNTIME_AUTH_BLOCKED`

## Current PR State

PR #7 checks are green:

```text
pr-gate: success
security-pr: success
build-test / build-test: success
wrangler-dry-run / wrangler-dry-run: success
Workers Builds: ttx-operator-shell: success
```

Latest inspected Worker version:

```text
Version: e226af92-ef7a-4e8a-a9ab-1b4165535ce1
Commit: 75757295
Alias: codex-hsx-scope-gate-validation
has_preview: false
```

## Local Validation

```text
node --import tsx --test tests/hsxScopeGate.test.ts tests/governanceEnforcement.test.ts tests/governanceRoutes.test.ts
Result: pass, 24/24

npm run typecheck
Result: pass

git diff --check
Result: pass
```

## Runtime Binding Status

Staging secret-name list contains:

```text
AUTH_SIGNING_KEY
BEACON_SIGNING_KEY
GOVERNANCE_RECEIPT_SIGNING_KEY
LIVE_SESSION_SECRET
OPERATOR_CALLSIGN
OPERATOR_PASSWORD_HASH
```

Staging missing:

```text
N8N_WEBHOOK_SECRET
```

Production secret-name list contains:

```text
AUTH_SIGNING_KEY
OPERATOR_CALLSIGN
OPERATOR_PASSWORD_HASH
TTX_EXPORT_SIGNING_KEY
WEBHOOK_SECRET
```

Production missing:

```text
N8N_WEBHOOK_SECRET
GOVERNANCE_RECEIPT_SIGNING_KEY
BEACON_SIGNING_KEY
```

## Authenticated Runtime Smoke

Not completed.

Blockers:

- `N8N_WEBHOOK_SECRET` is not present in staging.
- No approved operator bearer token was available to Codex.
- Inspected Worker version reports `has_preview: false`, so Codex did not have a separate preview URL.

Required after Operator action:

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
