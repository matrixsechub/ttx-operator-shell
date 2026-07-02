# Rollback

This Worker deploys via `wrangler`, which tracks deployment versions natively — there is no
custom checkpoint system in this repo, and none should be added. Use the real Cloudflare Workers
versioning model directly.

## View deployment history

```bash
wrangler deployments list
```

Shows recent deployments for `ttx-operator-shell` (or pass `--env staging` for the staging Worker),
newest first, with deployment IDs.

## Roll back

```bash
wrangler rollback [deployment-id]
```

Rolls the Worker back to a previous deployment. Omit the ID to roll back to the previous
deployment. This takes effect immediately — no build step required, since it re-activates an
already-deployed version.

## After a rollback

1. Confirm the rollback took effect: hit the production URL and check behavior/version.
2. Investigate and fix the issue that triggered the rollback before re-deploying `main`.
3. If the issue was caught by CI (`.github/workflows/ci.yml`) after the fact, consider whether a
   check is missing that should have caught it before merge.

## Staging rollback

Same commands, scoped to the staging environment:

```bash
wrangler deployments list --env staging
wrangler rollback [deployment-id] --env staging
```
