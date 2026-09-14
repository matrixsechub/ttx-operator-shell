# Auth / Session / Deploy-Security Red-Team Review

**Date:** 2026-09-14 · **Branch:** `claude/eloquent-heisenberg-p2i54y` · **PR:** #43 (draft) · **Task:** 3 of `docs/BUDGET-EXECUTION-PLAN.md`
**Reviewer role:** SEC-01 (advisory). Operator is the sole approval authority. No auth semantics, deploy behavior, secret policy, Beacon authority, or scope-lock doctrine were changed by this review.

## 0. Scope and method

Reviewed as-is: `worker/auth.ts`, `worker/passwordHash.ts`, `worker/sessionBridge.ts`, `worker/do/session.ts`, `worker/apiAuth.ts`, `worker/edge/{gate,routeClass,crypto,rateLimit}.ts`, `worker/hsxEdge.ts`, `worker/kernel.ts` (cockpit session enforcement), `worker/backbone.ts` (governance auth calls), `worker/buildInfo.ts`, `worker/mode.ts`, `worker/security.ts`, `wrangler.jsonc`, `.github/workflows/{deploy-production,staging-deploy,ci}.yml`, `scripts/deploy-production.mjs`, `scripts/ci/audit-action-pins.mjs`, `scripts/hash-password.mjs`, `.gitignore`, and the auth tests under `tests/`. Method: static read, call-graph tracing by grep, local execution of tests and CI lint scripts. No network calls, no deployed environment touched.

Evidence labels: **VERIFIED** = confirmed by reading code and/or running it here; **INFERRED** = follows from code plus documented platform behavior, not executed; **UNKNOWN** = could not be determined from the repo.

## 1. Architecture as found

Two independent operator credential systems coexist in the same Worker:

| | System A: `worker/auth.ts` | System B: `worker/edge/gate.ts` |
|---|---|---|
| Credential | `OPERATOR_CALLSIGN` + PBKDF2 hash `OPERATOR_PASSWORD_HASH` | `OPERATOR_USERNAME` (default `operator`) + plaintext `OPERATOR_PASSWORD` |
| Token | HS256 JWT, `type: "access"` (12h) / `"refresh"` (30d, `jti`) | HS256 JWT, `sub: "operator"` (1h), no `type`, no `jti` |
| Signing key | `AUTH_SIGNING_KEY` | `OPERATOR_SECRET`, **falling back to `AUTH_SIGNING_KEY`** |
| Revocation | KV denylist `AUTH_REVOCATION` (refresh only) | none |
| Bootstrap | `POST /api/auth/login` (credentials required) | `POST /api/operator/auth` (credentials) **and `POST /api/operator/session` (no credentials)** |
| Gates that accept it | `enforceOperatorApiAuth` (default-deny `/api/*`), `enforceCockpitSession` (`/api/ops`), governance in `backbone.ts`, per-handler checks | `edgeAuthGate` for routes classified `operator` / `marketplace` |

Request order in `worker/index.ts` (lines ~211–262): edge bootstrap handlers → `edgeAuthGate` → `enforceOperatorApiAuth` → `enforceCockpitSession` → route handlers. `enforceOperatorApiAuth` returns early for any route `classifyRoute` labels `operator` or `marketplace`, so those routes are gated by System B alone unless the handler self-checks with System A.

Cross-acceptance: a System A access token verifies at `edgeAuthGate` (signature + `exp` only). A System B token is rejected by System A (`payload.type !== "access"`). VERIFIED by `tests/operatorAuth.security.test.ts`.

## 2. Findings

