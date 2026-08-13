# WIREFRAMES — Pearl-Spectral Track 2 (Correspondence) target surfaces

**Status:** PLANNING ONLY — these are paper wireframes keyed to the Pearl-Spectral
reference boards. Nothing here is implemented; structural build is gated on Council
review. Option B (capture-first → qualification-after) ordering is shown as the
default. | **Date:** 2026-07-16 | **Companion docs:** [REBUILD-PLAN.md](REBUILD-PLAN.md),
[CONVERSION-MEMO.md](CONVERSION-MEMO.md)

Entity voice legend (tokens already live from Track 1):
`[B]` BEACON governs · `[A]` AURELIUS interprets · `[H]` HSX trains & protects ·
`[G]` GHOST evolves & adapts · `[O]` OPERATOR decides

---

## W1 — SPLASH (replaces legacy `public/splash.html`)

Ref: boards 1/5 (frame ①), homepage frames. Pearl-light ground, cinematic center stage.

```
+--------------------------------------------------------------------------+
| MSHOPS.NET  SPECIFY.GOVERN.DELIVER.GROW.        [Solutions][Pricing][...] |
|                                                          [ GET STARTED ]  |
+--------------------------------------------------------------------------+
|  AI AGENCY OPERATING SYSTEM                                               |
|  GOVERNED AUTONOMY.                    ( BEACON )        [B] governs      |
|  REAL OUTCOMES.                     .-~ trinity ~-.                       |
|  OPERATOR CONTROL.            (AURELIUS)  (GHOST)  (HSX)                  |
|                                [A]         [G]      [H]                   |
|  MSHOPS.NET unifies AI agents, automation, and operational               |
|  intelligence into a governed ecosystem. You stay in command.            |
|                                                                           |
|  [ START MISSION ]   [ WATCH DEMO ]                                       |
|                                                                           |
|  | 500+ SYSTEMS | 99.99% UPTIME | 24/7 OVERSIGHT | 100% DATA OWNERSHIP |  |
+--------------------------------------------------------------------------+
```

Notes: entity trinity is presentational (images + `--entity-*` accents), not
interactive. `START MISSION` routes to W2. All copy tokens verified by lint R4 against
the pearl ground once the `--pearl-*` namespace lands (REBUILD-PLAN Phase 1).

## W2 — ROOT-FUNNEL mission-path picker (rework of `public/root-funnel.html`)

Ref: board frame ② "WHAT CAN WE HELP YOU BUILD? — select a mission path".

```
+--------------------------------------------------------------------------+
|  [B] BEACON · Governs northstar — paths stay inside the governed boundary |
|                                                                           |
|  WHAT CAN WE HELP YOU BUILD?                                              |
|  Select a mission path to begin.                                          |
|                                                                           |
|  +--------------+  +--------------+  +--------------+                     |
|  | AI           |  | AI AGENTS    |  | CYBERSECURITY|                     |
|  | AUTOMATION   |  | deploy       |  | secure       |                     |
|  +--------------+  +--------------+  +--------------+                     |
|  +--------------+  +--------------+  +--------------+                     |
|  | DATA &       |  | INFRA-       |  | CONSULTING   |                     |
|  | INTEGRATION  |  | STRUCTURE    |  | strategy     |                     |
|  +--------------+  +--------------+  +--------------+                     |
|                                                                           |
|  Not sure? [ Run a Diagnostic Scan → ]          (deferred: diagnostic)    |
+--------------------------------------------------------------------------+
```

Notes: each tile = a `data-flow-cta="root-funnel-path-<slug>"` link into W3 carrying
`?path=<slug>` (same query-context mechanism enter.js uses today). No picker logic
beyond a link grid. "Diagnostic Scan" is deferred scope — rendered as a link to
`/services` selector until its own packet exists.

## W3 — ENTER guided wizard (rework of `public/enter.html`) — Option B ordering

Ref: board frame ③ "Let's understand your mission" (STEP 2 OF 5).

