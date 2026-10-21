# Independent Income Engine v1.0 — Phase 1 review bundle

**Status:** SOURCE-ONLY / SYNTHETIC / NOT MERGED / NOT DEPLOYED.

Source baseline: `matrixsechub/ttx-operator-shell` main `b8a68fbbd2ae931fa01bdc87c1fcf69e3b4edbcb` observed on 2026-10-21. The actual user's local worktree could not be accessed. This bundle was produced in an empty isolated staging directory rather than committed or pushed into that repository. The GitHub SOP requires branch/PR review before mainline changes; the user prohibited deployment and external activation.

## Modules

- `contracts.ts` — opportunity, evidence, ledger, scoring, brief contracts.
- `validation.ts` — money, time and state-transition guards.
- `evidence.ts` — claim-specific evidence qualification and conflict detection.
- `opportunity.ts` — deterministic provider identity and deduplication.
- `qualification.ts` — P0–P4 priority and DO/TEST/HOLD/REJECT recommendations, with unknown ranges.
- `accounting.ts` — posted income, approved receivables, allocation, reversals and Mac recovery.
- `brief.ts` — deterministic three-action cap; confirmed work prioritized.
- `governance.ts` — source-only capability denylist; not a substitute for Beacon.
- `index.ts` — public exports.

## Verification (from compatible repository root)

Node 22.16+:

```sh
node --experimental-strip-types --test tests/iie/*.test.ts
```

TypeScript standalone strict no-emit verification (global TypeScript with NodeNext):

```sh
tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions shared/iie/index.ts
```

No `npm install`, migrations, connector reads, or network I/O required.

These commands are outside the repository `npm test` script and `tsconfig.app.json` include paths (`src` and `shared/flywheel` only). Do not treat a green pull-request test job as coverage of this module.

## Limits and safety

- All tests use fabricated platform names, transactions and time entries.
- No financial statement is claimed complete unless sources were reconciled; this source-only brief explicitly states `SYNTHETIC_ONLY`.
- `preTaxCashAfterExpensesMinor` is **not** after-tax spendable take-home.
- E4 approval proof is required for approved earning status and E5 posted-payment proof for cash, and all amounts are integer minor units.
- `RATE` promotion uses the exact `termsEvidenceId`. That record must itself be verified, claim `RATE`, meet E3 for agreed pay or E1 for advertised pay, be observed at or before as-of (and inside `maximumAgeDays` when the caller sets it), and assert `currency:amountMinor:unit`. A different evidence id cannot lend its level. Conflicting qualifying `RATE` values still block promotion.
- Approved earnings require a qualifying `WORK_APPROVED` record whose asserted value is `JSON.stringify([id, assignmentId, payer, currency, amountMinor])`. Posted cash requires a qualifying `PAYMENT_POSTED` record whose asserted value is `JSON.stringify([source, externalId, currency, amountMinor, direction, classification])`. Reuse of that record for a different earning or receipt is rejected. Partial receipts and reversals remain valid when their own subjects match. Duplicate `source` + `externalId` rows still count once.
- `generateIncomeBrief` deduplicates on provider and external id before qualification. Duplicate observations cannot silently regress to an unreachable earlier stage or replace agreed pay with a different currency, amount, unit, or terms evidence id. Equal stages keep the later observation and the union of evidence ids.
- Missing or conflicting evidence prevents promotion. Incomplete coverage is not evidence of zero real cash.
- `npm test` and `tsconfig.app.json` do not include `shared/iie` or `tests/iie`. Those files are invoked directly. This mission does not change existing package scripts or TypeScript project config, so pull-request CI does not run these tests or this typecheck.
- This domain is **not** a production authorization engine. Neither CHAMBER PASS nor Beacon metadata grants execution permissions here.
- Existing `worker`, `msh-ops`, `src`, Beacon, Flywheel, CHAMBER, Wrangler, CI, environment, and authentication paths are not modified.
- No persistence or delivery adapters are provided. All state remains in caller-supplied in-memory fixtures.
- Priority score bands are an initial policy proposal, not verified market economics; unknown weights are represented as lower/upper bounds.
- No estimate of selection probability is manufactured.

## Release gates before any GitHub write

1. Operator selects an exact branch/PR path under the MSH-OPS GitHub SOP and supplies accessible local worktree or confirms no local worktree is in use.
2. Verify fresh remote HEAD and local `git status --porcelain=v1` before applying.
3. Review source changes and test output against that exact baseline.
4. Obtain separate approval to push and trigger any GitHub/CI/preview effects.
5. Do not merge without independent reviews and explicit Operator merge authority.