| ID | Sev | Evidence | Title | Disposition |
|---|---|---|---|---|
| F1 | P1 | VERIFIED | Credential-less operator-class token issuance at `POST /api/operator/session` | NEEDS_OPERATOR |
| F2 | P1 | VERIFIED | Production deploy workflow used unpinned actions; repo's own pin audit fails, PR gate red since 2026-08-13 | FIXED (pinned) |
| F3 | P1 | VERIFIED | Production deploy has no approval gate and no pre-deploy verification; staging has both | NEEDS_OPERATOR |
| F4 | P2 | VERIFIED | Production build identity reports `commitSha: "unknown"` | NEEDS_OPERATOR |
| F5 | P2 | VERIFIED | Two parallel credential systems share one signing key by fallback; System B stores a plaintext password secret | NEEDS_OPERATOR |
| F6 | P2 | INFERRED | Refresh-token single-use depends on eventually-consistent KV | NEEDS_OPERATOR |
| F7 | P2 | VERIFIED | No access-token or DO-session revocation on logout | NEEDS_OPERATOR |
| F8 | P2 | VERIFIED | `SessionDO` never deletes session records | NEEDS_OPERATOR |
| F9 | P2 | VERIFIED | `verifyPassword` accepts any PBKDF2 iteration count ≥ 1 | NEEDS_OPERATOR |
| F10 | P2 | VERIFIED | Login has no rate limit; each failed attempt writes attacker-controlled data to KV | NEEDS_OPERATOR |
| F11 | P2 | VERIFIED | Edge rate limiter is per-isolate in-memory; not a control | Document |
| F12 | P2 | VERIFIED | `GH_PAT` embedded in a clone URL in the production workflow | NEEDS_OPERATOR |
| F13 | P2 | INFERRED | Staging and production share `ENGINE_API_URL`; `/api/lifecycle/advance` has no local handler and is only blocked in `OPERATOR_BETA` | NEEDS_OPERATOR |
| F14 | P2 | VERIFIED | Zero test coverage for `/api/auth/login`, `/refresh`, `/logout`, `/session` before this review | FIXED (scaffold) |
| F15 | P2 | VERIFIED | Stale contracts: dead `passwordHash.ts`, missing README "Auth setup", misleading FEDGRADE comment | NEEDS_OPERATOR (trivial) |
| F16 | P2 | VERIFIED | Scope-lock retires backend auth/session; repo ships and tests one | NEEDS_OPERATOR (policy) |
| F17 | Info | VERIFIED | `serveCatalog` echoes client `X-Operator-Role` / `X-Operator-Access-Level` headers | None |

### F1 — Credential-less operator-class token (P1, VERIFIED)

- **Where:** `worker/edge/gate.ts:64-91` (`handleOperatorSession`), wired at `worker/index.ts:213`; classified `public` at `worker/edge/routeClass.ts:20`.
- **What:** `POST /api/operator/session` with no body and no header returns a signed token `{ sub: "operator", exp: +1h }`. `edgeAuthGate` (`gate.ts:97-141`) accepts it for every route in `OPERATOR_PROTECTED` (`routeClass.ts:3-14`): `/api/operator/*`, `/api/wildcard*`, `/api/debug/*`, `/api/audit/*`, `/api/lifecycle/advance/*`, `/api/marketplace/audit`, `/api/fedgrade/*`, `/api/governance/{propose,approve}`, and `GET /api/engagements/*`.
- **Reachability with the token (traced):** `/api/governance/propose|approve` → blocked, `backbone.ts` requires a System A token (VERIFIED, `tests/cockpitSessionBoundary.test.ts` GOVERNANCE_MUTATION_UNAUTHENTICATED_DENIED). `/api/ops/*` → blocked by `enforceCockpitSession` (System A). Reachable: `GET /api/wildcard`, `POST /api/wildcard/scan` (`wildcardAdvancement.ts:139-162`, 0 auth calls), `GET /api/fedgrade/health`, `GET /api/operator/{ai-agent-builds,security-remediation,rag-architectures,local-ai-deployments}` (`fulfillmentAgentRoutes.ts:375-384`, 0 auth calls), `GET /api/operator/{northstar-beacon-orders,northstar-beacon-proposals}` (`northstarBeaconRoutes.ts:199-202`, 0 auth calls). `/api/debug/*`, `/api/audit/*`, `/api/lifecycle/advance/*`, `/api/marketplace/audit` have no local handler and fall through toward the Engine proxy (UNKNOWN what the harness does with them).
- **Exploitability:** trivial, unauthenticated, one request. Impact is bounded to the reachable set above: operator-only listings of customer submissions and order/proposal records (content sensitivity UNKNOWN; no email fields found by grep), plus a discovery scan trigger. It does not yield governance approval, cockpit access, or any System A route.
- **Intent evidence:** `tests/operatorAuth.test.ts:163` ("allows valid edge token from POST /api/operator/session") and the comment at `gate.ts:60-62` ("WILDCARD Cycle 1 — operator session bootstrap … public bootstrap route") indicate this was ported intentionally from the live `mshops-public` worker. The comment's claim "token required for protected APIs" is true but vacuous, since the token is free.
- **UI intent → authority:** yes. Any client can self-issue "operator" class. This is the single clearest violation of the fail-closed doctrine in the reviewed surface.
- **Options for Operator:** (a) require credentials: route `/api/operator/session` through `handleOperatorAuth`'s check or delete it and keep `/api/operator/auth`; (b) reclassify the reachable `/api/operator/*` listings so `enforceOperatorApiAuth` (System A) gates them; (c) accept as intentionally public and rename the route class so it no longer reads as operator authority. Recommend (a)+(b). Any option changes auth semantics and the existing test at `operatorAuth.test.ts:163`, hence NEEDS_OPERATOR.
- **Scaffold:** `tests/operatorAuth.security.test.ts` — `CURRENT_BEHAVIOR F1` (documents today), two containment tests (System A rejects the token even when keys are shared), and `it.todo("F1 …")`.

