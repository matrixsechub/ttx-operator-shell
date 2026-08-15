# CI hardening pack (launch HOLD)

Mission refs: COC-24 / COC-25. Release state: **HOLD**.

## Cursor-owned (this PR)

| Lane | Artifact |
| --- | --- |
| CODEOWNERS | `.github/CODEOWNERS` |
| Workflow contract tests | `tests/ci/workflow-contract.test.mjs`, `scripts/ci/workflow-contract-lint.mjs` |
| Trigger trust | Deploy production must use `workflow_run` success on `main` + manual `DEPLOY_PRODUCTION` (no push auto-deploy) |
| MSHOPS clone isolation (TTX) | Inherited from PR #31 head `f1b7c6d4` + `tests/ci/gh-pat-scope.test.mjs` |
| Baseline CI template | `docs/ci/baseline-ci.yml` (fail-closed; no `\|\| echo` soft fails) |
| Cross-repo credential inventory | `docs/ci/cross-repo-credential-inventory.json` |

## Blocked without Operator / repo switch

- Cloudflare Workers Builds disable (prod + staging) + closure proof
- Exact-head approval + branch protection receipts
- Governed runtime deploy / smoke / provenance receipts
- **MSHOPS** Claude-review token split / permission reduction (private repo unavailable in this agent)

## Stop conditions

No merge, deploy, Cloudflare mutation, or secret mutation until Operator action and Brain re-verdict.
