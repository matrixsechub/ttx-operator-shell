# Budgeted Execution Plan — $14 Claude Usage (expires 2026-09-18)

**Repo:** `matrixsechub/ttx-operator-shell` · **Branch:** `claude/eloquent-heisenberg-p2i54y` · **Prepared:** 2026-09-14

## 0. Operating rules

- **Hard budget:** $14.00. The assistant cannot see the balance. Every follow-up prompt starts with `STATUS: remaining $X.XX` copied from the usage page.
- **One PR accumulates everything.** All artifacts land on this branch and the draft PR opened with this plan. No new branches, no new PRs.
- **Global stop rule:** if `remaining < (next task allocation + $1.00 buffer)`, skip the next task and jump to Task 7 (final cleanup). If `remaining < $2.00` at any time, jump to Task 7 immediately.
- **Overrun rule:** any task exceeding its allocation by 50% is cut at the next natural checkpoint and its state written to the handoff packet. Tasks 5 and 6 are the first to be dropped.
- **No prose-only turns.** Every turn must end with a file written, a test run, or a commit.
- **Unallocated slack ($3.25) is an error reserve, not a spending target.** Finishing under budget is the correct outcome.

## 1. Repo facts driving the priorities (verified 2026-09-14)

| Observation | Evidence | Consequence |
|---|---|---|
| No `CLAUDE.md` exists, but `AGENTS.md` names it as the product playbook | `ls CLAUDE.md` → missing | Every session re-derives repo shape from scratch. Highest token-multiplier fix available. |
| 6 test files exist but are not in `npm test` | `tests/experimentation`, `governanceAutomation`, `adaptiveEntry`, `policyResponse`, `behaviorIntelligence`, `usage` | Unknown whether they pass. CI green may be false confidence. |
| Last 5 commits are all `fix(ci)` deploy changes | `git log --oneline -8` | Production deploy pipeline is unstable and under-tested; `tests/ci/` covers staging deploy but not production. |
| `worker/auth.ts` (PBKDF2) and `worker/sessionBridge.ts` landed recently with no dedicated security review artifact | `git log`, `docs/evidence/` | Auth is the highest-blast-radius surface with the least review coverage. |
| ~50 planning `.md` files at repo root, many superseded by `SCOPE-LOCK.md` | `ls *.md` | Future sessions waste context reading retired docs. |
| `node_modules` absent in fresh clones | `ls node_modules` → 0 | Every task that runs tests pays an `npm ci` cost once. Bundle test-running tasks. |

## 2. Priority order and allocations

| # | Task | Allocation | Cumulative | Artifact |
|---|---|---|---|---|
| 0 | This plan (already spent, est.) | $0.50 | $0.50 | `docs/BUDGET-EXECUTION-PLAN.md`, draft PR |
| 1 | Repo operating guide (`CLAUDE.md`) | $1.25 | $1.75 | `CLAUDE.md` |
| 2 | Test suite integrity | $2.00 | $3.75 | Green `npm test` including 6 orphaned suites, or documented exclusions |
| 3 | Red-team review: auth + session + deploy secrets | $2.50 | $6.25 | `docs/security/AUTH-SESSION-REVIEW.md` + regression test scaffolds |
| 4 | Architecture map | $1.25 | $7.50 | `docs/ARCHITECTURE.md` (worker routes, surfaces, data flow, failure modes) |
| 5 | Production deploy pipeline hardening | $1.50 | $9.00 | `tests/ci/production-deploy-workflow.test.mjs`, updated `ROLLBACK.md` |
| 6 | Root docs triage index | $0.75 | $9.75 | `docs/INDEX.md` classifying every root `.md` as active / historical / retired |
| 7 | Final review, cleanup, handoff packet (reserved buffer) | $1.00 | $10.75 | `docs/HANDOFF-2026-09.md`, PR marked ready |
| — | Unallocated error reserve | $3.25 | $14.00 | none |

**Total allocated: $10.75. Reserve: $3.25. Plan ceiling: $14.00.**

## 3. Task specifications

### Task 1 — Repo operating guide (`CLAUDE.md`) · $1.25

