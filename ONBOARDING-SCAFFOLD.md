# ONBOARDING-SCAFFOLD — activation checklist primitives

**Status:** SCAFFOLD ONLY (non-production). No live surface imports these; the
shipped `/onboarding` pager is unchanged. Checklist *logic* stays blocked until R0
worker restoration + Council review. | **Date:** 2026-07-16

## What exists (`src/future/pearl/ChecklistPrimitives.tsx`)

Presentational vocabulary for the future activation tracker (reference board frame
⑤: Account Created → Profile Setup → Mission Diagnostic → System Blueprint → Access
Granted):

| Primitive | What it is | What it is NOT |
|---|---|---|
| `ChecklistItemDef` (`complete/active/pending` + note) | Caller-supplied row model | No status derivation |
| `ChecklistItem` | Row with `[x] [~] [ ]` glyphs; complete = `--entity-aurelius`, active = `--entity-ghost`, pending = `op-text-dim` | — |
| `ChecklistProgress` | Clamped percentage bar (`--entity-ghost` fill) | No progress computation |
| `ActivationChecklist` | Panel composing rows + progress | No data fetching, no persistence |

GHOST is the surface voice (activation adapts), consistent with the live
`/onboarding` cue and `STAGE_VOICE.EXPERIENCE`.

## Relationship to the shipped surface

Today's `/onboarding` is a five-stage informational pager (`onboarding.js` +
`public/styles/onboarding.css`, restored in Track 1). The Track 2 rebuild replaces
the pager body with `ActivationChecklist` **without changing the page's route, capture
(`onboarding-enter-cockpit` CTA), or auth boundary**. Item status will derive from
data the funnel already produces (registration + wizard answers) client-side; any
server-derived status needs its own Council packet (would touch worker surfaces —
blocked).

## Boundary compliance

No onboarding checklist logic (status/progress are props), no new worker API
surfaces, no runtime persistence, no structural change to `/onboarding` — the
scaffold is rendering vocabulary only.
