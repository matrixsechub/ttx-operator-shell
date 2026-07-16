# REBUILD-PLAN — Pearl-Spectral Track 2 (Correspondence)

**Status:** PLANNING ONLY — nothing in this document is implemented. Implementation is
gated on Council review. | **Date:** 2026-07-16 | **Companion docs:**
[CONVERSION-MEMO.md](CONVERSION-MEMO.md), [WIREFRAMES.md](WIREFRAMES.md)

---

## 1. Two-track doctrine recap

- **Track 1 — Conformance (DONE, committed on this branch):** the existing funnel now
  speaks the entity identity system (`--entity-*` tokens, voice cues), obeys token
  discipline (CI-gated brand-conformance lint, `npm run lint:brand`), and has full
  capture coverage (flow-tracker on every funnel surface, `data-flow-cta` on primary
  CTAs). No structure changed.
- **Track 2 — Correspondence (THIS PLAN, not implemented):** rebuild the funnel so its
  structure *corresponds* to the Pearl-Spectral OS reference set (splash → root-funnel
  mission-path picker → guided wizard → register → onboarding checklist → cockpit
  handoff), in the pearl/light cinematic visual language of the reference boards.

### Hard boundary (in force until Council review)

No structural funnel changes. No wizard logic. No mission-path picker. No onboarding
checklist. No new worker API surfaces. No qualification logic. No state machines.
**Option B (capture-first → qualification-after) is the default posture** — see
CONVERSION-MEMO.md for the decision analysis.

---

## 2. Reference correspondence targets

From the Pearl-Spectral reference boards (design system sheet + homepage/splash/trinity
frames):

| Ref surface | Corresponds to (today) | Target state |
|---|---|---|
| 1. SPLASH — "Governed Autonomy. Real Outcomes. Operator Control." | `public/splash.html` (legacy dark Tron system, self-contained) | Pearl-light cinematic splash; entity trinity (BEACON / AURELIUS / HSX / GHOST) presented as the system's governing cast; `START MISSION` + `WATCH DEMO` CTAs |
| 2. ROOT-FUNNEL — "What can we help you build?" mission-path grid | `public/root-funnel.html` (flat CTA row) | Six-path mission picker (AI Automation, AI Agents, Cybersecurity, Data & Integration, Infrastructure, Consulting) |
| 3. ENTER — "Let's understand your mission" step wizard (Step 2 of 5) | `public/enter.html` (single lead form) | Multi-step guided wizard with progress bar; objective → context → capture |
| 4. REGISTER — "Create your secure account" | `public/register.html` (access-request form) | Same capture fields, HSX-voiced security framing, strength meter, ToS gate |
| 5. ONBOARDING — activation checklist (Account → Profile → Diagnostic → Blueprint → Access) | `public/onboarding.html` (5-stage informational pager) | Checklist-style activation tracker with per-item status and overall progress |
| 6. Cockpit handoff (ATLAS operator cockpit) | `/dashboard` (operator shell, auth-gated) | Unchanged surface; funnel ends at the existing auth boundary |

Everything above the auth boundary stays public-safe; the cockpit itself is **out of
scope** for Track 2.

## 3. Phasing

### Phase 0 — Prerequisites (can start pre-Council, no boundary risk)
- Capture baseline funnel metrics from `/api/flow/intelligence` (now meaningful, since
  Track 1 turned on CTA capture). Two weeks of baseline minimum before any structural
  A/B claim.
- Pearl-light theme spike as **tokens only**: a `--pearl-*` namespace prototype in a
  branch, validated by the existing brand lint (extend `PURE_TOKEN_FILES`). No page
  consumes it yet.
- Asset production: entity orb/trinity imagery, MSHOPS mark on light ground (reference
  board frames 4–5).

### Phase 1 — Visual correspondence (needs Council sign-off on theme, not on structure)
- Introduce the pearl-light theme on funnel surfaces *without changing structure*:
  same DOM, new token values behind a `data-theme="pearl"` opt-in.
- splash.html retirement path: replace the legacy self-contained Tron page with a
  token-system page (it is the last surface with an embedded rogue design system —
  currently carried as a lint-exempted legacy token source).
- Exit gate: brand lint green with the pearl namespace; contrast doctrine (4.5:1) holds
  on light ground (the lint's R4 must be extended to check entity tokens against the
  pearl background too, not just `--bg`).

### Phase 2 — Structural correspondence (BLOCKED on Council review)
- Mission-path picker on root-funnel (6 paths, carries `path` context into `/enter`).
- Guided wizard on `/enter` (steps; Option B ordering: capture email at step 1–2,
  qualification questions after — see CONVERSION-MEMO).
- Onboarding checklist rework (status-tracked items replacing the informational pager).
- Implementation constraints when unblocked:
  - Client-side step state only; **no new worker API surfaces** — the wizard submits to
    the existing `/api/register*` + intake endpoints and emits `flow` events per step.
  - No server-side qualification logic; qualification remains a UI-ordering concern
    until a separate Council packet approves more.
  - Every step emits `cta_impression`/`cta_click`/`form_start`/`form_submit` through
    the existing flow-tracker so Phase 2 is measurable against the Phase 0 baseline.

### Phase 3 — Measure and iterate
- Compare funnel completion vs baseline (see CONVERSION-MEMO §4 for the metric set).
- Rollback: each phase ships behind its own commit boundary on a release branch;
  `wrangler rollback` covers deploy-level reverts (ROLLBACK.md).

## 4. Risks

| Risk | Mitigation |
|---|---|
| Pearl-light theme breaks contrast doctrine (light ground is less forgiving) | Lint R4 extension in Phase 1 gate; a11y-mode remains dark high-contrast |
| Wizard increases drop-off vs single form | Option B ordering (capture first); Phase 0 baseline makes regression visible |
| Scope drift toward retired fictional systems (SCOPE-LOCK.md) | Plan names only real files/endpoints; anything not in the repo today is flagged as new work, not assumed |
| splash.html replacement regresses SEO/entry traffic | Keep URL and meta contract; verify with `scripts/verify-splash-routing.mjs` |

## 5. Explicitly deferred (needs its own Council packet)

Qualification scoring, lead routing rules, any state machine (client or worker), any
new `/api/*` surface, mission-diagnostic scan, marketplace changes, cockpit changes.
