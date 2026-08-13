# CONVERSION-MEMO — Funnel ordering decision (Option A vs Option B)

**Status:** PLANNING ONLY — decision input for Council review. **Option B is the
standing default until Council rules otherwise.** | **Date:** 2026-07-16 |
**Companion docs:** [REBUILD-PLAN.md](REBUILD-PLAN.md), [WIREFRAMES.md](WIREFRAMES.md)

---

## 1. The question

When the Track 2 guided wizard replaces the single-form `/enter` surface, where does
contact capture sit relative to qualification questions?

- **Option A — qualification-first:** visitor answers mission/objective questions
  (reference board frame 3, "What is your primary objective?"), then is asked for
  contact details, then registers.
- **Option B — capture-first → qualification-after (DEFAULT):** visitor gives minimal
  contact identity early (email + consent), qualification questions follow, and
  answers enrich an already-captured lead.

## 2. Why Option B is the default

1. **Every abandoned wizard is still a lead.** With A, a visitor who answers three
   questions and leaves is zero signal we can act on; with B the same visitor is a
   contactable lead with partial qualification attached. Wizard drop-off between steps
   is the norm, not the exception, so B converts abandonment into pipeline.
2. **It matches the machinery we already have.** The worker already exposes
   `/api/register`, `/api/register-lifecycle`, `/api/register-queue`,
   `/api/register-security` and the flow capture plane (`/api/flow/event`,
   `/api/flow/intelligence`). B is expressible as *ordering of existing calls*; A
   requires holding qualification state until capture, which pushes toward client
   state machines and new API surfaces — both outside the boundary.
3. **Risk asymmetry.** If B is wrong, cost is a slightly earlier email field and
   possibly lower-quality early leads. If A is wrong, cost is silent loss of every
   partial completion. B's failure mode is measurable and recoverable; A's is
   invisible.
4. **Doctrine fit.** Capture-first keeps qualification a *presentation-layer* concern
   (question order in the wizard), which is exactly the scope Track 2 is allowed to
   plan. Qualification-first tempts server-side scoring — explicitly deferred.

## 3. What would flip the decision to Option A

Council should consider A only if the Phase 0 baseline shows **both**:
- form-start → form-submit conversion on the current single form is already high
  (little to lose from later capture), **and**
- lead quality complaints dominate (sales time wasted on unqualified leads outweighs
  lost volume).

Neither can be argued today because CTA/form capture only became fully instrumented in
Track 1. Two weeks of `/api/flow/intelligence` baseline is the minimum evidence bar.

## 4. Metrics contract (both options measured identically)

All from the existing flow plane — no new API surfaces:

| Metric | Source event | Funnel stage |
|---|---|---|
| Surface reach | `page_view` (root-funnel, services, enter, register, onboarding) | Top |
| CTA engagement | `cta_impression` → `cta_click` per `data-flow-cta` id | Top → mid |
| Capture start | `form_start` on enter/register forms | Mid |
| Capture complete | `form_submit` | Mid → bottom |
| Wizard step progression (Track 2) | `cta_click` per step id (naming convention: `enter-step-<n>-next`) | Mid |
| Activation | onboarding `page_view` + `onboarding-enter-cockpit` click | Bottom |

Decision metric: **captured-lead rate per funnel entry** (B optimizes this) weighed
against **qualified-lead ratio** (A optimizes this). Council packet should pre-commit
the weighting before results exist.

## 5. Boundary reminder

This memo plans measurement and ordering only. No qualification logic, scoring, lead
routing, state machines, or new worker endpoints are proposed here; any of those
requires a separate Council packet.
