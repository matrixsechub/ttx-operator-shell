# Security Decision Packet — F1 and F3

**Date:** 2026-09-14 · **Branch:** `claude/eloquent-heisenberg-p2i54y` · **PR:** #43 (draft) · **Source:** `docs/security/AUTH-SESSION-REVIEW.md`
**Status:** F1 DECIDED AND REMEDIATED ON BRANCH (options A + C, 2026-09-14; see §F1 remediation record). F3 still DECISION REQUIRED. No worker code, wrangler config, secrets, Beacon, scope-lock, or workflow behavior changed in this turn.

Evidence labels: VERIFIED (read and/or executed here), INFERRED (follows from code plus documented platform behavior), UNKNOWN (not determinable from this repo).

---

## F1 — Credential-less operator-class token at `POST /api/operator/session`

### CURRENT_BEHAVIOR (VERIFIED)

Request flow, in the order `worker/index.ts` executes it for any `/api/*` request:

```
1. handleOperatorAuth        index.ts:211  gate.ts:24-58   POST /api/operator/auth    -> needs OPERATOR_PASSWORD  -> edge token
2. handleOperatorSession     index.ts:213  gate.ts:64-91   POST /api/operator/session -> NO CREDENTIALS           -> edge token
3. hsx / marketplace public  index.ts:215-219
4. edgeAuthGate              index.ts:220  gate.ts:97-141
     classifyRoute(path)  routeClass.ts:18-68
       "public"      -> gate passes (null); continue to step 5
       "operator"    -> requires Bearer verifying under OPERATOR_SECRET || AUTH_SIGNING_KEY (sig + exp only) -> else 401/403
       "marketplace" -> same, plus ctx-hash (ip+UA) binding
5. enforceOperatorApiAuth    index.ts:248  apiAuth.ts:79-104
     returns null (no check) when routeClass !== "public"        <- operator-class routes skip System A here
     for "public" class: allowlisted -> pass; otherwise requires auth.ts access token (type:"access") -> else 401
6. enforceCockpitSession     index.ts:254  kernel.ts:296-330   only /api/ops/*; requires auth.ts token + SessionDO
7. route handlers            index.ts:266-560
8. proxyToEngine             index.ts:561, 632-660   any /api/* not handled above is forwarded to ENGINE_API_URL
                                                      with the client's original headers (Authorization included)
```

The token from step 2 is `{ sub: "operator", iat, exp: +3600 }` signed with `OPERATOR_SECRET`, falling back to `AUTH_SIGNING_KEY` (`gate.ts:13-15`). It has no `type` claim, so `auth.ts` rejects it (`getAccessTokenOperator`, `auth.ts:214`). It satisfies step 4 for every path matched by `OPERATOR_PROTECTED` (`routeClass.ts:3-14`) and `GET /api/engagements/*` (`routeClass.ts:65`).

### EXPOSURE (per route, with the unauthenticated bootstrap token)

