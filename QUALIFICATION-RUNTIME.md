# QUALIFICATION-RUNTIME — runtime contract for the qualification engine (planning)

**Status:** PLANNING ONLY — no executor, no state machine. This document defines the
runtime *contract* over the type-level contract that already exists
(`src/future/pearl/qualificationContract.ts`). Implementation requires its own
Council packet. Option B (capture-first → qualification-after) is structural.
| **Date:** 2026-07-16

## 1. Lifecycle recap

```
CAPTURED → EXPERIENCE → QUALIFY → ROUTE → UPGRADE
```

Forward-only (type-enforced by `NextStage<S>`); stage payloads fixed by
`StagePayloads`; entity voices fixed by `STAGE_VOICE`.

## 2. Stage guards (what must be TRUE to be *in* a stage)

| Stage | Guard |
|---|---|
| CAPTURED | A register/lead record exists (`/api/register` KV record or enter-funnel lead) **with consent = true** |
| EXPERIENCE | CAPTURED + at least one authenticated-or-linked surface interaction after capture |
| QUALIFY | EXPERIENCE + at least one qualification answer stored against the capture id |
| ROUTE | QUALIFY + a recommendation computed (path + tier) and shown to the prospect |
| UPGRADE | ROUTE + an explicit prospect decision event (accept/downgrade/defer) |

Guard violations are contract errors: a runtime may never *display* a stage whose
guard is unmet (e.g. no ROUTE recommendation UI before answers exist).

## 3. Evidence gates (what proves a transition happened)

Every transition consumes only evidence the system already records — the flow plane
(`/api/flow/event` → `/api/flow/intelligence`) and register KV records. No new
telemetry is required to run qualification; that is deliberate.

| Transition | Evidence gate (all required) |
|---|---|
| → CAPTURED | `form_submit` on enter/register + register KV record id |
| CAPTURED → EXPERIENCE | ≥1 `page_view` on a governed surface with the capture's session id, after capture timestamp |
| EXPERIENCE → QUALIFY | `form_submit` (or step `cta_click`) carrying ≥1 objective answer |
| QUALIFY → ROUTE | recommendation rendered — `cta_impression` on the ROUTE recommendation module |
| ROUTE → UPGRADE | `cta_click` on an `upgrade-select-<tier>` or `catalog-acquire-*` CTA |

Rules: evidence is **append-only and replayable** (a runtime must be able to
recompute stage from the event log alone); absence of evidence means the *earlier*
stage — never optimistic advancement; evidence older than the capture record is
ignored (no retroactive qualification).

## 4. Entity voice bindings (runtime obligations)

| Stage | Voice (`STAGE_VOICE`) | Runtime obligation |
|---|---|---|
| CAPTURED | AURELIUS | Acknowledge capture; never re-ask captured fields |
| EXPERIENCE | GHOST | Show adaptation only where real (surfaces actually visited) |
| QUALIFY | AURELIUS | Questions reference known context ("you looked at scenario packs…") |
| ROUTE | BEACON | Recommendation phrased as governance, with the evidence summarized |
| UPGRADE | OPERATOR | Decision UI; system voice steps back — the human decides |

## 5. Option B invariants (hard)

1. No qualification question may appear before CAPTURED.
2. Failing/abandoning QUALIFY never revokes CAPTURED or EXPERIENCE.
3. ROUTE recommends; it never blocks a lower-tier choice.
4. The catalog stays browsable at every stage (ACCESS baseline, ENTITLEMENT-MODEL §4.5).

## 6. What implementation will require (blocked)

An evidence-reader over flow storage + register KV (read-only aggregation — decide:
extend `/api/flow/intelligence` vs. a new surface → new-endpoint review); a pure
`resolveStage(evidence[]) → QualificationState` function (the "runtime" is a fold,
not a persistent machine — recompute over append-only evidence, don't store stage);
UI mounting of the Track 3 scaffolds (wizard/checklist primitives). Each needs the
Council packet; none ships before it.
