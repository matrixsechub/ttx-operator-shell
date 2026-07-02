export interface TtxScenarioPhase {
  id: string;
  title: string;
  inject: string;
}

export interface TtxScenarioManifest {
  id: string;
  title: string;
  phases: TtxScenarioPhase[];
}

// Display-only manifest for the minimal TTX scenario engine scaffolding
// (Phase 24) — worker/ttx.ts is the actual source of truth for phase
// content and state; this exists so the frontend can show a phase count/
// titles without a fetch. Mirrors (small, deliberate duplication, same as
// CatalogItem/WebhookEvent) what worker/ttx.ts hardcodes internally.
//
// Not to be confused with src/operator/ttx/ (the separate "TTX SaaS"
// scenario-builder scaffold with its own types.ts) — this is a smaller,
// unrelated feature that happens to share the "TTX" name.
export const TTX_SCENARIO: TtxScenarioManifest = {
  id: "baseline-01",
  title: "Baseline Scenario",
  phases: [
    { id: "phase1", title: "Initial Inject", inject: "Market volatility begins." },
    { id: "phase2", title: "Escalation", inject: "Liquidity crunch detected." },
    { id: "phase3", title: "Critical Event", inject: "Counterparty default risk rising." },
  ],
};
