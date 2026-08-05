# MSH TTX

MatrixSecHub's Tabletop Exercise (TTX) SaaS module. Lets an operator author a scenario, start a
session, and read back the score, history, and aggregate intelligence the Worker derives from it.

Mounted at `/ttx/*`. The child route list is registered **twice** — `src/routes/router.tsx` (the
main app, via `src/main.tsx`) and `src/routes/cockpitRouter.tsx` (via
`src/entries/cockpit-main.tsx`). They are byte-identical by convention; a route added to only one
ships to only half the surfaces.

Tabs: Builder, Injects, Timeline, Roles, Score, History, Intelligence, Packs.

## Files

| File | Purpose |
|---|---|
| `index.tsx` | Shell: scenario picker, session start control, tab nav, `<Outlet />`, wrapped in `OperatorShell` |
| `ScenarioContext.tsx` | Loads the merged scenario list once on mount; holds the selected scenario id (in memory only — not persisted) |
| `scenarioBridge.ts` | Adapts the Worker's real graph-engine types into this module's shapes; the load-bearing file |
| `builder.tsx` | Scenario authoring form — really persists via `POST /api/ttx/local-scenarios/create` |
| `injects.tsx` | Read-only inject list derived from the selected scenario's graph nodes |
| `timeline.tsx` | Static visual timeline of those derived injects |
| `roles.tsx` | Operator role taxonomy — falls back to a hardcoded list (see Known gaps) |
| `score.tsx` | Score for the current session, read from the Worker scoring engine |
| `history.tsx` | Scored sessions, newest first, optionally scoped to the selected scenario (Phase 37) |
| `intelligence.tsx` | Aggregate across all scored sessions: average, band, decision types, trend (Phase 38) |
| `types.ts` | `TTXScenario`, `TTXInject`, `TTXOperatorRole`, `TTXSession`, `TTXScoreEntry`, rubric shapes |
| `service.ts` | Legacy engine-proxy client — see Status |

## Status

The Worker implements `/api/ttx/*` locally (KV-backed, `TTX_STATE`), so most of this module talks
to real, working endpoints:

- `GET /api/ttx/sessions/scenarios` and `GET /api/ttx/local-scenarios` — scenario list
- `POST /api/ttx/local-scenarios/create` — Builder save
- `POST /api/ttx/sessions/start` — session start
- `GET /api/ttx/sessions/score?sessionId=` — Score tab
- `GET /api/ttx/sessions/history[?scenarioId=]` — History tab
- `GET /api/ttx/intelligence` — Intelligence tab

**`service.ts` is the exception and the only remaining stub.** All eight of its methods target
routes the Worker deliberately does not claim (`/api/ttx/scenarios`, `/api/ttx/roles`,
`/api/ttx/sessions/:id/score`, …), so they fall through to the engine proxy and surface a real
error. Prefer `ttxSessionService`, `ttxLocalScenarioService`, `ttxScoringService`,
`ttxHistoryService`, `ttxIntelligenceService`, and `scenarioBridge.ts` for anything new.

Note the near-miss: `ttxService.getScore` uses `/api/ttx/sessions/:id/score` (a path segment),
while the route that actually exists is `/api/ttx/sessions/score?sessionId=`. This codebase uses
query params, never path segments, for TTX.

## Two type families

`./types.ts` describes the original SaaS scaffold. `src/lib/ttxTypes.ts` mirrors the real Worker
engine (`TtxScenarioSummary`, `TtxLocalScenario`, `TtxScorePacket`, `TtxHistoryPacket`,
`TtxIntelligencePacket`, …). They are **not** the same shapes. `scenarioBridge.ts` is the only
thing joining them, and the newer panels (`score.tsx`, `history.tsx`, `intelligence.tsx`) use the
`ttxTypes.ts` family directly.

`TTXSession`, `TTXScoreEntry`, `TTXRubricCriterion`, and `TTXScoringRubric` in `types.ts` are
still unused outside `service.ts`'s annotations.

## Known gaps

These are real and deliberate, not oversights to be papered over:

- **No session runner here.** `index.tsx` can start a session, but advancing through injects lives
  in the Dashboard's `src/components/TTXPanel.tsx`. Scoring rejects a session that has not reached
  a terminal node, so a session started from `/ttx` cannot be scored from `/ttx`.
- **Inject timing and severity are synthesized.** `localScenarioToInjects` assigns
  `triggerAtMinutes: (index + 1) * 5` and a constant `severity: "info"` — the graph model has no
  timing or severity concept. The Timeline renders those synthetic values.
- **Builder creates single-node scenarios only.** Multi-node authoring is
  `src/components/ScenarioAuthoringPanel.tsx` on the Dashboard.
- **`roles.tsx` always renders its hardcoded fallback**, because `/api/ttx/roles` is unbacked.
- **`createdAt` is always the Unix epoch** and `status` is hardcoded per source in
  `scenarioBridge.ts`, so the archived count in `TTXStatusPanel` is structurally always 0.
- **The selected scenario is not persisted** — unlike the session id, which uses
  `ttxSessionStorage`.

## Marketplace hook

The Packs tab renders `src/pages/marketplace/TTXPacksCategory.tsx` in embedded mode, surfacing
catalog items tagged `ttx` / `ttx-pack` / `scenario-pack` **and** flagged `ttx_eligible`. The same
category is reachable standalone at `/marketplace/ttx-packs`.

## Future expansion

- A session runner in this module, so start → advance → score works without the Dashboard.
- Real inject timing and severity in the scenario graph model, replacing the synthesized values.
- Division integration: scope scenarios to a `Division` beyond the free-text `division` field,
  which `createEmptyLocalDraft` currently folds into `roles`.
- Multi-operator session view — note that live multi-participant sessions already exist separately
  (`src/components/LiveTtxPanel.tsx`, `worker/liveSession.ts`).