| Route (class `operator`) | Handler | Second gate? | Result with bootstrap token | Evidence |
|---|---|---|---|---|
| `POST /api/governance/propose`, `/approve` | `backbone.ts` | Yes: `hasValidAccessToken` (System A) | **Blocked** 401 | VERIFIED (`cockpitSessionBoundary.test.ts` GOVERNANCE_MUTATION_UNAUTHENTICATED_DENIED) |
| `/api/ops/*` (not operator class, listed for completeness) | kernel | `enforceCockpitSession` (System A) | **Blocked** | VERIFIED |
| `GET /api/wildcard` | `wildcardAdvancement.ts:139` | No | **Reachable**: health JSON | VERIFIED (`operatorAuth.test.ts:163`) |
| `POST /api/wildcard/scan` | `wildcardAdvancement.ts:146` | No (governance policy blocks only `WILDCARD_API_PATHS` = local-scenario import) | **Reachable**: triggers `runWildcardDiscoveryScan` | VERIFIED |
| `GET /api/fedgrade/health` | `fedgrade.ts:6` | No | **Reachable**: health JSON | VERIFIED |
| `GET /api/operator/ai-agent-builds`, `/security-remediation`, `/rag-architectures`, `/local-ai-deployments` | `fulfillmentAgentRoutes.ts:11-27, 375-384` | No | **Reachable**: `rows` derived from engagement submissions | VERIFIED reachable; row content INFERRED to be customer intake from public `POST /api/engagements/create` |
| `GET /api/operator/northstar-beacon-orders`, `/northstar-beacon-proposals` | `northstarBeaconRoutes.ts:198-202` | No | **Reachable**: order and proposal listings | VERIFIED reachable; sensitivity UNKNOWN |
| `GET /api/engagements/<anything except /status>` | none in worker | No | **Proxied to Engine** (step 8) with the bootstrap bearer | VERIFIED fall-through; Engine behavior UNKNOWN |
| `/api/debug/*`, `/api/audit/*`, `/api/lifecycle/advance/*`, `/api/marketplace/audit` | none in worker | No (`/api/lifecycle/advance` additionally blocked only when `SYSTEM_MODE=OPERATOR_BETA`, i.e. staging) | **Proxied to Engine** with the bootstrap bearer; in production `lifecycle/advance` is not mode-blocked | VERIFIED fall-through; Engine behavior UNKNOWN |

Two consequences the review did not state as sharply:

1. **Operator class is weaker than default class.** An unknown `/api/foo` path (default class) needs a System A token before it can reach the proxy. An unknown `/api/operator/foo` or `/api/debug/foo` path needs only the free bootstrap token. Classification as "operator" currently lowers the bar.
2. **The proxy forwards the bootstrap bearer to the Engine.** Whether `msh-ops-os-harness` treats `sub: "operator"` under the shared key as authority is UNKNOWN from this repo, and both staging and production point at the same harness (`wrangler.jsonc:17,78`).

Consumers of the bootstrap route inside this repo: none in `src/`, `public/`, `scripts/`, `pages-bind/`. References exist only in `worker/edge/gate.ts`, `worker/wildcardAdvancement.ts` (agent name string), and `tests/operatorAuth.test.ts:163`. `docs/STEP5-RECONCILIATION.md:39` records `POST /api/operator/auth` (the credentialed route) as the canonical addition. External consumers (live `mshops-public` worker, WILDCARD Cycle 1 tooling): UNKNOWN. VERIFIED by grep.

### MINIMUM_FIX (options, smallest first)

**Option A — Remove the credential-less bootstrap.** Delete `handleOperatorSession` (`gate.ts:60-91`) and its two wiring lines (`index.ts:213-214`); remove the `"/api/operator/session"` public carve-out at `routeClass.ts:20`. `POST /api/operator/auth` (credentialed, same token shape, `gate.ts:24-58`) remains the edge bootstrap. Roughly 35 lines removed, 0 added.

**Option B — Require credentials on the same route.** Make `handleOperatorSession` perform the `OPERATOR_USERNAME` / `OPERATOR_PASSWORD` check that `handleOperatorAuth` performs, then issue the token. Keeps the response shape (`operator_token`, `namespace`, `agent`, `expires_at`) for any external caller. Roughly 10 lines changed.

**Option C — Close the class gap (complements A or B; can also stand alone as containment).** In `apiAuth.ts:87-89`, stop returning early for `operator` class, so operator-class routes must also carry a System A access token unless allowlisted. One conditional removed. This also closes the "operator class is weaker than default class" inversion and the proxy forwarding of bootstrap bearers. Side effect: the credentialed edge token from `/api/operator/auth` would no longer suffice on its own for operator-class routes (System B token is not `type:"access"`), which is a behavior change for any System B client.

**Not proposed:** consolidating System A and System B, RBAC, multi-operator, MFA, moving revocation to the DO. Out of scope for this packet and barred by the scope-lock tension (F16).

### FILES_TOUCHED