- **Objective:** Write the missing `CLAUDE.md` so every later session (and every later dollar) starts with the repo's commands, layout, test list, scope rules, and governance constraints already loaded.
- **Artifact:** `CLAUDE.md` at repo root, under 200 lines. Sections: stack, surfaces, commands, test entry points, worker module map, `SCOPE-LOCK.md` retired-concept list, `AGENTS.md` handoff-packet rule, "do not touch" list (secrets, wrangler env blocks, Beacon).
- **Leverage:** Reduces context re-derivation on tasks 2 through 7 and on every future session. It is the only task whose output lowers the cost of all others.
- **Follow-up prompt:**
  > `STATUS: remaining $X.XX` — Execute Task 1 from docs/BUDGET-EXECUTION-PLAN.md. Write CLAUDE.md (max 200 lines) from the repo as it is: package.json scripts, README surfaces table, worker/ module list, tests/ layout, SCOPE-LOCK.md retired list, AGENTS.md doctrine. No speculation about unbuilt features. Commit and push to the plan branch.
- **Stop/continue:** Continue to Task 2 if `CLAUDE.md` is committed and remaining ≥ $3.00. Otherwise jump to Task 7.

### Task 2 — Test suite integrity · $2.00

- **Objective:** Establish a trustworthy green baseline. Run `npm ci`, `npm run typecheck`, `npm test`. Add the 6 orphaned suites to the `test` script. Fix any failure that is a test-wiring problem. Do not fix product bugs silently; record them.
- **Artifact:** Updated `package.json` `test` script; `docs/TEST-BASELINE.md` with the run output summary, pass/fail counts, and a table of any suite intentionally excluded with the reason.
- **Leverage:** Every subsequent code change in tasks 3 and 5 needs a known-green baseline to be verifiable. CI currently cannot tell you whether those 6 suites pass.
- **Follow-up prompt:**
  > `STATUS: remaining $X.XX` — Execute Task 2. Run npm ci, npm run typecheck, npm test. Add the 6 orphaned test files to the npm test script. If a suite fails for a wiring reason, fix it. If it fails for a product-logic reason, leave it out, and record the failing assertion in docs/TEST-BASELINE.md. Commit and push. Report pass/fail counts only.
- **Stop/continue:** Continue if baseline is green or exclusions are documented. If `npm ci` itself fails on the environment, spend at most $0.50 diagnosing, then document and move to Task 3 without a test run.

### Task 3 — Red-team review: auth, session bridge, deploy secrets · $2.50

- **Objective:** Adversarial review of `worker/auth.ts`, `worker/sessionBridge.ts`, `worker/index.ts` auth-gated routes, and secrets handling in `.github/workflows/deploy-production.yml` plus `scripts/deploy-production.mjs`. Look for: PBKDF2 parameter weakness, timing-unsafe comparison, session fixation, missing cookie flags, header trust (`X-Forwarded-*`), secret leakage into logs or build manifests, and workflow permission over-grants.
- **Artifact:** `docs/security/AUTH-SESSION-REVIEW.md` with findings ranked by severity, each citing `file:line`, exploit scenario, and proposed fix. Plus a regression test scaffold `tests/operatorAuth.security.test.ts` covering each HIGH finding (failing tests are acceptable and should be marked `todo`). Fix only findings that are one-function local changes.
- **Leverage:** Auth is the highest-blast-radius code in the worker and has no review artifact. Findings become CI-enforced tests rather than a document nobody re-reads.
- **Follow-up prompt:**
  > `STATUS: remaining $X.XX` — Execute Task 3. Red-team worker/auth.ts, worker/sessionBridge.ts, auth-gated routes in worker/index.ts, and secrets handling in the production deploy workflow and script. Write docs/security/AUTH-SESSION-REVIEW.md with severity-ranked findings citing file:line. Scaffold tests/operatorAuth.security.test.ts with one test per HIGH finding. Apply only one-function fixes. Commit and push.
- **Stop/continue:** Continue if the review file exists with at least the HIGH tier complete. If findings require multi-file refactors, list them in the handoff packet instead of implementing.

### Task 4 — Architecture map · $1.25