### F2 — Unpinned actions in production workflow (P1, VERIFIED, FIXED)

- **Where:** `.github/workflows/deploy-production.yml:25,38` used `actions/checkout@v4` and `actions/setup-node@v4`. Introduced in `bbe4d02` (2026-08-13).
- **What:** `node scripts/ci/audit-action-pins.mjs` exits 1 on `main` (run locally, output captured). `ci.yml` `pr-gate` runs this script, so every PR's gate has been red since that commit, which trains reviewers to ignore a red gate and is a supply-chain policy regression on the one workflow holding `CLOUDFLARE_API_TOKEN` and `GH_PAT`.
- **Fix applied:** pinned both to the SHAs already used for the same `v4` majors elsewhere in this repo (`checkout@34e11487…`, `setup-node@49933ea5…`, see `organizer-schedule.yml`, `.github/actions/setup-node-npm/action.yml`). Same action versions, no deploy behavior change. Audit now exits 0.

### F3 — Production deploy lacks approval and verification gates (P1, VERIFIED)

- **Where:** `deploy-production.yml` triggers on every push to `main` and `workflow_dispatch`; steps are checkout → clone MSHOPS → `npm ci` → `npm run build` → `npx wrangler deploy` → smoke.
- **Gaps vs `staging-deploy.yml`:** no `environment:` (so no required-reviewer approval), no confirmation input, no `typecheck`, no `npm test`, no `wrangler --dry-run`, no evidence artifact. The smoke step (`:59-68`) only echoes; it cannot fail the job. It probes `https://www.mshops.net/pearl-os`, a different property from this Worker's `ORIGIN_URL`, so it does not verify the deployment it follows.
- **Effect:** production is less guarded than staging, and a merge to `main` is an unattended production write. This contradicts the AGENTS.md rule that the Operator approves external/irreversible actions.
- **Recommendation (NEEDS_OPERATOR):** add `environment: production` with required reviewers; run `typecheck`, `test`, and `wrangler deploy --dry-run` before deploy; make smoke fail on non-200 and target `ORIGIN_URL` `/api/build-info`. Task 5 of the plan can produce the workflow-shape test once the Operator picks the target shape.

### F4 — Production build identity is "unknown" (P2, VERIFIED)

- `wrangler.jsonc` production `vars` set `BUILD_COMMIT_SHA: "unknown"`, `BUILD_TIMESTAMP: ""`. `resolveBuildInfo` (`buildInfo.ts:19-27`) prefers `env` over the bundled values. The workflow runs bare `npx wrangler deploy` (`b8a68fb` removed the `--var` flags), so production `/api/build-info` and the `X-Build-Commit` header report `unknown`. Staging passes `--var BUILD_COMMIT_SHA` and is correct. The workflow also hardcodes `BUILD_TIMESTAMP: "2026-08-14"` at `:50`.
- Effect: rollback verification ("hit the production URL and check version", `ROLLBACK.md`) cannot work on production. Fix is one line (call `npm run deploy`, which already passes the vars) but the flags were removed deliberately in the last deploy-fix series, so NEEDS_OPERATOR to confirm why.

### F5 — Parallel credential systems and key sharing (P2, VERIFIED)

- `gate.ts:13-19`: `operatorSecret = OPERATOR_SECRET || AUTH_SIGNING_KEY`; `marketplaceSecret` falls back through both. If `OPERATOR_SECRET` is unset in production (UNKNOWN; secrets are not in the repo), every System B token is signed with the System A key, and compromise of either surface's token-minting path is compromise of both. System B compares a plaintext `OPERATOR_PASSWORD` secret (`gate.ts:47-50`), contradicting the PBKDF2 investment in System A.
- Recommendation: set distinct `OPERATOR_SECRET` and `MARKETPLACE_SECRET` (secret operation, Operator only), then plan consolidation onto System A. Containment test added (System A rejects System B tokens under shared key).