| Option | Files | Nature |
|---|---|---|
| A | `worker/edge/gate.ts`, `worker/index.ts`, `worker/edge/routeClass.ts`, `tests/operatorAuth.test.ts` (rewrite case at :163 to assert 404/401), `tests/operatorAuth.security.test.ts` (flip `CURRENT_BEHAVIOR F1` and the F1 `todo` into passing assertions), `docs/security/AUTH-SESSION-REVIEW.md` (status) | deletion + test update |
| B | `worker/edge/gate.ts`, same two test files, review doc | small edit |
| C | `worker/apiAuth.ts`, `tests/apiAuth.test.ts` (add operator-class-requires-System-A case), `tests/operatorAuth.test.ts:163` (would now fail at the API-auth layer in an integration test; unit test of the gate alone still passes) | one conditional |

No wrangler, secret, Beacon, scope-lock, or workflow files in any option.

### REGRESSION_TESTS (design only; not written in this turn)

1. `POST /api/operator/session` without credentials → not 200 (A: 404 via fall-through, or 401; B: 401). Replaces `operatorAuth.test.ts:163`.
2. (B only) `POST /api/operator/session` with correct `OPERATOR_USERNAME`/`OPERATOR_PASSWORD` → 200 with the existing response shape.
3. Bootstrap-derived token (minted directly with `signToken` in the test, simulating a leaked or legacy token) presented to `GET /api/operator/ai-agent-builds` → with C: 401 from `enforceOperatorApiAuth`; without C: still admitted by the gate (documents residual risk if A/B are chosen alone).
4. System A access token on `GET /api/operator/ai-agent-builds` → admitted by both `edgeAuthGate` and `enforceOperatorApiAuth` (proves C does not lock out the real operator).
5. `POST /api/operator/auth` with credentials → 200 (unchanged path stays green).
6. Existing containment tests in `tests/operatorAuth.security.test.ts` stay green; the `CURRENT_BEHAVIOR F1` case is inverted, the F1 `todo` becomes a real assertion.
7. Full `npm test`, `npm run typecheck`.

### ROLLBACK

Single-commit revert on the PR branch (`git revert <sha>`); no data migration, no KV/DO schema, no secret rotation. Tokens already minted by the removed route expire within 1 h (`gate.ts:80`), so no cleanup is needed either way. Production is unaffected until the Operator merges and deploys.

### COMPATIBILITY_RISK

| Risk | Option | Level | Evidence |
|---|---|---|---|
| External caller depends on credential-less `/api/operator/session` | A | UNKNOWN; none in repo | grep of `src/`, `public/`, `scripts/`, `pages-bind/` |
| External caller depends on response shape | A | Low with B, Medium with A | B preserves shape |
| System B clients using `/api/operator/auth` tokens on operator-class routes | C | Medium: they would need a System A token | `apiAuth.ts:95` checks `type:"access"` |
| Existing test `operatorAuth.test.ts:163` | A, B | Certain: must be rewritten (it asserts the vulnerable behavior) | VERIFIED |
| Governance / cockpit / default-class routes | all | None: already require System A | VERIFIED |

### OPERATOR_DECISION_REQUIRED

1. Choose A (remove) or B (require credentials) for the bootstrap route. **Recommendation: A**, because the credentialed equivalent already exists, no in-repo consumer exists, and it is the smallest diff. Choose B only if an external WILDCARD Cycle 1 client is known to depend on the route.
2. Decide whether to apply C now. **Recommendation: yes**, because without C every current and future operator-class path (including proxied `/api/debug/*` and `/api/lifecycle/advance/*`) is gated only by a 1 h bearer with no revocation, and because C is the fix that actually restores fail-closed ordering. If System B clients must keep working on operator-class routes, defer C and record that as an accepted risk.
3. Confirm whether `msh-ops-os-harness` honors `sub:"operator"` tokens under the shared key (UNKNOWN here). If it does, treat F1 as P0 until A or B lands, and set a distinct `OPERATOR_SECRET` (secret operation, Operator only) so harness trust is not keyed to `AUTH_SIGNING_KEY`.
4. Authorize rewriting `tests/operatorAuth.test.ts:163`. It currently protects the vulnerability.

---

## F3 — Production deploy lacks approval and verification gates