- **Objective:** One durable page that shows components, data flow, dependencies, and failure modes of the worker and surface routing, so the next engineer does not read 13,000 lines of worker code to orient.
- **Artifact:** `docs/ARCHITECTURE.md` with: surface routing table (HTML shell to route to worker handler), worker module dependency list derived from imports, request lifecycle for one auth-gated route, KV/D1/asset bindings from `wrangler.jsonc`, and a failure-mode table (binding missing, auth secret missing, asset 404, engine timeout). One Mermaid diagram maximum.
- **Leverage:** Handoff artifact. Pairs with `CLAUDE.md` to make future sessions cheap. Lower than Task 3 because it changes no behavior.
- **Follow-up prompt:**
  > `STATUS: remaining $X.XX` — Execute Task 4. Derive docs/ARCHITECTURE.md from worker/index.ts, worker/surface.ts, wrangler.jsonc, and the import graph of worker/. Include the failure-mode table. One Mermaid diagram max. No speculation beyond what the code does. Commit and push.
- **Stop/continue:** Continue if remaining ≥ $3.50 after this task. Otherwise skip Tasks 5 and 6 and go to Task 7.

### Task 5 — Production deploy pipeline hardening · $1.50

- **Objective:** Stop the fix-and-retry deploy cycle visible in the last five commits. Add a workflow-shape test for production deploy mirroring the existing staging one, verify action pins, and make `ROLLBACK.md` an executable checklist with exact commands.
- **Artifact:** `tests/ci/production-deploy-workflow.test.mjs` added to `npm test`; updated `ROLLBACK.md`; any workflow fix that the new test demands.
- **Leverage:** Each failed deploy costs operator time and a commit. A shape test catches the next flag or env regression before it reaches Actions.
- **Follow-up prompt:**
  > `STATUS: remaining $X.XX` — Execute Task 5. Read tests/ci/staging-deploy-workflow.test.mjs and write the production equivalent for .github/workflows/deploy-production.yml. Add it to npm test. Rewrite ROLLBACK.md as a numbered command checklist. Commit and push.
- **Stop/continue:** Continue to Task 6 only if remaining ≥ $2.00.

### Task 6 — Root docs triage index · $0.75

- **Objective:** Classify every root `.md` file as active, historical, or retired (per `SCOPE-LOCK.md`) without moving or deleting anything, so future sessions skip dead context.
- **Artifact:** `docs/INDEX.md` table: filename, one-line purpose, status, superseded-by. Link it from `CLAUDE.md`.
- **Leverage:** Cheap. Cuts future context cost. Last because it changes nothing and can be done by hand if budget runs out.
- **Follow-up prompt:**
  > `STATUS: remaining $X.XX` — Execute Task 6. Produce docs/INDEX.md classifying every root-level .md file. Use the first heading and the SCOPE-LOCK retired list to decide status. Do not move or delete files. Add a link in CLAUDE.md. Commit and push.
- **Stop/continue:** Always proceed to Task 7 after this.

### Task 7 — Final review, cleanup, handoff packet · $1.00 (reserved)

- **Objective:** Make the PR self-explaining and the state recoverable by someone with zero session context.
- **Artifact:** `docs/HANDOFF-2026-09.md` per the `AGENTS.md` packet contract: what was done (with commit hashes), what was verified (with commands), what is UNVERIFIED, open findings from Task 3, recommended next three tasks. Update PR description. Run `npm run typecheck` and `npm test` one last time. Mark PR ready for review.
- **Leverage:** Protects everything above from being lost when the budget expires.
- **Follow-up prompt:**
  > `STATUS: remaining $X.XX` — Execute Task 7. Write docs/HANDOFF-2026-09.md per the AGENTS.md packet contract, run typecheck and tests one final time, update the PR description with a per-task checklist, and mark the PR ready. Do not start new work.
- **Stop/continue:** STOP. Session complete regardless of remaining balance.

## 4. Execution checklist

- [ ] Task 0 — plan committed, draft PR open
- [ ] Task 1 — `CLAUDE.md`
- [ ] Task 2 — test baseline green or documented
- [ ] Task 3 — auth/session/deploy red-team + test scaffolds
- [ ] Task 4 — `docs/ARCHITECTURE.md`
- [ ] Task 5 — production deploy workflow test + rollback checklist
- [ ] Task 6 — `docs/INDEX.md`
- [ ] Task 7 — handoff packet, PR ready

## 5. Key decisions

1. `CLAUDE.md` goes first because it is the only output that reduces the cost of every later task.
2. Testing precedes the security review so that fixes from the review are verifiable.
3. Documentation-only tasks (4, 6) are sequenced after behavior-affecting tasks (2, 3, 5) except where they are prerequisites.
4. The plan allocates $10.75 of $14.00 on purpose. The $3.25 reserve absorbs estimate error; it is not a target.