### F6 — Refresh single-use relies on KV consistency (P2, INFERRED)

- `auth.ts:350-356`: `isRevoked` then `revoke` via KV. Workers KV is eventually consistent (Cloudflare documents up to ~60 s propagation between locations). Two presentations of the same refresh token at different colos inside that window can both succeed, yielding two live refresh chains. Same window applies to logout revocation. `SessionDO` exists and would give linearizable revocation. NEEDS_OPERATOR (auth semantics).

### F7 — No access-token or DO-session revocation (P2, VERIFIED)

- Logout (`auth.ts:368-391`) revokes the refresh `jti` only. Access tokens stay valid to `exp` (12 h). `SessionDO` has no `/revoke` or `/end` path (`do/session.ts`), so the DO session also stays `active` for 12 h. `todo` test added.

### F8 — SessionDO storage growth (P2, VERIFIED)

- `appendOperatorSession` caps the per-operator index at 10 ids, but `session:<id>` records are never deleted; `/stats` lists all of them. Unbounded growth over time; low severity, single operator.

### F9 — No PBKDF2 iteration floor (P2, VERIFIED)

- `auth.ts:174-175` accepts `iterations >= 1`. `scripts/hash-password.mjs:17` emits 100 000, so a correctly generated hash is fine, but a hand-edited or legacy hash with a tiny count is silently accepted. A floor changes acceptance of existing secrets, so NEEDS_OPERATOR. `todo` test added.

### F10 — Login unthrottled; failed attempts write to KV (P2, VERIFIED)

- `auth.ts:13-16` states no throttling by design. `recordSecurityEvent` (`security.ts:52-65`) writes one KV entry per failed login containing the client-supplied `username` with no length cap, then runs `enforceRetention` (a KV `list`). Retention caps stored events at 50, so this is a write-amplification and cost issue rather than a fill. `/api/*` rate limiting is inside `SCOPE-LOCK.md` "REAL" scope; adding it is still a behavior change → NEEDS_OPERATOR.

### F11 — Edge rate limiter is advisory (P2, VERIFIED)

- `edge/rateLimit.ts` keeps windows in a module-level `Map`; state is per isolate and per colo, and covers only `/api/hsx*` and `/api/marketplace*`. It should not be cited as a control in any packet.

### F12 — `GH_PAT` in clone URL (P2, VERIFIED)

- `deploy-production.yml:31-33` clones `MSHOPS` with `https://x-access-token:${GH_PAT}@github.com/…`. GitHub masks the secret in logs, but the token is written into `MSHOPS/.git/config` on the runner for the job's lifetime and appears in any git error that prints the remote. Prefer `actions/checkout` with `repository:` + `token:` (which scrubs the credential) or a `http.extraheader` config. Workflow change → NEEDS_OPERATOR.

### F13 — Environment identity (P2, INFERRED)

- Both environments point `ENGINE_API_URL` at the same harness (`wrangler.jsonc:17,78`). `blockAutonomousInBeta` (`mode.ts:45-56`) blocks `/api/lifecycle/advance` only when `SYSTEM_MODE=OPERATOR_BETA` (staging); in production it is allowed, has no local handler, and would be proxied to the shared harness. Whether the harness segregates tenants by `FLYWHEEL_TENANT_ID` is UNKNOWN from this repo. Good: `DEPLOY_ENV`, `SYSTEM_MODE`, `ORIGIN_URL`, and KV/DO namespaces are distinct per environment, and `X-Deploy-Env` / `X-System-Mode` headers are stamped on responses.

### F14 — Auth flow test coverage (P2, VERIFIED, FIXED)

- Before this review no test exercised `handleAuthRoute` (login, refresh, logout, session). `tests/operatorAuth.security.test.ts` now covers login → access token, refresh rotation, logout revocation, refresh-token-as-access rejection, and the System A/B containment boundary. Added to `npm test` and `npm run test:operator-auth`.

### F15 — Stale contracts (P2, VERIFIED)

- `worker/passwordHash.ts` duplicates `verifyPassword` from `auth.ts` and has zero importers (drift risk: a fix in one is silently missing from the other).
- `auth.ts:2` cites `README "Auth setup"`; no such section exists.
- `gate.ts:62` FEDGRADE comment asserts compliance for a route that mints tokens without credentials (see F1).
- Deleting a file and editing comments are trivial but outside "smallest fix within current scope" for a security pass; listed for the Operator.