### CURRENT_BEHAVIOR (VERIFIED)

`deploy-production.yml` (after the F2 pin fix in `68ed596`):

| Stage | Staging (`staging-deploy.yml`) | Production (`deploy-production.yml`) |
|---|---|---|
| Trigger | `workflow_dispatch` with `confirm_deploy` phrase + `target_ref` + `reason` | `push` to `main` (automatic) and bare `workflow_dispatch` |
| Authorization job | `scripts/ci/resolve-deploy-ref.mjs` validates phrase `DEPLOY_STAGING`, resolves SHA | none |
| Preflight lint | `workflow-permissions-lint`, `audit-action-pins`, `verify-staging-config` | none |
| Build + test | reusable `_reusable-build-test.yml` (typecheck, test, build) | `npm ci`, `npm run build` only. **No typecheck, no tests** |
| Dry run | reusable `_reusable-wrangler-dry-run.yml` + a second in-job `--dry-run` | none |
| GitHub Environment | `environment: staging` (secrets scoped; reviewers possible) | none. Secrets are repo-level |
| Deploy command | `wrangler deploy --env staging --var BUILD_COMMIT_SHA:… --var BUILD_TIMESTAMP:…` | `npx wrangler deploy` (no vars, so build identity is `unknown`, F4) |
| Smoke | `staging-smoke.mjs` against `STAGING_BASE_URL` with commit check; report artifact; job fails on failure | `curl` to `https://www.mshops.net/pearl-os`; **echo only, never fails**; wrong host for this Worker |
| Evidence | metadata + release-evidence artifacts | none |
| Action pins | SHA | SHA (fixed in F2) |
| Extra secret | none | `GH_PAT` in clone URL for `MSHOPS` sparse checkout (F12) |
| Node | 24 via `setup-node-npm` | 22 via `actions/setup-node` |

Note: `ci.yml` runs typecheck, test, and dry run on PRs and on push to `main`, but `deploy-production.yml` does not depend on it. Both fire on the same push; the deploy does not wait for CI. VERIFIED (`ci.yml:6-10`, `deploy-production.yml:6-10`, no `workflow_run` or `needs` linkage).

### EXPOSURE

- Any merge to `main` is an unattended production write with no human approval step. Contradicts the Operator-approval doctrine in `AGENTS.md` and `CLAUDE.md`.
- A commit that fails typecheck or tests can still deploy if it builds.
- A deploy that returns 5xx on this Worker passes the smoke step; nothing signals rollback.
- The production Worker cannot report its own commit (F4), so `ROLLBACK.md` step 1 ("check version") is not executable for production.

### MINIMUM_FIX (delta to `deploy-production.yml` only)

Written as the smallest set of edits, each independently revertible:

1. **Approval gate.** Add `environment: production` to the `deploy` job. Then, in repository settings (Operator action, not code), add required reviewers to the `production` environment and move `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GH_PAT` into environment scope. Code delta: 1 line. Settings delta: Operator.
2. **Explicit trigger.** Replace `on.push.branches: [main]` with `workflow_dispatch` inputs mirroring staging (`confirm_deploy`, `target_ref`, `reason`) and an `authorize` job. Reuse `scripts/ci/resolve-deploy-ref.mjs` after making `CONFIRM_PHRASE` configurable via env (today it is hardcoded `DEPLOY_STAGING`, `resolve-deploy-ref.mjs:7`), or add a sibling constant `DEPLOY_PRODUCTION`. Code delta: ~20 workflow lines + ~3 script lines + 1 test case in `tests/ci/resolve-deploy-ref.test.mjs`.
   *Alternative if the Operator wants to keep push-to-main deploys:* keep the `push` trigger but make the `deploy` job `needs` a `verify` job (item 3) and keep the environment gate from item 1. The environment reviewer prompt then becomes the approval.
