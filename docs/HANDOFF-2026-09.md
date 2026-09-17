# Handoff Packet — Budgeted Engineering Pass, September 2026

**Branch:** `claude/eloquent-heisenberg-p2i54y` · **PR:** #43 (DRAFT, deliberately) · **Period:** 2026-09-14 to 2026-09-17

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
    - claim: Full test suite is green and 45 tests larger than at session start
      evidence: "npm test → 311 tests / 94 suites / 309 pass / 0 fail / 2 todo (was 266/82)"
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
    - F3 unfixed: production deploys on every push to main with no approval, no tests, no dry run, and a smoke step that cannot fail
    - F4: production /api/build-info reports commitSha "unknown", so rollback verification is not executable
    - F5: OPERATOR_SECRET may be unset, making one key serve two credential systems
    - Bootstrap tokens minted before this fix deploys stay valid at the edge for up to 1 hour
    - External clients of POST /api/operator/session, if any exist outside this repo, will break
    - Two scope-lock tensions remain open (auth/session, billing/entitlements)
  next_action: >
    Decide F3 items 1-4 in docs/security/F1-F3-OPERATOR-DECISION.md so production
    deploy hardening (plan Task 5) can be implemented; it is the only planned task
    left unstarted and the largest remaining risk.
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
| 5 | Production deploy hardening | — | **Not started: blocked on F3 decisions** |
| 6 | Root document index | `docs/INDEX.md` | Done |
| 7 | This handoff packet | `docs/HANDOFF-2026-09.md` | Done |
| +1 | Gate-ordering regression test (recommended next task #2, executed) | `tests/gateOrdering.test.ts` | Done |

Diff against `main`: 18 files, ~1420 insertions, 62 deletions across 9 commits.

## 2. What was verified

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 311 tests, 94 suites, 309 pass, 0 fail, 2 todo |
| `node scripts/ci/audit-action-pins.mjs` | exit 0 (was exit 1 on `main`) |
| `node scripts/ci/workflow-permissions-lint.mjs` | exit 0 |

Test count moved from 266 to 311. The two remaining `todo` markers are F7 (no access-token revocation on logout) and F9 (no PBKDF2 iteration floor); both change auth semantics and await Operator decision.

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
