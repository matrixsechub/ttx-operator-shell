# ARCH_BINDING_CONFIRM - PR #7

Generated: 2026-07-16T00:18:00-06:00
Repository: `matrixsechub/ttx-operator-shell`
Branch: `codex/hsx-scope-gate-validation`
PR: `#7`
Disposition: `BINDINGS_PARTIAL_RUNTIME_CONFIRMED`

## Runtime Binding Evidence

| Binding | Evidence | Status |
| --- | --- | --- |
| `TTX_STATE` | `wrangler.jsonc` defines production and staging KV bindings; `worker/hsxScopeGate/store.ts:47-50` writes decisions and telemetry | Present |
| `RECEIPT_AUTHORITY` | Existing Durable Object binding in Worker config and approval verifier path | Present |
| `N8N_WEBHOOK_SECRET` | `worker/hsxScopeGate/route.ts:6-12` reads `env.N8N_WEBHOOK_SECRET` | Code present; staging/prod secret name missing |
| `AUTH_SIGNING_KEY` | Existing operator auth requirement | Staging/prod secret names present |
| `GOVERNANCE_RECEIPT_SIGNING_KEY` | Required for signed approval receipts | Staging present; production missing |
| `BEACON_SIGNING_KEY` | Required for signed Beacon v2 | Staging present; production missing |

## Current Secret-Name Evidence

`npx wrangler secret list --env staging` shows:

```text
AUTH_SIGNING_KEY
BEACON_SIGNING_KEY
GOVERNANCE_RECEIPT_SIGNING_KEY
LIVE_SESSION_SECRET
OPERATOR_CALLSIGN
OPERATOR_PASSWORD_HASH
```

Missing in staging:

```text
N8N_WEBHOOK_SECRET
```

`npx wrangler secret list` shows:

```text
AUTH_SIGNING_KEY
OPERATOR_CALLSIGN
OPERATOR_PASSWORD_HASH
TTX_EXPORT_SIGNING_KEY
WEBHOOK_SECRET
```

Missing in production:

```text
N8N_WEBHOOK_SECRET
GOVERNANCE_RECEIPT_SIGNING_KEY
BEACON_SIGNING_KEY
```

## Cloudflare Worker UI Steps

1. Open Cloudflare Dashboard.
2. Go to `Workers & Pages`.
3. Select Worker service `ttx-operator-shell`.
4. Open `Settings`.
5. Open `Variables and Secrets`.
6. Select the Preview/Staging environment.
7. Add encrypted secret:
   - `N8N_WEBHOOK_SECRET=<secret value>`
8. Verify existing Preview/Staging secrets:
   - `AUTH_SIGNING_KEY`
   - `GOVERNANCE_RECEIPT_SIGNING_KEY`
   - `BEACON_SIGNING_KEY`
9. Select Production only after operator approval.
10. Add or verify:
   - `N8N_WEBHOOK_SECRET`
   - `AUTH_SIGNING_KEY`
   - `GOVERNANCE_RECEIPT_SIGNING_KEY`
   - `BEACON_SIGNING_KEY`

## Wrangler Command Reference

Use interactive prompts. Do not pass secret values as command arguments.

```powershell
npx wrangler secret put N8N_WEBHOOK_SECRET --env staging
npx wrangler secret put AUTH_SIGNING_KEY --env staging
npx wrangler secret put GOVERNANCE_RECEIPT_SIGNING_KEY --env staging
npx wrangler secret put BEACON_SIGNING_KEY --env staging
npx wrangler secret list --env staging
```

Production, only after approval:

```powershell
npx wrangler secret put N8N_WEBHOOK_SECRET
npx wrangler secret put GOVERNANCE_RECEIPT_SIGNING_KEY
npx wrangler secret put BEACON_SIGNING_KEY
npx wrangler secret list
```

## Binding Decision

HSX code binding is correct, but Preview/Staging authenticated validation is blocked until `N8N_WEBHOOK_SECRET` is provisioned or an approved operator bearer token is supplied.
