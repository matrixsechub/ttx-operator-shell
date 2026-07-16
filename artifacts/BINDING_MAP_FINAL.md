# BINDING_MAP_FINAL - PR #7

Repository: `matrixsechub/ttx-operator-shell`
Target PR: `#7`
Scope: HSX scope-gate and signed-governance runtime bindings

## Runtime Bindings

| Binding | Type | Environment | Source | Purpose |
|---|---|---|---|---|
| `TTX_STATE` | KV namespace | Preview/Staging/Production | `wrangler.jsonc` | HSX decision storage, telemetry event storage, governance proposals and receipts |
| `RECEIPT_AUTHORITY` | Durable Object | Preview/Staging/Production | `wrangler.jsonc` | Single-use approval receipt reserve/consume authority |
| `AUTH_REVOCATION` | KV namespace | Preview/Staging/Production | `wrangler.jsonc` | Existing operator auth revocation |
| `WEBHOOK_EVENTS` | KV namespace | Preview/Staging/Production | `wrangler.jsonc` | Existing webhook storage |
| `SECURITY_EVENTS` | KV namespace | Preview/Staging/Production | `wrangler.jsonc` | Existing security event storage |
| `HARNESS` | Service binding | Preview/Staging/Production | `wrangler.jsonc` | Existing harness service binding |

## Secret Map

| Secret | Preview | Production | Required For | Notes |
|---|---:|---:|---|---|
| `N8N_WEBHOOK_SECRET` | yes | yes, after approval | n8n-to-HSX route auth | Header is `X-N8N-Webhook-Secret`; the secret name is `N8N_WEBHOOK_SECRET`. |
| `AUTH_SIGNING_KEY` | yes | yes | operator bearer token auth | Existing operator auth requirement. |
| `GOVERNANCE_RECEIPT_SIGNING_KEY` | yes | yes | signed approval receipts | Do not rely on `AUTH_SIGNING_KEY` fallback outside development. |
| `BEACON_SIGNING_KEY` | yes | yes | signed Beacon v2 verification | Do not rely on `AUTH_SIGNING_KEY` fallback outside development. |
| `OPERATOR_BOOTSTRAP_TOKEN` | no | no | not used by PR #7 | Not referenced by HSX scope gate. Do not provision for this PR. |
| `TELEMETRY_RATE_LIMIT_SALT` | not required by PR #7 | not required by PR #7 | MSHOPS telemetry PR #21 | Coordinate separately with Ghost telemetry recovery. |

## Cloudflare Dashboard Steps

1. Open Cloudflare Dashboard.
2. Go to Workers & Pages.
3. Select Worker service `ttx-operator-shell`.
4. Open Settings.
5. Open Variables and Secrets.
6. Under Preview/Staging environment, add or verify:
   - `N8N_WEBHOOK_SECRET`
   - `AUTH_SIGNING_KEY`
   - `GOVERNANCE_RECEIPT_SIGNING_KEY`
   - `BEACON_SIGNING_KEY`
7. Under Production environment, add or verify the same secrets only after operator approval.
8. Do not add `OPERATOR_BOOTSTRAP_TOKEN` for PR #7.

## Wrangler CLI Commands

Preview/Staging:

```powershell
npx wrangler secret put N8N_WEBHOOK_SECRET --env staging
npx wrangler secret put AUTH_SIGNING_KEY --env staging
npx wrangler secret put GOVERNANCE_RECEIPT_SIGNING_KEY --env staging
npx wrangler secret put BEACON_SIGNING_KEY --env staging
```

Production:

```powershell
npx wrangler secret put N8N_WEBHOOK_SECRET
npx wrangler secret put AUTH_SIGNING_KEY
npx wrangler secret put GOVERNANCE_RECEIPT_SIGNING_KEY
npx wrangler secret put BEACON_SIGNING_KEY
```

## Verification

```powershell
npx wrangler secret list --env staging
npx wrangler secret list
```

Expected: secret names are present. Do not print secret values.

Signed: Architect
