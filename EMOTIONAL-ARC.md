# EMOTIONAL-ARC — the governed emotional journey across surfaces

**Status:** DOCTRINE (documentation; the cue assignments it describes are live —
SURFACE-IDENTITY-MAP.md). | **Date:** 2026-07-16

The Pearl-Spectral system stages one deliberate emotional progression: a visitor
arrives uncertain and leaves in command. Each stage is voiced by the entity whose
function creates that feeling, and the stage→voice binding is type-checked in
`src/future/pearl/qualificationContract.ts` (`STAGE_VOICE`).

## The arc

```
 ORIENTATION → RECOGNITION → TRUST → BELONGING → ADAPTATION → COMMAND
 (BEACON)      (AURELIUS)    (HSX)   (AURELIUS)  (GHOST)      (OPERATOR)
```

| Stage | Feeling engineered | Voice | Live surfaces |
|---|---|---|---|
| **Orientation** | "I can see the whole governed map; nothing here will trick me." | BEACON | `/`, `/start`, `/root-funnel`, `/services`, `/status` |
| **Recognition** | "It understood what I'm trying to do." | AURELIUS | `/enter`, `/intake` (lifecycle: CAPTURED) |
| **Trust** | "My identity is guarded, not harvested." | HSX | `/register`, `/login` |
| **Belonging** | "There's a catalog of things meant for my mission." | AURELIUS | marketplace (cockpit + storefront); lifecycle: QUALIFY |
| **Adaptation** | "The system is adjusting to me." | GHOST | `/onboarding`, TTX suite, `/join` (lifecycle: EXPERIENCE) |
| **Command** | "I decide; the system executes and reports." | OPERATOR | `/dashboard`, `/ops/deploy` (lifecycle: UPGRADE) |

## Doctrine rules

1. **One voice per surface.** Mixed voices read as noise; the lint enforces cue
   presence (R13), this document governs *which* voice.
2. **The arc only rises.** A surface may never move the visitor emotionally backward
   (e.g. a trust-stage surface must not reintroduce orientation copy or command
   chrome). Option B is this rule applied to conversion: capture (Recognition)
   happens before interrogation (Belonging/QUALIFY), so no one is asked to invest
   before being acknowledged.
3. **Command is earned last.** OPERATOR voice appears only behind the auth boundary.
   Public surfaces may reference command ("Enter Operator Cockpit") but never speak
   in it.
4. **Protection speaks quietly.** HSX cues state facts ("authentication routes
   through the security plane"), never fear. Trust is built by procedure, not threat.
5. **Adaptation is shown, not claimed.** GHOST cues appear only where the surface
   actually adapts (TTX scoring, activation state) — an adaptive claim on a static
   surface is a conformance violation.

## Tier mapping (planning — UPGRADE-PATH.md)

The subscription ladder replays the same arc at account level: ACCESS trial =
Orientation/Adaptation (BEACON/GHOST), OPERATOR = Command (OPERATOR), OPS DIVISION =
team-scale Command, ENTERPRISE = governed-at-scale (BEACON returns as compliance
voice). Marketplace packs are Belonging purchases and stay AURELIUS-voiced.
