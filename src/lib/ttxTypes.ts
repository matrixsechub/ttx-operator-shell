// Types for the TTX scenario graph engine (Phase 25/26) — not to be
// confused with src/operator/ttx/types.ts, which models the separate,
// richer "TTX SaaS" scenario-builder scaffold (scenarios/roles/scoring/
// injects, still proxied to an Engine that doesn't exist yet). This
// module is a real, multi-scenario, branching engine backed by
// worker/ttx.ts + worker/localScenarioRoutes.ts + KV.
//
// No frontend copy of read-only graph content (nodes/injects/transitions
// as fetched from a session) is kept here — the Worker is the sole source
// of truth; the frontend only ever sees what a session response contains.
// That's a deliberate change from Phase 24, where the content was small
// and linear enough to duplicate safely — a branching graph is not.
//
// TtxScenarioDraft below is different in kind, not a contradiction of that
// decision: it's the operator's own in-progress edit in the Scenario
// Authoring Panel (Phase 26), which only exists client-side until
// submitted as a create/update request. There's no "source of truth" to
// drift from — it IS the draft of a new source of truth.

export interface TtxScenarioSummary {
  id: string;
  title: string;
  roles: string[];
  phaseCount: number;
  source: "builtin" | "authored";
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
  scenarioSource: "builtin" | "authored";
  nodeId: string | null;
  title: string | null;
  inject: string | null;
  role: string | null;
  choices: TtxChoice[];
  done: boolean;
  history: TtxHistoryEntry[];
}

// --- Scenario authoring (Phase 26) ---
// Mirrors worker/scenarioManifest.ts's ScenarioTransition/ScenarioNode/
// ScenarioDefinition shape exactly, since a create/update request body IS
// that shape.

export interface TtxScenarioTransition {
  choice: string;
  label: string;
  next: string;
}

export interface TtxScenarioNode {
  id: string;
  title: string;
  inject: string;
  role?: string;
  transitions: TtxScenarioTransition[];
}

// id is absent for a brand-new scenario (the Worker generates one on
// create) and present when editing/submitting an update.
export interface TtxScenarioDraft {
  id?: string;
  title: string;
  description?: string;
  roles: string[];
  entry: string;
  nodes: Record<string, TtxScenarioNode>;
}

export interface TtxLocalScenario extends TtxScenarioDraft {
  id: string;
}
