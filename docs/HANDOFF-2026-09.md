# Handoff Packet — Budgeted Engineering Pass, September 2026

**Branch:** `claude/eloquent-heisenberg-p2i54y` · **PR:** #43 (DRAFT, deliberately) · **Period:** 2026-09-14 to 2026-09-17 (Task 5 pass appended)

```yaml
handoff_packet:
  packet_id: MSHOPS-ENG-20260917-001
  from_agent: SEC-01
  to_agent: OPERATOR
  mission_ref: budgeted-usage-pass-2026-09
  status: READY
  beacon_alignment: >
    Aligned. Work was governance-first and fail-closed: one security defect was
    remediated only after explicit Operator approval of options A and C, and every
    other finding was left for Operator decision rather than acted on. No Beacon
    file, scope-lock line, secret, Cloudflare resource, or production surface was
    touched. Two scope-lock tensions were documented, not resolved.
  claims:
    - claim: Full test suite is green and 79 tests larger than at session start
      evidence: "npm test → 345 tests / 105 suites / 343 pass / 0 fail / 2 todo (was 266/82)"
      confidence: VERIFIED
    - claim: Production deploy is now gated behind verification, approval, and fail-closed smoke
      evidence: "fe67bca, 28cc1a4; tests/ci/production-deploy-workflow.test.mjs (20 invariants, 11 mutations caught)"
      confidence: VERIFIED
    - claim: wrangler --var accepts colon-bearing ISO timestamps, so the reason recorded in e2beb63 does not hold
      evidence: "npx wrangler deploy --dry-run --var BUILD_TIMESTAMP:2026-09-17T12:34:56Z → exit 0, both vars registered"
      confidence: VERIFIED
    - claim: The full code-side gate is green; only GitHub settings remain before a production deploy
      evidence: "typecheck 0; lint:brand 0; npm test 359/108, 357 pass, 0 fail, 2 todo; pin audit 0; permissions lint 0; tests/ci 84/84"
      confidence: VERIFIED
    - claim: F18 is resolved without changing the BootstrapErrorBoundary UI
      evidence: "fa3afe4; git diff on src/components/BootstrapErrorBoundary.tsx is empty; 14 regression cases; 7 mutations caught"
      confidence: VERIFIED
    - claim: R9 previously under-reported raw hex because a /g regex was reused for .test()
      evidence: "file has 6 raw-hex lines, lint reported 5; stateless probe yields 6 findings repo-wide, all in the exempt file"
      confidence: VERIFIED
    - claim: The governance Durable Object fallback is fail-substituted, not uniformly fail-open
      evidence: "worker/kernel.ts:100-110,132-142; worker/governanceDefaults.ts:4-34 — wildcard and marketplace land stricter, policy mode lands weaker"
      confidence: VERIFIED
      confidence: VERIFIED
    - claim: Typecheck passes
      evidence: "npm run typecheck → exit 0"
      confidence: VERIFIED
    - claim: The repo's own CI pin audit passes again after being red since 2026-08-13
      evidence: "node scripts/ci/audit-action-pins.mjs → exit 0 (was exit 1 on bbe4d02..b8a68fb)"
      confidence: VERIFIED
    - claim: Credential-less operator-class token issuance is removed
      evidence: "a58003e; worker/edge/gate.ts no longer defines handleOperatorSession; tests/operatorAuth.security.test.ts F1-A"
      confidence: VERIFIED
    - claim: Operator-class routes now require canonical auth.ts authentication before any handler or the Engine proxy
      evidence: "worker/apiAuth.ts enforceOperatorApiAuth; tests F1-C covers 7 paths x anonymous/System-B"
      confidence: VERIFIED
    - claim: The harness cannot be shown to accept a System B token from repo evidence
      evidence: "worker/edge/canonical/source-meta.ts; worker/ghost.ts:209,288; docs/STEP5-RECONCILIATION.md:130"
      confidence: INFERRED
    - claim: Billing/entitlements/tier runtime is outside the scope lock's REAL list
      evidence: "SCOPE-LOCK.md; worker/marketplaceBillingWorker.ts, entitlementsWorker.ts, tierWorker.ts; tests/billingWorker.test.ts"
      confidence: VERIFIED
  evidence:
    - 8953f84 docs: budgeted execution plan
    - f94f009 docs: CLAUDE.md repo operating guide
    - 80b7f63 test: wire four orphan suites; test baseline
    - 68ed596 security: auth/session/deploy red-team; regression scaffold; pin production actions
    - 4d8bf58 docs(security): F1/F3 operator decision packet
    - a58003e fix(security): F1 remediation (options A + C)
    - 8c99403 docs: worker architecture map
    - 4266d44 docs: classified root document index
    - "commands: npm ci; npm run typecheck; npm test; node scripts/ci/audit-action-pins.mjs; node scripts/ci/workflow-permissions-lint.mjs"
  risks:
    - The production approval gate is inert until the Operator creates the production Environment with required reviewers
    - Production smoke reuses the staging route contracts; that production serves identical content is INFERRED, not VERIFIED
    - Two approval prompts per deploy (deploy and smoke both bind the environment), matching staging
    - F5: OPERATOR_SECRET may be unset, making one key serve two credential systems
    - Bootstrap tokens minted before this fix deploys stay valid at the edge for up to 1 hour
    - External clients of POST /api/operator/session, if any exist outside this repo, will break
    - Two scope-lock tensions remain open (auth/session, billing/entitlements)
  next_action: >
    Perform the manual GitHub settings in docs/OPERATOR-SETTINGS-PRODUCTION.md.
    That is the only remaining step before a production deploy can be attempted.
    State: CODE READY / SETTINGS REQUIRED / NO DEPLOY AUTHORIZED.
  stop_before:
    - deploy
    - secrets
    - production
    - merge
    - undraft
  dirty_tree_preserved: true
```

