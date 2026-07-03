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

// Phase 32 — author-defined choice-key classifications consumed by
// worker/ttxScoring.ts after a session completes. Unlike tags/notes/role,
// this data IS read by something, but only after the fact — never during
// a session, never changing what an operator sees or can choose.
export interface TtxScenarioScoringMetadata {
  recommendedActions?: string[];
  riskActions?: string[];
  delayActions?: string[];
}

// id is absent for a brand-new scenario (the Worker generates one on
// create) and present when editing/submitting an update. tags (Phase 29)
// and notes (Phase 30) are purely descriptive — authoring-plane
// organization/commentary only, never used by the session engine.
export interface TtxScenarioDraft {
  id?: string;
  title: string;
  description?: string;
  roles: string[];
  entry: string;
  nodes: Record<string, TtxScenarioNode>;
  tags?: string[];
  notes?: string;
  scoring?: TtxScenarioScoringMetadata;
}

export interface TtxLocalScenario extends TtxScenarioDraft {
  id: string;
}

// --- Execution analytics (Phase 27) ---
// Mirrors worker/ttxAnalytics.ts's AnalyticsPacket exactly. moduleTags is
// always [] today — see that file's header comment for why the field
// exists without a module-tag concept behind it yet.

export interface TtxAnalyticsTransition {
  fromNodeId: string;
  toNodeId: string;
  choice: string;
  at: string;
}

export interface TtxAnalyticsPacket {
  sessionId: string;
  scenarioId: string;
  scenarioSource: "builtin" | "authored";
  entryNode: string;
  transitions: TtxAnalyticsTransition[];
  terminalNode: string | null;
  roleTags: string[];
  moduleTags: string[];
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
}

// --- Export / Import (Phase 28) ---
// Mirrors worker/localScenarioRoutes.ts's ScenarioExportBlob exactly. This
// is the one shape in this file that intentionally IS a raw pass-through
// (fetched, downloaded as a file, later re-uploaded and posted back
// unmodified) rather than an editable draft — the frontend never
// constructs or mutates it, only displays it and ships it to /import.

export interface TtxScenarioExportBlob {
  version: number;
  scenarioId: string;
  title: string;
  description?: string;
  roles: string[];
  entry: string;
  nodes: Record<string, TtxScenarioNode>;
  exportedAt: string;
  signature: string;
  tags?: string[];
  notes?: string;
  scoring?: TtxScenarioScoringMetadata;
}

// --- Session scoring (Phase 32) ---
// Mirrors worker/ttxScoring.ts's ScorePacket exactly.

export interface TtxScoreBreakdown {
  correctChoices: number;
  riskEscalations: number;
  mitigations: number;
  delays: number;
}

export interface TtxScoreRoleActions {
  recommendedTaken: string[];
  recommendedMissed: string[];
}

export interface TtxScorePacket {
  sessionId: string;
  scenarioId: string;
  score: number;
  breakdown: TtxScoreBreakdown;
  roleActions: TtxScoreRoleActions;
  computedAt: string;
}
