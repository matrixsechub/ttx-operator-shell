# WIZARD-SCAFFOLD — extracted primitives + qualification contract

**Status:** SCAFFOLD ONLY (non-production). Nothing routes to these modules; no live
surface imports them. Structural wizard work stays blocked until R0 worker
restoration lands and Council review approves. Option B (capture-first →
qualification-after) is encoded throughout. | **Date:** 2026-07-16

## What exists (typechecked + brand-lint-governed, unwired)

### `src/future/pearl/WizardPrimitives.tsx`

| Primitive | What it is | What it is NOT |
|---|---|---|
| `WizardStepDef` / `WizardStepState` | Immutable step description + caller-owned position | Not persisted, not routed |
| `nextStep` / `prevStep` | Pure functions (clamped, side-effect-free) | Not navigation, not a machine |
| `WizardProgressRail` | "STEP n OF m" + segment bar (board frame ③); completed = `--entity-aurelius`, active = `--entity-ghost`, rest = `op-border` | No self-advancing state |
| `ObjectiveRadioGroup` | Controlled radio list ("What is your primary objective?") with native semantics | No answer storage, no scoring |
| `StepFrame` | Panel chrome for one step | — |

### `src/future/pearl/qualificationContract.ts`

The qualification lifecycle **contract** (types only, no executor):

```
CAPTURED → EXPERIENCE → QUALIFY → ROUTE → UPGRADE
```

- **Option B is structural:** the lifecycle *begins* at CAPTURED — there is no
  pre-capture stage to put qualification in front of.
- `StagePayloads` fixes what each stage may carry (capture source/consent; surfaces
  seen; raw answers; recommended path/tier; tier + packs). Scoring rules, routing
  rules, and persistence keys are deliberately absent — they are implementation, not
  contract, and are blocked.
- `NextStage<S>` makes stage-skipping and backward movement uncompilable against the
  contract.
- `STAGE_VOICE` binds each stage to its speaking entity (AURELIUS, GHOST, AURELIUS,
  BEACON, OPERATOR) so the emotional arc is type-checked (EMOTIONAL-ARC.md).

## Boundary compliance

| Blocked item | How the scaffold respects it |
|---|---|
| No multi-step wizard logic | Components are controlled; helpers are pure; nothing mounts them |
| No qualification state machines | Contract types only — no executor, no transitions at runtime |
| No new worker API surfaces | Scaffold is client-type-level only |
| No runtime persistence | No storage APIs referenced anywhere in `src/future/pearl/` |
| No structural funnel changes | `/enter` untouched; primitives live outside every router |

## Activation checklist (when unblocked)

1. R0 worker restoration lands; Council approves Track 2 Phase 2.
2. Mount `WizardProgressRail`/`StepFrame`/`ObjectiveRadioGroup` in a new `/enter`
   wizard; step 1 = capture (Option B), submitting through the EXISTING
   `/api/register*` + intake endpoints.
3. Emit `cta_click:enter-step-<n>-next` per transition (metrics contract in
   CONVERSION-MEMO.md §4).
4. Only then consider a runtime for `qualificationContract` — as its own Council
   packet.
