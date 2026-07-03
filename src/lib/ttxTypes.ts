// Types for the TTX scenario graph engine (Phase 25) — not to be confused
// with src/operator/ttx/types.ts, which models the separate, richer
// "TTX SaaS" scenario-builder scaffold (scenarios/roles/scoring/injects,
// still proxied to an Engine that doesn't exist yet). This module is a
// real, multi-scenario, branching engine backed by worker/ttx.ts + KV.
//
// No frontend copy of the graph content (nodes/injects/transitions) is
// kept here — worker/ttx.ts (via scenarioManifest.ts) is the sole source
// of truth; the frontend only ever sees what a session response contains.
// That's a deliberate change from Phase 24, where the content was small
// and linear enough to duplicate safely — a branching graph is not.

export interface TtxScenarioSummary {
  id: string;
  title: string;
  roles: string[];
  phaseCount: number;
}

export interface TtxChoice {
  choice: string;
  label: string;
}

export interface TtxHistoryEntry {
  nodeId: string;
  title: string;
  inject: string;
  role?: string;
  at: string;
}

export interface TtxSessionState {
  sessionId: string;
  scenarioId: string;
  scenarioTitle: string;
  nodeId: string | null;
  title: string | null;
  inject: string | null;
  role: string | null;
  choices: TtxChoice[];
  done: boolean;
  history: TtxHistoryEntry[];
}