## 1. What was done

| # | Task | Output | State |
|---|---|---|---|
| 0 | Budgeted execution plan | `docs/BUDGET-EXECUTION-PLAN.md` | Done |
| 1 | Repo operating guide | `CLAUDE.md` | Done |
| 2 | Test suite integrity | `docs/TEST-BASELINE.md`, 4 suites wired in | Done |
| 3 | Auth/session/deploy red-team | `docs/security/AUTH-SESSION-REVIEW.md`, `tests/operatorAuth.security.test.ts` | Done |
| — | F1/F3 decision packet (Operator-inserted) | `docs/security/F1-F3-OPERATOR-DECISION.md` | Done |
| — | F1 remediation (Operator-approved A + C) | 4 worker files, 3 test files | Done |
| 4 | Architecture map | `docs/ARCHITECTURE.md` | Done |
| 5 | Production deploy hardening | `.github/workflows/deploy-production.yml`, `scripts/ci/production-smoke.mjs`, `scripts/lib/productionBaseUrl.mjs`, 2 test suites | **Code done; Operator settings + F18 outstanding** |
| 6 | Root document index | `docs/INDEX.md` | Done |
| 7 | This handoff packet | `docs/HANDOFF-2026-09.md` | Done |
| +1 | Gate-ordering regression test (recommended next task #2, executed) | `tests/gateOrdering.test.ts` | Done |

Diff against `main`: 28 files, 2621 insertions, 96 deletions across 14 commits.

## 2. What was verified

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 359 tests, 108 suites, 357 pass, 0 fail, 2 todo |
| `npm run lint:brand` | exit 0 (was exit 1 on `main` since 2026-08-13) |
| `node scripts/ci/audit-action-pins.mjs` | exit 0 (was exit 1 on `main`) |
| `node scripts/ci/workflow-permissions-lint.mjs` | exit 0 |

Test count moved from 266 to 359. The two remaining `todo` markers are F7 (no access-token revocation on logout) and F9 (no PBKDF2 iteration floor); both change auth semantics and await Operator decision.

## 3. What is UNVERIFIED

- Harness (`msh-ops-os-harness`) behavior, route table, and whether it trusts `sub:"operator"` tokens. Not in this repo; no live calls were made.
- Whether `OPERATOR_SECRET` is set in production. Secrets are not readable here.
- Whether any client outside this repository calls `POST /api/operator/session`. No in-repo caller exists.
- Content sensitivity of the `/api/operator/*` listing rows that were previously reachable without credentials.
- Why commit `b8a68fb` removed the `--var BUILD_COMMIT_SHA` flags from the production deploy.

## 4. Open findings, by urgency

**Decide next (blocks Task 5):**
1. F3 trigger model for production deploy: dispatch-with-phrase, or keep push-to-main behind an environment approval.
2. F4: confirm reintroducing build-identity vars, or accept `unknown` and drop the smoke commit check.
3. Create the `production` GitHub Environment with required reviewers and scoped secrets, plus a `PRODUCTION_BASE_URL` variable. This is a settings action, not code, and it is the actual approval gate.
4. Approve Task 5 implementation.

**Decide when convenient:**
5. F5: set distinct `OPERATOR_SECRET` and `MARKETPLACE_SECRET`, then schedule System B consolidation.
6. F6 and F7: move refresh revocation and logout to `SessionDO` for linearizable revocation.
7. F9, F10, F12, F15: small hardening batch (iteration floor, login throttling, `GH_PAT` in clone URL, dead `passwordHash.ts`).
8. Scope-lock tension 1 (auth/session) and tension 2 (billing/entitlements/tiers): amend `SCOPE-LOCK.md` or issue retirement missions.
9. `docs/TEST-BASELINE.md` §5: two suites stay unwired pending a call on a Beacon citation prefix in governance proposal reasons, and on three drifted CTA strings.

## 5. Recommended next three tasks

1. **Production deploy hardening** once F3 is decided. Highest remaining risk: every merge to `main` is an unattended production write.
2. ~~**Gate-ordering test.**~~ **Done in this pass** (`tests/gateOrdering.test.ts`, 7 cases). It pins the three-gate order, keeps the Engine proxy behind every gate, holds pre-gate handlers to a justified allowlist, and asserts that no operator-class path is in the public API allowlist. Verified by mutation: inserting a handler before the gates fails the suite with a named diagnostic.
3. **Scope-lock reconciliation.** Two subsystems ship outside the declared scope. Every future phase review inherits the ambiguity until the document matches the tree.

## 6. Why the PR is still a draft

The Operator instructed DRAFT on every turn of this pass. The branch is green and self-consistent, but it carries a behavior change to authentication whose blast radius outside this repository is UNKNOWN (see §3). Undraft and merge are Operator actions.

---

## 7. Task 5 appendix — production deploy hardening (2026-09-17)

**Delivered in two commits so the trigger change is independently revertible:**

| Commit | Scope |
|---|---|
| `fe67bca` | Verification chain, `production` environment binding, build identity, fail-closed smoke. Trigger untouched. |
| `28cc1a4` | Removes push-to-main; adds the `authorize` job and per-target confirmation phrases. |
| `9a3b64e` | Decision packet, governance finding, settings checklist, F3/F4/F18 records. |

**Pipeline now:** `authorize` (phrase + SHA resolution) → `preflight` (permissions lint, pin audit) → reusable `build-test` (typecheck, brand lint, full suite, build) → reusable wrangler dry run → **`production` environment approval** → in-job pre-deploy dry run → deploy with `--var` build identity → fail-closed smoke asserting the deployed commit.

**Two investigations the Operator required:**

1. *Why `b8a68fb` dropped the build-identity flags.* `e2beb63` cites "colon issues in `--var` syntax"; `b8a68fb` cites "`--env`, `--var` flags causing parse failures". The failing command used a **colon-free** timestamp, so the colon rationale does not explain it; `--env ""` is the likely culprit and `--var` went collaterally. Tested directly: a dry run with a colon-bearing ISO timestamp exits 0 and registers both vars. Smallest safe restoration applied.
2. *Whether the staging smoke could be reused as-is.* No. Three staging-only assumptions: a compile-time hostname allowlist that must not be overridden by environment variables, required Cloudflare Access service-token credentials, and a report stamped `environment: "staging"`. Production therefore got its own entrypoint and validator, reusing the shared probe engine through a minimal seam (conditional Access headers, exported `probeWithRetry`) rather than duplicating the check logic. Staging behavior is unchanged and its suites still pass.

**Mutation evidence:** 11 mutations attempted against the shape test, 11 caught. Two of them exposed defects **in the test itself** rather than the workflow: a YAML comment containing `--dry-run` satisfied an ordering assertion, and another input's `required: true` satisfied the confirmation-input assertion. Both were fixed and re-verified. A shape test that cannot fail is worse than none.

**Not done, by instruction:** governance Durable Object fallback (finding G1), scope-lock amendment (decision packet only), `GH_PAT` clone hygiene (F12), brand lint fix (F18).

---

## 8. F18 appendix — brand lint resolved, code-side production readiness closed (2026-09-17)

`fa3afe4`. `npm run lint:brand` exits 0 with `src/components/BootstrapErrorBoundary.tsx` unchanged byte-for-byte.

**Exception shape.** `scripts/ci/brand-lint-exceptions.mjs` holds a frozen one-entry allowlist matched by exact repository-relative path equality. Applied at one call site guarding only the R9 raw-hex report, so R10, R11 and R15 still apply to the file. A sanctioned path that stops existing now fails the lint. R9 is not disabled and is not weakened anywhere else.

**Second defect found and fixed (F18a).** The component has six raw-hex lines; the lint reported five. `HEX_RE` is a `/g` regex whose `lastIndex` persists across `.test()` calls, so R9 skipped roughly every other violating line. Measured before acting: a stateless probe yields exactly 6 findings repo-wide, all in the exempt file, so fixing it strengthens enforcement without creating a new blocker.

**Evidence.** 14 regression cases using the real lint as a subprocess. Seven mutations attempted, seven caught: removing the exception, adding a second file, `endsWith` matching, substring matching, directory exemption, reverting the stateless fix, un-freezing the allowlist.

**Noted, not acted on:** `BootstrapErrorBoundary` has no importer anywhere in the repository, so the bootstrap error UI it provides is not currently reachable. The exception is correct regardless. Wiring it in or removing it is a separate decision.

**Code-side production readiness: COMPLETE.** Remaining work is GitHub settings only, per `docs/OPERATOR-SETTINGS-PRODUCTION.md`.
