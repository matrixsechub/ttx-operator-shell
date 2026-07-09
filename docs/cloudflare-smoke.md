# Cloudflare Smoke Commands

Use `wrangler.jsonc` for production-safe validation and deploy workflows.

- Local smoke: `npm run smoke:worker:local`
- Remote preview smoke: `npm run smoke:worker:remote`
- Production dry-run: `npm run smoke:worker:dry-run`

Use `wrangler.remote-preview.jsonc` only for `wrangler dev --remote` smoke testing.

That preview config intentionally omits `routes` because this repository currently hits a global `502` in Cloudflare remote preview when production `routes` are present.

This does not change production routing, bindings, KV namespaces, secrets, or deployment topology.