### F16 — Scope-lock tension (policy, VERIFIED, contained)

- `SCOPE-LOCK.md` retires "backend auth/session layer" and states "No auth". The repo contains System A, System B, `SessionDO`, `AUTH_REVOCATION`, and tests for all of them. `CLAUDE.md` already records this. This review treats the code as real and did not extend, remove, or reinterpret it. Resolution (amend the scope lock, or retire one or both systems) is the Operator's.

### F17 — Header echo (Info)

- `index.ts:616-622` reflects client-supplied role/access-level headers into response headers. No authority derives from them. Cosmetic; noted so nobody later mistakes the echo for enforcement.

## 3. Things checked and found sound

- JWT verification always uses HMAC-SHA256 regardless of the token header, so `alg: none` / algorithm-confusion is not possible (`auth.ts:96-116`, `edge/crypto.ts:36-63`). VERIFIED.
- Access/refresh separation by `type` claim is enforced on `/me`, `/session`, `/refresh` and in `getAccessTokenOperator`. VERIFIED by test.
- Refresh rotation revokes before re-issuing (`auth.ts:354-356`). VERIFIED by test (modulo F6).
- Password verification runs the PBKDF2 comparison even on wrong callsign and returns a uniform 401 (`auth.ts:258-266`). Constant-time compare on digest bytes. VERIFIED.
- Handlers return 503, not a bypass, when auth secrets are unconfigured (`auth.ts:244,313,337`; `gate.ts:32,72,121`). Fail-closed. VERIFIED.
- Default-deny for unlisted `/api/*` routes via `enforceOperatorApiAuth` (`apiAuth.ts:79-104`); allowlist is explicit. VERIFIED (`tests/apiAuth.test.ts`).
- Governance propose/approve require a System A token in addition to the edge gate. VERIFIED.
- Secrets: none in `wrangler*.jsonc` `vars`; `.dev.vars*`, `.env*` ignored; no PBKDF2 strings, signing keys, or passwords found in tracked files by pattern sweep. VERIFIED.
- Staging deploy: confirmation phrase, `environment: staging`, SHA-pinned actions, typecheck + test + dry-run before deploy, evidence artifacts, secrets from environment scope. VERIFIED; this is the shape production should match (F3).
- `worker-configuration.d.ts` is ignored, so generated types cannot leak binding IDs beyond what `wrangler.jsonc` already commits. VERIFIED.

## 4. Changes made in this task

| File | Change | Behavior impact |
|---|---|---|
| `.github/workflows/deploy-production.yml` | Pinned `actions/checkout` and `actions/setup-node` to the repo's existing v4 SHAs | None at runtime; restores the repo's pin policy (F2) |
| `tests/operatorAuth.security.test.ts` | New: 7 passing containment/lifecycle tests, 3 `todo` markers (F1, F7, F9) | Test only |
| `package.json` | Added the suite to `test` and `test:operator-auth` | Test only |
| `docs/security/AUTH-SESSION-REVIEW.md` | This document | None |

Not changed: any worker source, `wrangler*.jsonc`, secrets, Beacon, scope lock, PR state.

## 5. Verification run

```
node --import tsx --test tests/operatorAuth.security.test.ts   # 10 tests: 7 pass, 0 fail, 3 todo
node scripts/ci/audit-action-pins.mjs                          # exit 0 (was exit 1)
node scripts/ci/workflow-permissions-lint.mjs
npm run typecheck
npm test
```

Results are recorded in the PR #43 conversation for this commit.

## 6. Operator decision queue (ordered)

1. F1: choose (a) credentials on `/api/operator/session`, (b) System A gating of `/api/operator/*` listings, or (c) accept-and-rename. Recommend (a)+(b).
2. F3: approve a production workflow shape mirroring staging (environment approval, typecheck/test/dry-run, failing smoke against `ORIGIN_URL`). Then Task 5 writes the shape test.
3. F4: confirm whether `--var BUILD_COMMIT_SHA` was dropped for a reason; if not, switch the deploy step to `npm run deploy`.
4. F5: set distinct `OPERATOR_SECRET` / `MARKETPLACE_SECRET` (secret operation), then schedule System B consolidation.
5. F6/F7: decide whether revocation moves to `SessionDO` and whether logout ends the DO session.
6. F9/F10/F12/F15: small hardening items; can be batched into one mission.
7. F16: amend `SCOPE-LOCK.md` to reflect the shipped auth layer, or issue a retirement mission.
