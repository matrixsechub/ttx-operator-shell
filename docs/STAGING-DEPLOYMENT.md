# Staging Deployment (Phase 2)

Operator-controlled, manual staging deployment via GitHub Actions. This workflow deploys **only** to the `ttx-operator-shell-staging` Worker. It does **not** deploy production.

## Architecture

### Phase 1 — CI Foundation

```
CI (push / pull_request on ubuntu-latest)
├── pr-gate
│   ├── workflow-permissions-lint
│   └── audit-action-pins
├── build-test (reusable)
│   ├── npm ci
│   ├── typecheck
│   ├── test
│   └── build
└── wrangler-dry-run (reusable)
    ├── verify:staging-config
    ├── build
    └── wrangler deploy --dry-run
```

### Phase 2 — Staging Deploy

```
Staging Deploy (workflow_dispatch only)
├── authorize
│   ├── confirm_deploy === DEPLOY_STAGING
│   └── resolve target_ref → immutable commit SHA
├── preflight
│   ├── workflow-permissions-lint
│   ├── audit-action-pins
│   └── verify-staging-config
├── build-test (reusable, pinned SHA)
├── staging-dry-run (reusable, pinned SHA)
├── deploy-staging (GitHub Environment: staging)
│   ├── verify-staging-config
│   ├── typecheck → test → build
│   ├── wrangler deploy --env staging --dry-run
│   └── wrangler deploy --env staging
├── staging-smoke (read-only GET/HEAD checks)
└── evidence
    └── upload staging-release-evidence (14 days)
```

**Boundaries**

- PR workflows never reference the `staging` GitHub Environment or Cloudflare secrets.
- Organizer schedule remains self-hosted operational tooling only.
- Production deploy (`npm run deploy`, unqualified `wrangler deploy`) is excluded from this workflow.

## Required GitHub Configuration

Create a GitHub **Environment** named `staging` in repository settings. Source code cannot create this environment.

### Secrets (staging Environment)

| Name | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Staging-scoped Cloudflare API token |

### Variables (staging Environment)

| Name | Example | Purpose |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | *(account id)* | Wrangler account binding |
| `STAGING_BASE_URL` | `https://ttx-operator-shell-staging.sogellagepul.workers.dev` | Smoke-test base URL |

### Optional

- **Required reviewers** on the `staging` environment for manual approval before `deploy-staging`.
- **Deployment branch rules** limiting which refs may deploy (recommend `main` only after first successful manual runs).

## Cloudflare Token Guidance

Create a token scoped to the minimum permissions required for `wrangler deploy --env staging`:

- **Account** → Workers Scripts → Edit (staging script only, if your Cloudflare plan supports script-scoped tokens)
- **Account** → Workers KV Storage → Edit (staging namespace IDs only)
- **Account** → Workers R2 / Durable Objects** → Edit only if your staging bindings require runtime changes

Do **not** use production-only tokens. Do **not** grant account-wide superuser access beyond deployment needs.

Wrangler also needs `CLOUDFLARE_ACCOUNT_ID` as a variable (not a secret).

## Deployment Procedure

1. Confirm Phase 1 checks are green on the target commit (`pr-gate`, `build-test`, `wrangler-dry-run`, `security-pr`).
2. Open **Actions** → **Staging Deploy**.
3. Click **Run workflow**.
4. Set `confirm_deploy` to exactly `DEPLOY_STAGING`.
5. Set `target_ref` to an approved branch, tag, or full commit SHA (default: `main`).
6. Optionally enter `reason` for audit logs.
7. Review the `authorize` job output for the resolved commit SHA.
8. Approve the `staging` environment if required reviewers are configured.
9. Monitor `deploy-staging` and `staging-smoke`.
10. Download the `staging-release-evidence` artifact.

## Failure Handling

| Symptom | Likely cause | Action |
|---|---|---|
| `confirm_deploy must be exactly "DEPLOY_STAGING"` | Wrong confirmation string | Re-run with exact phrase |
| `unable to resolve target_ref` | Invalid branch/tag/SHA | Use a ref that exists in this repository |
| `unsafe target_ref` | PR merge ref or pull ref | Deploy `main` or a commit SHA, not `pull/N/merge` |
| `STAGING_CONFIG::FAIL` | Wrangler misconfiguration | Run `npm run verify:staging-config` locally |
| Identical KV IDs | Staging shares production namespaces | Provision separate staging KV namespaces |
| Missing `CLOUDFLARE_API_TOKEN` | Secret not set on `staging` environment | Add staging-scoped token |
| Wrangler auth failure | Invalid token or account id | Rotate token; verify `CLOUDFLARE_ACCOUNT_ID` |
| Smoke `FAIL` on routes | Propagation delay or bad deploy | Re-run smoke; check Worker logs |
| Security header `WARNING` | Non-critical header absent | Review; fix in app if policy requires |
| Propagation timeout | Edge cache / DNS delay | Wait and re-run `staging-smoke` only |

## Branch Protection Checks

Require these status checks on `main` (exact job names may vary slightly in GitHub UI):

| Check | Workflow |
|---|---|
| `pr-gate` | CI |
| `build-test` | CI |
| `wrangler-dry-run` | CI |
| `security-pr` | Security PR |

Staging Deploy is **not** a merge gate in Phase 2 — it is manual post-merge validation.

## Automatic Staging (not enabled)

Do **not** enable push-to-main automatic staging until:

- At least one successful manual staging deployment
- Green smoke-test evidence retained
- Stable staging configuration (`verify:staging-config` consistently passes)
- Branch protection enforces Phase 1 checks
- Explicit operator authorization to automate

## Local Validation

```bash
node scripts/ci/workflow-permissions-lint.mjs
node scripts/ci/audit-action-pins.mjs
npm run verify:staging-config
npm run typecheck
npm test
npm run build
npx wrangler deploy --env staging --dry-run --outdir dist-staging-dryrun
```

Read-only smoke (against live staging, no credentials):

```bash
STAGING_BASE_URL=https://ttx-operator-shell-staging.sogellagepul.workers.dev \
COMMIT_SHA=$(git rev-parse HEAD) \
npm run test:staging-smoke
```

## Evidence Artifact

| Property | Value |
|---|---|
| Artifact name | `staging-release-evidence` |
| Retention | 14 days |
| Files | `release-metadata.json`, `validation-summary.json`, `staging-smoke-report.json`, `build-manifest.json` (when present), `checksums.txt` |

No secrets, tokens, or authentication headers are included in evidence files.

## Phase 3 Entry Gate

Phase 3 (production deployment) may begin only when:

- Phase 1 required checks are green on `main`
- `verify:staging-config` passes
- At least one manual staging deployment succeeded
- Post-deployment smoke tests succeeded
- Release evidence was uploaded and retained
- No Critical or High staging/production isolation issue remains

See [RELEASE.md](./RELEASE.md) for the production promotion checklist.
