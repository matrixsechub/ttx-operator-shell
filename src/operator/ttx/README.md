# MSH TTX

MatrixSecHub's Tabletop Exercise (TTX) SaaS module. Lets an operator build a scenario, define
timed injects, assign roles, run a session, and score the result — without leaving the cockpit.

Mounted at `/ttx/*` (see `index.tsx` and `src/routes/router.tsx`). Tabs: Builder, Injects,
Timeline, Roles, Score, Packs.

## Files

| File | Purpose |
|---|---|
| `index.tsx` | Shell: tab nav + `<Outlet />`, wraps everything in `OperatorShell` |
| `builder.tsx` | Scenario builder form (local state only — save is disabled until persistence exists) |
| `injects.tsx` | Inject list for the active scenario |
| `timeline.tsx` | Visual playback timeline of injects |
| `roles.tsx` | Operator roles (Facilitator, Player, Observer, White Cell, Evaluator) — falls back to a default taxonomy when the engine is unreachable |
| `score.tsx` | Scoring engine view |
| `types.ts` | `TTXScenario`, `TTXInject`, `TTXOperatorRole`, `TTXSession`, `TTXScoreEntry` |
| `service.ts` | `/api/ttx/*` client stubs, reusing `request()` from `src/lib/apiClient.ts` |

## Status

This is a UI scaffold. None of `/api/ttx/*` exists on the engine yet — every fetch in this module
goes through the real Worker proxy and will surface a real (graceful) error until those routes are
built. Nothing here is mocked or faked.

## Marketplace hook

The "Packs" tab renders `TTXPacksCategory` (`src/pages/marketplace/TTXPacksCategory.tsx`) in
embedded mode, surfacing scenario packs, inject bundles, and division-specific TTX modules from
the marketplace catalog (filtered by the `ttx` / `ttx-pack` / `scenario-pack` tags). The same
category is also reachable standalone at `/marketplace/ttx-packs`.

## Future expansion

- Persist scenarios via `ttxService.createScenario` once `/api/ttx/scenarios` exists on the engine.
- Live session runtime (start/pause/fire-inject) — `TTXSession` in `types.ts` is defined but unused
  so far; this is where it plugs in.
- Real-time playback during a live session (the current timeline is read-only/static).
- Division integration: scope scenarios to a `Division` (`src/pages/divisions/data.ts`) beyond the
  free-text `division` field on `TTXScenario`.
- Multi-operator session view (concurrent players, not just a single operator's perspective).
