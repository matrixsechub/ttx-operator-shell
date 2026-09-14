# Test Baseline — 2026-09-14

**Branch:** `claude/eloquent-heisenberg-p2i54y` · **PR:** #43 (draft) · **Task:** 2 of `docs/BUDGET-EXECUTION-PLAN.md`
**Environment:** fresh clone, `npm ci`, Node `node --import tsx --test`.

## 1. Baseline (before changes)

| Check | Result |
|---|---|
| `npm ci` | OK |
| `npm run typecheck` | exit 0 |
| `npm test` | 266 tests, 82 suites, 266 pass, 0 fail |

## 2. Orphan-suite classification

Six `tests/*.test.ts` files were absent from the `test` script. Evidence: all six were introduced in commits `d930f6c` / `8f1be81` (2026-07-10); `git show <commit>:package.json` shows none of them was ever listed in the `test` script. No workflow, script, or doc references any of them. So the exclusion is not demonstrably intentional, and classification rests on whether the subject module is live product code and whether the suite passes.

| Suite | Subject module | Subject is live? (importers) | Individual run | Classification |
|---|---|---|---|---|
| `tests/experimentation.test.ts` | `worker/experimentation.ts` | Yes: `kernel.ts`, `experimentationRoute.ts`, `trafficActivation.ts` | 5/5 pass | CANONICAL |
| `tests/policyResponse.test.ts` | `worker/policyResponse.ts` | Yes: `kernel.ts`, `governanceAutomation.ts` | 4/4 pass | CANONICAL |
| `tests/behaviorIntelligence.test.ts` | `worker/behaviorIntelligence.ts` | Yes: `kernel.ts`, `behaviorRoute.ts`, `experimentationRoute.ts`, `trafficActivation.ts` | 9/9 pass | CANONICAL |
| `tests/usage.test.ts` | `worker/usage.ts`, `worker/adaptation.ts` | Yes: `index.ts`, `kernel.ts`, `behaviorRoute.ts` | 5/5 pass | CANONICAL |
| `tests/governanceAutomation.test.ts` | `worker/governanceAutomation.ts` | Yes: `kernel.ts`, `experimentation.ts`, `behaviorIntelligence.ts` | 4/5 pass, 1 fail | CANONICAL, **failing on governance semantics** |
| `tests/adaptiveEntry.test.ts` | `src/lib/adaptiveEntry.ts` | Yes: `AdaptiveEntryHero.tsx`, `useAdaptiveEntryMode.ts` | 5/8 pass, 3 fail | CANONICAL, **failing on product copy** |

No suite was classified EXPERIMENTAL, SUPERSEDED, or INTENTIONALLY_EXCLUDED: every subject module is imported by the worker kernel or a live UI component, and no evidence of deliberate exclusion exists.

## 3. Changes made

- `package.json` `test` script: appended the four passing CANONICAL suites (`experimentation`, `policyResponse`, `behaviorIntelligence`, `usage`). No other file changed. No product logic touched.

## 4. After changes

| Check | Result |
|---|---|
| `npm test` | 289 tests, 90 suites, 289 pass, 0 fail (exit 0) |

## 5. Exclusions (not wired) and unresolved failures — Operator review required

### 5.1 `tests/governanceAutomation.test.ts` — 1 failure

- Case: `generateGovernanceProposals > proposes restrict_wildcard_operations when volatility exceeds threshold` (`tests/governanceAutomation.test.ts:62`)
- Assertion: `assert.equal(match.reason, "HIGH_RISK volatility")`
- Expected: `'HIGH_RISK volatility'`
- Actual: `'[Northstar P6: Recursive systems require depth limits, termination conditions, and escalation controls.] HIGH_RISK volatility'`
- Reading: `worker/governanceAutomation.ts` now prefixes proposal reasons with a Beacon Northstar principle citation. The test predates that. This is governance semantics (Beacon alignment of proposal reasons), not test wiring. Decision needed: (a) confirm the citation prefix is intended and update the assertion to match on suffix or principle tag, or (b) treat the prefix as drift. Not changed in this task.
- The other four cases in this suite pass, including `enter_defensive_mode` with reason `"sustained HIGH_RISK"` (unprefixed), so the prefix is applied selectively; the Operator should confirm which reasons are meant to carry citations.

### 5.2 `tests/adaptiveEntry.test.ts` — 3 failures

All three are in `getAdaptiveEntryCopy` and are CTA label drift between the test and `src/lib/adaptiveEntry.ts`:

| Case | Expected | Actual |
|---|---|---|
| shows a single CTA for confusion | `Enter System` | `Explore Pearl OS` |
| highlights marketplace for friction | `Explore Marketplace` | `Browse Products` |
| shows progression CTAs for engaged users | `Explore Modules` | `Browse Marketplace` |

- Reading: product copy changed after the test was written. The mode-resolution half of the suite (`resolveAdaptiveEntryMode`, 5 cases) passes. Decision needed: confirm current copy is canonical and update the three expected strings, or restore the old copy. Not changed in this task.

## 6. Reproduce

```
npm ci && npm run typecheck && npm test
node --import tsx --test tests/governanceAutomation.test.ts
node --import tsx --test tests/adaptiveEntry.test.ts
```

## 7. Auth / scope-lock

No auth, session, or scope-lock files were read for modification or changed. The tension recorded in `CLAUDE.md` stands as-is.