3. **Typecheck, tests, dry run.** Add two jobs calling the existing reusable workflows exactly as staging does (`_reusable-build-test.yml`, `_reusable-wrangler-dry-run.yml`; both accept `ref` and `git_commit_sha`, both default to `github.sha`). Make `deploy` `needs: [build-test, wrangler-dry-run]`. Code delta: ~16 lines. No new scripts.
4. **Fail-closed smoke against the right target.** Replace the `curl` block with `node scripts/ci/staging-smoke.mjs "$PRODUCTION_BASE_URL" "$GITHUB_SHA"` where `PRODUCTION_BASE_URL` is a new repo/environment **variable** (not secret) set to `ORIGIN_URL` from `wrangler.jsonc` (`https://ttx-operator-shell.sogellagepul.workers.dev`). The script already fails the job on non-200 and checks the reported commit. Precondition: F4 must be fixed in the same change or the commit check will fail on `unknown`. Code delta: ~8 lines. Requires reading `scripts/ci/staging-smoke.mjs` to confirm it has no staging-only assumptions (UNKNOWN until read; `tests/ci/staging-smoke.test.mjs` exists).
5. **Build identity (F4, prerequisite for 4).** Change the deploy step to `npm run deploy` (`scripts/deploy-production.mjs` already builds and passes `--var BUILD_COMMIT_SHA` / `--var BUILD_TIMESTAMP`), or add the two `--var` flags inline as staging does. Remove the hardcoded `BUILD_TIMESTAMP: "2026-08-14"`. Code delta: 3 lines. **Caveat:** commit `b8a68fb` deliberately removed these flags ("bare command, no flags"); the reason is not recorded. Operator must confirm before reintroducing.
6. **Keep `MSHOPS` clone as-is** in this packet. F12 (`GH_PAT` in URL) is a separate small change; bundling it here widens the blast radius of a deploy-workflow edit.

Not proposed here: changing `wrangler.jsonc`, adding new secrets, changing Node version, or adding evidence artifacts (nice-to-have, not minimum).

### FILES_TOUCHED

- `.github/workflows/deploy-production.yml` (items 1 to 5)
- `scripts/ci/resolve-deploy-ref.mjs` and `tests/ci/resolve-deploy-ref.test.mjs` (item 2 only, if the dispatch-with-phrase shape is chosen)
- New `tests/ci/production-deploy-workflow.test.mjs` (Task 5 of the plan; shape assertions below)
- Repository settings: `production` environment with required reviewers and scoped secrets; `PRODUCTION_BASE_URL` variable (Operator, outside git)

### REGRESSION_TESTS (design only)

Workflow-shape tests, modelled on `tests/ci/staging-deploy-workflow.test.mjs` (parse YAML, assert structure):

