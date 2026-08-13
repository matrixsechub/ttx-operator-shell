# SURFACE-IDENTITY-MAP — entity voice per governed surface

**Status:** IMPLEMENTED (Track 3) — this map documents live cue assignments; the
brand-conformance lint (R13) enforces the React rows marked *enforced*. |
**Date:** 2026-07-16

The entity cast (tokens: `public/styles/entity-tokens.css`; cue component:
`.entity-voice` / `src/components/EntityVoice.tsx`):

| Entity | Role | Accent |
|---|---|---|
| **BEACON** | Governs (northstar) | pearl white `--entity-beacon` |
| **AURELIUS** | Interprets intent | champagne gold `--entity-aurelius` |
| **HSX** | Trains & protects | ember `--entity-hsx` |
| **GHOST** | Evolves & adapts | spectral cyan `--entity-ghost` |
| **OPERATOR** | Decides | authority gold `--entity-operator` |

**Doctrine:** one voice cue per surface; the entity chosen is the one whose function
the surface *performs* for the visitor. BEACON speaks where governance/orientation is
the point; AURELIUS where intent is read; HSX where protection is the promise; GHOST
where the system adapts; OPERATOR where a human decides.

## Funnel surfaces (static HTML — cue live since Track 1)

| Surface | Entity | Rationale |
|---|---|---|
| `/root-funnel` | BEACON | Governed entry — path selection under northstar |
| `/services` | BEACON | Selector recommends only governed paths |
| `/enter` | AURELIUS | Guided intake reads intent |
| `/intake` | AURELIUS | Context carried forward |
| `/register` | HSX | Access requests route through the security plane |
| `/onboarding` | GHOST | Activation adapts to registration |
| `/start` | BEACON | Orientation before commitment |

## OS surfaces (React — cue live in Track 3, lint-enforced R13)

| Surface (component) | Entity | Rationale |
|---|---|---|
| Dashboard / cockpit (`src/pages/Dashboard.tsx`) | OPERATOR | Every panel reports; the operator decides |
| Cockpit marketplace (`src/pages/Marketplace.tsx`) | AURELIUS | Catalog read against mission context |
| Public storefront (`src/pages/StorefrontMarketplace.tsx`) | AURELIUS | Public catalog interpretation |
| System status (`src/pages/Status.tsx`) | BEACON | Kernel state is the governance signal of record |
| Operator login (`src/pages/Login.tsx`) | HSX | Perimeter surface; auth via security plane |
| Ecosystem splash (`src/pages/EcosystemSplash.tsx`) | BEACON | Governed map of the public ecosystem |
| Live TTX join (`src/pages/LiveJoin.tsx`) | GHOST | Exercise adapts as the group votes |
| TTX suite (`src/operator/ttx/index.tsx`) | GHOST | Simulation adapts to scenario decisions |
| Deploy ops (`src/pages/ops/DeployOps.tsx`) | OPERATOR | Deploys move only when the operator moves them |
| FedGrade ops (`src/pages/ops/FedGradeOps.tsx`) | BEACON | Advisory, non-certifying posture |
| Security ops (`src/pages/ops/SecurityOps.tsx`) | HSX | Security plane watched continuously |

## Assigned but not yet cued (documented for future passes)

| Surface | Entity | Note |
|---|---|---|
| Divisions / Systems / About / Future (cockpit pages) | BEACON | Registry/orientation surfaces; cue in a later conformance pass |
| Council surface (`/council`) | BEACON | Governance chamber |
| Static operator consoles (`public/*-operator.html`) | OPERATOR | Worker-facing UI; also excluded from growth capture (lint R14) |
| Static tool pages (`public/ai-*`, `rag-*`, `security-*`, …) | AURELIUS | Planner/diagnostic tools read intent |

## Qualification lifecycle voices (contract-level, Track 3 scaffold)

Stage → voice is type-checked in `src/future/pearl/qualificationContract.ts`:
CAPTURED → AURELIUS · EXPERIENCE → GHOST · QUALIFY → AURELIUS · ROUTE → BEACON ·
UPGRADE → OPERATOR.
