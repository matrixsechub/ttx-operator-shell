# MSHOPS credential isolation (launch HOLD)

Status: **code-ready / Operator-owned secret mutation**
Refs: ClickUp MSHOPS review tokens lane · COC-24 · PR #31 least-privilege

## Goal

Private MSHOPS storefront clones must use a **dedicated, least-privilege** credential — not a broad `GH_PAT` shared with other automation — and that credential must never appear in job-wide CI env.

## Current code contract (already enforced)

- Clone only via `.github/actions/checkout-mshops-artifact` with `persist-credentials: false`
- Token is an action `token:` input to `actions/checkout` only
- Later steps run `scripts/ci/assert-no-mshops-token.mjs` (rejects `GH_PAT`, `MSHOPS_CHECKOUT_TOKEN`, `INPUT_TOKEN`, …)
- `scripts/build.mjs` refuses credential-based clone under `GITHUB_ACTIONS`
- Regression tests: `tests/ci/gh-pat-scope.test.mjs`

## Operator split (no Cursor secret mutation)

1. Create repo secret `MSHOPS_CHECKOUT_TOKEN` with a fine-grained PAT / GitHub App token that can **only** read `matrixsechub/MSHOPS` (contents: read).
2. Leave or rotate `GH_PAT` so it is **not** required for MSHOPS clone once the dedicated token exists.
3. Confirm CI call sites resolve `secrets.MSHOPS_CHECKOUT_TOKEN || secrets.GH_PAT` (wired in workflows).
4. Capture evidence: Actions log for clone step shows `token: ***` only on checkout-mshops-artifact; assert steps print `OK: no MSHOPS credential env vars visible`.

## Prove isolation checklist

- [ ] Job `env:` blocks in reusable build/dry-run/deploy contain no credential keys
- [ ] `npm ci` / `npm test` run before clone on PR CI
- [ ] Post-clone assert steps succeed
- [ ] `node --test tests/ci/gh-pat-scope.test.mjs` passes
- [ ] Dedicated token cannot write to `ttx-operator-shell` (Operator permission review)

## Stop conditions

Cursor must not run `gh secret set` / `wrangler secret put` / Cloudflare dashboard mutations.