1. `deploy` job declares `environment: production`.
2. `deploy` job `needs` include the build-test and dry-run jobs.
3. No job in the file runs `wrangler deploy` without a preceding `needs` on build-test.
4. Smoke step invokes `scripts/ci/staging-smoke.mjs` (or a production twin) and does not contain a bare `curl` with an unchecked status.
5. Smoke target is taken from a `vars.PRODUCTION_BASE_URL` reference, not a literal hostname.
6. Deploy step passes `BUILD_COMMIT_SHA` (either via `npm run deploy` or `--var`).
7. All `uses:` are SHA-pinned (already enforced by `audit-action-pins`; keep as belt-and-braces).
8. No literal secret values appear in the file (copy of the staging test's assertion).
9. `resolve-deploy-ref` test: production phrase accepted, staging phrase rejected for production, and vice versa (item 2 only).

### ROLLBACK

Workflow edits: revert the commit. Nothing runs until the next deploy trigger, so a bad workflow cannot affect the live Worker; it can only fail to deploy. Environment settings: delete the `production` environment or remove reviewers in repository settings (Operator). Worker rollback itself is unchanged: `wrangler rollback` per `ROLLBACK.md`.

### COMPATIBILITY_RISK

| Change | Risk | Level |
|---|---|---|
| Environment gate (1) | Deploys pause until a reviewer approves; if no reviewer is configured the gate is a no-op (still safe) | Low |
| Dispatch-only trigger (2) | Push-to-main no longer deploys; anyone relying on auto-deploy must use the dispatch form | Medium (process change) |
| Reusable build-test (3) | Tests must be green to deploy. Today `main` is green (299 tests) | Low |
| Failing smoke (4) | Deploy job goes red on a real outage instead of green; no automatic rollback is added | Low, intended |
| `--var` reintroduction (5) | The unrecorded reason behind `b8a68fb` may resurface (e.g., a wrangler flag parsing issue on the runner). Mitigated by the dry-run job catching it before deploy | Medium until Operator confirms |
| Secrets moved to environment scope | Repo-level secrets must be re-entered at environment level or the job fails closed | Low, fail-closed |

### OPERATOR_DECISION_REQUIRED

1. Trigger model: dispatch-with-phrase (staging parity, **recommended**) or keep push-to-main behind an environment approval (alternative in item 2).
2. Confirm reintroducing `--var BUILD_COMMIT_SHA` / `BUILD_TIMESTAMP` (item 5) and state why `b8a68fb` removed them, or accept `unknown` build identity and skip item 4's commit check.
3. Create the `production` GitHub Environment with required reviewers and scoped secrets, and the `PRODUCTION_BASE_URL` variable. These are settings operations, not code; they are the actual approval gate.
4. Approve Task 5 to implement items 1, 3, 4, 5 and the shape test once decisions 1 and 2 are made. Item 2 (trigger change) is a separate small PR if chosen.

---

## Sequencing recommendation

1. F1 Option A + C in one PR (worker only, no deploy involvement). Merge and deploy through the **current** pipeline, since the fix is pure removal and the tests prove containment.
2. F3 items 1, 3, 4, 5 in the next PR (workflow only). Operator creates the environment first so the gate is live when the workflow lands.
3. F3 item 2 (trigger change) last, once the team has used the environment approval prompt at least once.

Total code touched across both: about 4 worker lines removed plus test updates (F1), about 45 workflow lines and 3 script lines (F3). No wrangler, secret, Beacon, or scope-lock changes.

---

## F1 remediation record (2026-09-14)

**Operator decision:** A approved, C approved, rewriting `tests/operatorAuth.test.ts:163` approved.

**Pre-implementation harness check:** repo-local only. Evidence: `worker/edge/canonical/source-meta.ts` (edge layer recovered from `msh-ops-os-harness.js` bundle), `worker/ghost.ts:209,288` (harness auth is `X-Harness-Secret`, a raw secret), `docs/STEP5-RECONCILIATION.md:130` (secret alignment open), `wrangler.mshops-public.jsonc` (public edge and harness are distinct workers; secrets not in repo). Verdict: not proven, not strongly indicated; conditional on secret equality that cannot be observed here. P0_HOLD not triggered. Conditional P0 branch: if the Operator finds the secrets equal, rotate/distinguish `OPERATOR_SECRET` and `HARNESS_SECRET` before or at deploy of this fix.

**Implemented:** see `AUTH-SESSION-REVIEW.md` §7. Diff scope: 4 worker files, 3 test files, 2 docs. No wrangler, secret, Beacon, scope-lock, workflow, or session/token-format changes. `npm run typecheck` exit 0; full suite 304 tests, 302 pass, 0 fail, 2 todo.

**Routes now protected by canonical auth (in addition to the edge gate):** every `OPERATOR_PROTECTED` path and `GET /api/engagements/*` other than `/status`: `/api/operator/*` (including the six listing routes and the former `/session` path), `/api/wildcard`, `/api/wildcard/*`, `/api/debug/*`, `/api/audit/*`, `/api/lifecycle/advance/*`, `/api/marketplace/audit`, `/api/fedgrade/*`, `/api/governance/propose|approve`. Marketplace-class (`/api/marketplace/integrity`, `/api/hsx`) unchanged.

**Rollback:** `git revert` of the remediation commit on the PR branch. No data or secret changes to unwind.

**Compatibility consequence accepted:** System B operator tokens alone no longer authorize operator-class routes. The credentialed `/api/operator/auth` still issues them; they remain valid at the edge gate but not past canonical auth.
