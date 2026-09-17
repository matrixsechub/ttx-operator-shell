# Operator Settings Checklist — `production` GitHub Environment

**Date:** 2026-09-17 · **Required by:** `.github/workflows/deploy-production.yml` (Task 5) · **PR:** #43 (draft)

The code side of Task 5 is complete and merged onto the PR branch. **The workflow cannot deploy until you perform the settings below.** Nothing here was done on your behalf: no environment, secret, variable, or repository setting was created or changed by this session.

Until you complete steps 1 to 4, a dispatched production deploy will reach the `deploy` job and then fail closed, either waiting for an approval that no reviewer can give or erroring on a missing credential. That is the intended behavior, not a defect.

## 1. Create the environment

GitHub → repository → **Settings → Environments → New environment** → name it exactly:

```
production
```

The name is asserted by `tests/ci/production-deploy-workflow.test.mjs`; any other spelling silently detaches the approval gate.

## 2. Required reviewers (this is the approval gate)

In the `production` environment:

- Enable **Required reviewers** and add at least one human (yourself, and ideally a second person so a single unavailable reviewer cannot block a rollback).
- Leave **Wait timer** at 0 unless you want an enforced cool-off.
- Set **Deployment branches and tags** to *Selected branches and tags* and allow `main` plus any release tag pattern you use. This is defense in depth: the workflow already resolves and pins a commit SHA, but this stops a dispatch against an unreviewed branch.

Without a required reviewer the environment still scopes secrets, but there is **no human approval step**. The gate is the reviewer, not the environment.

## 3. Move credentials to environment scope

Currently repository-level. Re-create each one inside the `production` environment, then delete the repository-level copy only after a successful dispatched deploy.

| Secret | Why it moves | Used by |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Grants Worker deploy rights; must not be readable by every workflow | `deploy` job |
| `CLOUDFLARE_ACCOUNT_ID` | Paired with the token | `deploy` job |
| `GH_PAT` | Clones the private MSHOPS storefront artifact | `deploy` job |

Do **not** rotate these while moving them. Rotation is a separate decision, and rotating and re-scoping at once makes a failure ambiguous.

## 4. Environment variable

In the `production` environment, add a **variable** (not a secret):

| Variable | Value |
|---|---|
| `PRODUCTION_BASE_URL` | `https://ttx-operator-shell.sogellagepul.workers.dev` |

It is not a secret, and the smoke script independently hostname-allowlists it, so a typo or a malicious override fails closed rather than sending smoke traffic elsewhere. The value must match `ORIGIN_URL` in `wrangler.jsonc`.

## 5. What stays at repository level

Leave these alone. They are used by workflows that must run without production approval.

| Setting | Scope | Reason |
|---|---|---|
| `staging` environment and its secrets | Environment: `staging` | Already correct |
| `STAGING_BASE_URL`, `STAGING_ACCESS_CLIENT_ID`, `STAGING_ACCESS_CLIENT_SECRET` | `staging` | Unchanged by this work |
| `CLOUDFLARE_ACCOUNT_ID` as a repository **variable** (used by `staging-deploy.yml`) | Repository | Staging reads `vars.CLOUDFLARE_ACCOUNT_ID`; production reads `secrets.CLOUDFLARE_ACCOUNT_ID`. Keep both until you decide to unify them. |
| Branch protection on `main` | Repository | Untouched |

## 6. What NOT to change

- Do not delete the `staging` environment or its secrets.
- Do not add Cloudflare Access in front of the production Worker. The production smoke deliberately sends no Access service-token headers; adding Access would make every smoke run fail.
- Do not edit `wrangler.jsonc`, KV or Durable Object binding IDs, or any Worker secret as part of this checklist.
- Do not rename the environment after the first successful deploy.

## 6b. Expect two approval prompts per deploy

Both the `deploy` job and the `production-smoke` job declare `environment: production`, so with required reviewers GitHub will ask you to approve **twice**: once before the deploy and once before the smoke that verifies it. This mirrors `staging-deploy.yml`, where `deploy-staging` and `staging-smoke` are both bound to the `staging` environment.

This is deliberate but not free. The smoke job needs the environment in order to read `PRODUCTION_BASE_URL`. If the second prompt is annoying in practice, the alternative is to define `PRODUCTION_BASE_URL` as a **repository** variable instead and drop `environment: production` from the smoke job only. That is a one-line workflow change plus a shape-test update; it does not weaken the deploy gate, because the deploy has already happened by then. Tell me if you want it and I will make the change. Do not simply delete the line, because the shape test asserts it.

## 7. Verification after you configure it

Run these in order. Stop at the first surprise.

1. **Dry the trigger.** Actions → Deploy Production → Run workflow. Enter a deliberately wrong phrase, for example `DEPLOY_STAGING`. Expected: the `authorize` job fails with `confirm_deploy must be exactly "DEPLOY_PRODUCTION"`, and nothing else runs.
2. **Real dispatch.** Run again with `DEPLOY_PRODUCTION` and `target_ref: main`. Expected: `authorize`, `preflight`, `build-test`, `production-dry-run` all pass, then the run pauses on `deploy` awaiting your review.
3. **Approve.** Expected: build, in-job dry run, deploy, metadata artifact.
4. **Smoke.** Expected: `production-smoke` passes and uploads `production-smoke-report.json`. Open the artifact and confirm `commit_sha` matches the deployed commit and every check reads `PASS`.
5. **Confirm F4 is closed.** `curl -s https://ttx-operator-shell.sogellagepul.workers.dev/api/build-info` should report the real `commitSha`, not `unknown`, and `deployEnv: "production"`. This is what makes `ROLLBACK.md` step 1 executable again.
6. **Confirm the old path is gone.** Merge something harmless to `main` and confirm no production deploy starts.

If the smoke script exits before writing its report, for example because `PRODUCTION_BASE_URL` is unset or mistyped, the artifact upload step will also error with "no files found". That is a second symptom of the same failure, not a separate problem; read the smoke step's own error. `staging-deploy.yml` behaves identically.

If step 4 fails on a content assertion rather than a status code, the smoke route contracts (shared with staging) may not match production content. Report the failing check name; that is a contract question, not a deploy failure, and it is the one place where reusing the staging contracts is INFERRED rather than VERIFIED.

## 8. Known follow-ups not covered here

- `GH_PAT` is still interpolated into a clone URL inside the workflow (finding F12). Scoping it to the environment reduces exposure but does not remove it from the runner's git config. A separate change should use `actions/checkout` with `repository:` and `token:`.
- Production reads `CLOUDFLARE_ACCOUNT_ID` from secrets while staging reads it from variables. Harmless, but worth unifying later.