```
 STEP RAIL:  (1) Contact  (2) Objective  (3) Context  (4) Confirm  (5) Done
             ●───────────○──────────────○────────────○────────────○
+--------------------------------------------------------------------------+
|  [A] AURELIUS · Interprets intent — answers shape the guided path          |
|                                                                           |
|  STEP 1 — Where should we send your mission blueprint?      (Option B:    |
|    Email [________________________]   [x] updates consent    capture      |
|    [ CONTINUE → ]  → form_submit(/api/register-queue-compatible capture)  |
|                                                                           |
|  STEP 2 — What is your primary objective?                                 |
|    ( ) Improve efficiency / reduce manual work                            |
|    ( ) Enhance security / reduce risk                                     |
|    ( ) Integrate systems or data                                          |
|    ( ) Build or deploy AI capabilities                                    |
|    ( ) Other [____________]                                               |
|    [ ← BACK ]                                    [ NEXT → ]               |
|                                                                           |
|  STEP 3 — Context (team size, timeline, current stack)   — enrichment     |
|  STEP 4 — Confirm summary (AURELIUS voice restates the mission)           |
|  STEP 5 — Done → routes to W4 REGISTER (full account) or exit             |
+--------------------------------------------------------------------------+
```

Notes: steps 2–5 enrich the step-1 capture (Option B). Client-side step display only —
the same pattern onboarding.js already uses (stage array + `.is-active`), no state
machine and no new endpoints. Every step transition emits
`cta_click:enter-step-<n>-next`.

## W4 — REGISTER (visual rework only of `public/register.html`)

Ref: board frame ④ "Create your secure account".

```
+--------------------------------------------------------------------------+
|  [H] HSX · Trains & protects — requests route through the security plane  |
|                                                                           |
|  CREATE YOUR SECURE ACCOUNT TO CONTINUE                                   |
|    Full name  [______________________________]                            |
|    Email      [______________________________]  (prefilled from W3)       |
|    Password   [______________________________]  [############---] Strong  |
|    [x] I agree to the Terms of Service and Privacy Policy                 |
|                                                                           |
|                [ CREATE ACCOUNT → ]     Already registered? Sign in       |
+--------------------------------------------------------------------------+
```

Notes: same capture contract as today (`/api/register*`); the strength meter is
client-side presentation. HSX accent = `--entity-hsx` family.

## W5 — ONBOARDING activation checklist (rework of `public/onboarding.html`)

Ref: board frame ⑤ "Welcome aboard! Let's activate your ecosystem".

```
+--------------------------------------------------------------------------+
|  [G] GHOST · Evolves & adapts — activation adjusts to your registration   |
|                                                                           |
|  WELCOME ABOARD — LET'S ACTIVATE YOUR ECOSYSTEM                           |
|    [✓] Account Created                                                    |
|    [✓] Profile Setup                                                      |
|    [✓] Mission Diagnostic            (from W3 answers)                    |
|    [◐] System Blueprint              In Progress                          |
|    [ ] Access Granted                Pending                              |
|                                                                           |
|  OVERALL PROGRESS  [############------------------]  60%                  |
|                                                                           |
|  [ ENTER OPERATOR COCKPIT ]   [ EXPLORE MARKETPLACE ]                     |
+--------------------------------------------------------------------------+
```

Notes: checklist state derives from data the funnel already produced (registration +
wizard answers), rendered client-side. "Access Granted / cockpit online" keeps the
existing coming-online banner contract. Funnel terminates at the existing auth
boundary — cockpit unchanged.

---

## Shared doctrine (all wireframes)

- Entity voice strip (Track 1 component `.entity-voice`) appears exactly once per
  surface, entity per the legend above.
- Contrast ≥ 4.5:1 on final ground color; decorative motion behind
  `prefers-reduced-motion`; every interactive element keeps `:focus-visible` — all
  three already CI-gated by `scripts/ci/brand-conformance-lint.mjs`.
- Every CTA shown carries a `data-flow-cta` id so W1–W5 are measurable against the
  Phase 0 baseline (CONVERSION-MEMO §4).
