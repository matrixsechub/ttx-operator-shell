# Operator Settings Checklist — `production` GitHub Environment

**Date:** 2026-09-17 (revalidated after F18 resolution) · **Required by:** `.github/workflows/deploy-production.yml` · **PR:** #43 (draft)

**Code-side production readiness is complete and verified.** Every code-side blocker, including F18, is closed. What remains is settings work only. Nothing below was done on your behalf: no environment, secret, variable, or repository setting was created, modified, read, or rotated by this session.

Until steps 1 to 3 are complete, a dispatched production deploy fails closed. That is the designed behavior, not a defect.

---

## 1. GitHub Environment

Repository → **Settings → Environments → New environment**. Name it exactly:

```
production
```

The spelling is asserted by `tests/ci/production-deploy-workflow.test.mjs`. Any other spelling silently detaches the approval gate.

**Required reviewer protection must be enabled.** In the `production` environment, turn on **Required reviewers** and add at least one human; two is better, so one person being unavailable cannot block a rollback. Leave **Wait timer** at 0. Set **Deployment branches and tags** to *Selected branches and tags* and allow `main` plus any release tag pattern you use.

Required reviewers **are** the approval gate. Without them the environment still scopes secrets, but no human approves anything.

---

## 2. Environment-scoped credentials

These three already exist at repository level. Copy each into the `production` environment with the same name and the same value.

| Credential | Used by | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | `deploy` job | Authorizes `wrangler deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy` job | Paired with the token |
| `GH_PAT` | `deploy` job | Clones the private MSHOPS storefront artifact |

**Do not rotate or modify any credential.** Do not regenerate, shorten, re-scope, or expose any value. Copy, verify with a successful dispatched deploy, and only then remove the repository-level copies if you want to. Rotating while re-scoping makes a failure ambiguous.

---

## 3. Environment variable

In the `production` environment add a **variable**, not a secret:

| Variable | Value |
|---|---|
| `PRODUCTION_BASE_URL` | `https://ttx-operator-shell.sogellagepul.workers.dev` |

**Why this is the smoke target.** It is the production Worker's own origin, declared as `ORIGIN_URL` in `wrangler.jsonc` and matching the worker `name: "ttx-operator-shell"`. It is the host that this repository's `wrangler deploy` actually mutates, so it is the only host whose response proves the deploy worked. The previous smoke probed `https://www.mshops.net/pearl-os`, a different property this workflow does not deploy, which is why it could pass while production was broken.

It is not a secret, and `scripts/lib/productionBaseUrl.mjs` independently hostname-allowlists it at a compile-time constant, so a typo or a malicious override fails closed instead of sending smoke traffic elsewhere. If you change the Worker's hostname you must change that constant too; the value is deliberately not overridable by environment alone.

---

## 4. Leave unchanged

Explicitly do not touch any of the following as part of this checklist.

| Area | Status |
|---|---|
| `staging` GitHub Environment and every secret in it | Unchanged. Already correct. |
| `STAGING_BASE_URL`, `STAGING_ACCESS_CLIENT_ID`, `STAGING_ACCESS_CLIENT_SECRET` | Unchanged |
| Repository variable `CLOUDFLARE_ACCOUNT_ID` used by `staging-deploy.yml` | Unchanged. Staging reads `vars.*`, production reads `secrets.*`. Keep both. |
| Any other repository variable or secret not named in section 2 | Unchanged |
| Branch protection on `main` | Unchanged |
| Cloudflare Access | Unchanged, and **do not add Access in front of the production Worker**. The production smoke deliberately sends no Access service-token headers, so adding Access would make every smoke run fail. |
| DNS, domains, custom domains, routes | Unchanged. No route or custom-domain block exists in any `wrangler*.jsonc`; deployment uses the `workers.dev` origin. |
| D1 | Unchanged. No D1 binding exists in this repository. Do not add one here. |
| Application secrets: `OPERATOR_CALLSIGN`, `OPERATOR_PASSWORD_HASH`, `AUTH_SIGNING_KEY`, `OPERATOR_SECRET`, `MARKETPLACE_SECRET`, `HARNESS_SECRET` | Unchanged. These are Worker secrets set with `wrangler secret put`, unrelated to GitHub environment configuration. |
| KV namespace IDs, Durable Object bindings, `wrangler.jsonc` | Unchanged |

