# WIZARD-IMPLEMENTATION — implementation record (Track 5)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Design refs:** WIZARD-SCAFFOLD.md,
WIREFRAMES.md W3/W5, board frame ③/⑤

## 1. What shipped

**`src/pearl/onboardingWizard.tsx`** — the live 5-step wizard, mounted at
**`/onboarding`** on the ecosystem surface (Council-approved replacement of the
static pager):

| Step | Voice | Action | Evidence emitted |
|---|---|---|---|
| 1 Contact | AURELIUS | email + consent → `POST /api/register` (existing contract; register_id becomes the captureId, kept in sessionStorage) | anchor + `surface_visit` |
| 2 Objective | AURELIUS | `ObjectiveRadioGroup` (5 mission objectives) | `answer(objective)` |
| 3 Context | AURELIUS | team-size radio | `answer(team_size)` |
| 4 Blueprint | BEACON | recommendation from `recommendPath(objective, teamSize)` — path + tier, explicitly "never a wall" | `route_shown` |
| 5 Activation | OPERATOR | `ActivationChecklist` + decision CTAs (proceed toward recommended tier / stay on ACCESS) → marketplace & login handoffs | `upgrade_decision` |

Step progression uses the promoted primitives (`WizardProgressRail`, `StepFrame`,
`nextStep`/`prevStep`); logic lives in the wizard, primitives stay controlled.

## 2. Routing swap (structural)

- `worker/funnelRecovery.ts`: `"/onboarding"` removed from `PUBLIC_ROUTE_MAP`.
- `worker/surfaceRegistry.ts`: `/onboarding` → **ecosystem** surface
  (`ecosystem-shell.html`); verified: `resolveHtmlSurface("/onboarding") === "ecosystem"`.
- `src/routes/ecosystemRouter.tsx`: `/onboarding` renders `OnboardingWizard` inside
  the `FlowTracker` layout.
- `public/onboarding.html` stays in-repo (reachable only as a direct `.html` asset);
  every other funnel route is untouched.

## 3. Option B compliance

Capture is step 1 — no qualification question renders before a consented capture
exists; abandoning at any later step leaves a contactable lead with partial evidence;
the ROUTE recommendation never blocks a lower tier ("Stay on ACCESS" is always
offered); the catalog stays browsable throughout.

## 4. PRISM capture

Impressions + clicks on every step CTA (`onboarding-wizard-capture-continue`,
`-objective-continue`, `-context-continue`, `-blueprint-continue`,
`-decision-accept/defer`, `-explore-marketplace`, `-enter-cockpit`), `form_submit`
on capture, route-change `page_view` via the ecosystem FlowTracker, dynamic-CTA
impressions via the Track 5 prismTracker.

## 5. Doctrine

Entity voice per step via `EntityVoice` + `STAGE_VOICE`; op-*/entity-* utilities only
(lint R9–R11); wizard is a lint-enforced voice surface (R13); focus-visible on inputs;
no decorative motion added.
