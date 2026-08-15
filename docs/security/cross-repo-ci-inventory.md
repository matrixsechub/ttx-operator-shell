# Cross-repo CI inventory + credential gates (launch HOLD)

Status: **inventory + gates (Cursor)** · Operator owns CF/protection/secrets
Refs: ClickUp cross-repo CI lane · COC-24 / COC-25

## Inventory (accessible to this agent token at capture time)

| Repo | Visibility | Notes |
| --- | --- | --- |
| `matrixsechub/ttx-operator-shell` | public | Production deploy gate + MSHOPS artifact merge |
| `matrixsechub/GH0ST-LAY3R` | public | Separate product surface |
| `matrixsechub/ai-security-framework` | public | Evaluation framework |
| `matrixsechub/rag-pipeline-sandbox` | public | Evaluation sandbox |
| `matrixsechub/prompt-injection-detector` | public | Detector service |
| `matrixsechub/MSHOPS` | private | Storefront `build-final` artifact (not listable by this token; required by build) |

UNVERIFIED without Operator confirmation: additional private repos beyond MSHOPS.

## Baseline CI expectation (ttx-operator-shell)

Required PR checks (GHA):

- `pr-gate`
- `security-pr`
- `build-test / build-test`
- `wrangler-dry-run / wrangler-dry-run`

Not a merge gate (Operator dashboard): Cloudflare Workers Builds (prod/staging).

## Credential gates (fail-closed)

1. **No job-wide MSHOPS/GH_PAT env** on reusable PR CI or deploy jobs — enforced by `tests/ci/gh-pat-scope.test.mjs` + `scripts/ci/audit-workflow-triggers.mjs`.
2. **Prefer `MSHOPS_CHECKOUT_TOKEN`** over shared `GH_PAT` for storefront clone (see `docs/security/mshops-credential-isolation.md`).
3. **Production deploy** must not use `on.push`; CI-gated `workflow_run` or guarded `workflow_dispatch` only — `tests/ci/deploy-production-workflow.test.mjs`.
4. **CODEOWNERS** on `.github/workflows/**`, `.github/actions/**`, `scripts/ci/**` — Operator must enable “Require review from Code Owners” under branch protection (COC-25).

## Cross-repo gate recommendation

Until Operator expands token access for a full eight-repo inventory:

- Treat any private sibling clone as **fail-closed** without a dedicated checkout secret
- Do not reuse production Cloudflare deploy tokens for PR CI
- Keep PR CI on GitHub-hosted runners only (`ubuntu-latest`)

## Evidence to attach for Brain

- This inventory commit SHA
- Green `pr-gate` including `audit-workflow-triggers.mjs`
- Green `gh-pat-scope` + `deploy-production-workflow` tests
- Operator receipt for CF Workers Builds disable (separate tasks)