---

## 5. Expect two approval prompts per deploy

Both `deploy` and `production-smoke` declare `environment: production`, so with required reviewers GitHub asks you to approve twice: once before the deploy, once before the smoke that verifies it. `staging-deploy.yml` behaves the same way.

The smoke job needs the environment in order to read `PRODUCTION_BASE_URL`. If the second prompt proves annoying, the alternative is to define `PRODUCTION_BASE_URL` as a repository variable and drop `environment: production` from the smoke job only. That is a one-line workflow change plus a shape-test update, and it does not weaken the deploy gate because the deploy has already happened by then. Ask and I will make it. Do not simply delete the line; the shape test asserts it.

---

## 6. Verification sequence after you configure it

Run in order. Stop at the first surprise.

**Before dispatching anything, GitHub should visibly show:**

- Settings → Environments lists `production`, with a green **Required reviewers** entry naming at least one person.
- Opening `production` shows exactly three secrets, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GH_PAT`, and exactly one variable, `PRODUCTION_BASE_URL`.
- Actions → **Deploy Production** shows a **Run workflow** button with three inputs: `confirm_deploy`, `target_ref` (default `main`), `reason`. There must be **no** automatic run triggered by recent pushes to `main`.

**Then:**

1. **Negative trigger test.** Run the workflow with a deliberately wrong phrase, for example `DEPLOY_STAGING`. Expected: the `authorize` job fails with `confirm_deploy must be exactly "DEPLOY_PRODUCTION"`, and no other job runs. Nothing reaches Cloudflare.
2. **Real dispatch.** Run again with `DEPLOY_PRODUCTION` and `target_ref: main`. Expected: `authorize`, `preflight`, `build-test`, `production-dry-run` all pass, then the run **pauses** on `deploy` showing "Waiting for review".
3. **Approve the deploy.** Expected: MSHOPS clone, build, in-job pre-deploy dry run, `wrangler deploy`, then the `production-deploy-metadata` artifact appears.
4. **Approve the smoke.** Expected: `production-smoke` passes and uploads `production-smoke-report.json`. Open it and confirm `commit_sha` equals the commit you deployed and every check reads `PASS`.
5. **Confirm F4 is closed.** `curl -s https://ttx-operator-shell.sogellagepul.workers.dev/api/build-info` must report the real `commitSha`, not `unknown`, with `deployEnv: "production"`. This is what makes `ROLLBACK.md` step 1 executable again.
6. **Confirm the old path is gone.** Merge something harmless to `main` and confirm no production deploy starts.

**Reading failures:** if the smoke script exits before writing its report, for example because `PRODUCTION_BASE_URL` is unset or mistyped, the artifact upload also errors with "no files found". That is a second symptom of the same failure; read the smoke step's own error. `staging-deploy.yml` behaves identically.

If step 4 fails on a content assertion rather than a status code, the smoke route contracts, which are shared with staging, may not match production content. Report the failing check name. That is a contract question, not a deploy failure, and it is the one place where reusing the staging contracts is inferred rather than verified.

---

## 7. Known follow-ups, not part of this checklist

- `GH_PAT` is still interpolated into a clone URL inside the workflow (finding F12). Environment scoping reduces exposure but does not remove it from the runner's git config. A separate change should use `actions/checkout` with `repository:` and `token:`.
- Production reads `CLOUDFLARE_ACCOUNT_ID` from secrets while staging reads it from variables. Harmless, worth unifying later.
- `src/components/BootstrapErrorBoundary.tsx` currently has no importer anywhere in the repository. The F18 exception is correct regardless, but the component is not mounted, so the bootstrap error UI it provides is not actually reachable. Separate decision: wire it into the shell entrypoints or remove it.
