// Scenario graph definitions for the TTX scenario engine (Phase 25).
// Source of truth for phase/inject/branching content — the frontend never
// hardcodes this, it only ever sees what /api/ttx/sessions/* returns (see
// worker/ttx.ts). This supersedes Phase 24's single hardcoded 3-phase
// scenario; SCENARIO_DEFINITIONS carries that same content forward as
// "baseline-01" so nothing operators already ran disappears.
//
// Two scope decisions, both driven by SCOPE-LOCK.md (which retires RBAC
// and any "inject sequencing engine" beyond a real TTX data model):
// - Deterministic only. Every transition is either an automatic single-
//   path advance or an explicit operator choice — never random/weighted.
//   There is no probabilistic branching here.
// - `role` is a display-only tag on a node (which "voice" an inject is
//   framed as — e.g. ops vs leadership). It is never used to hide or
//   restrict content from anyone; every operator sees every node. This
//   mirrors how `access_level`/`compliance_tags` already work on
//   CatalogItem — a label, not an enforcement mechanism.

export interface ScenarioTransition {
  choice: string;
  label: string;
  next: string;
}

export interface ScenarioNode {
  id: string;
  title: string;
  inject: string;
  role?: string;
  transitions: ScenarioTransition[];
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  roles: string[];
  entry: string;
  nodes: Record<string, ScenarioNode>;
}

export const SCENARIO_DEFINITIONS: Record<string, ScenarioDefinition> = {
  "baseline-01": {
    id: "baseline-01",
    title: "Baseline Scenario",
    roles: [],
    entry: "phase1",
    nodes: {
      phase1: {
        id: "phase1",
        title: "Initial Inject",
        inject: "Market volatility begins.",
        transitions: [{ choice: "default", label: "Continue", next: "phase2" }],
      },
      phase2: {
        id: "phase2",
        title: "Escalation",
        inject: "Liquidity crunch detected.",
        transitions: [{ choice: "default", label: "Continue", next: "phase3" }],
      },
      phase3: {
        id: "phase3",
        title: "Critical Event",
        inject: "Counterparty default risk rising.",
        transitions: [],
      },
    },
  },
  "branching-01": {
    id: "branching-01",
    title: "Liquidity Crisis (Branching)",
    roles: ["ops", "leadership"],
    entry: "assess",
    nodes: {
      assess: {
        id: "assess",
        title: "Initial Assessment",
        inject: "Market volatility begins. A liquidity gap is forming.",
        transitions: [
          { choice: "contain", label: "Attempt containment", next: "contain" },
          { choice: "escalate", label: "Escalate to leadership", next: "escalate" },
        ],
      },
      contain: {
        id: "contain",
        title: "Containment",
        inject: "Containment measures buy time, but the gap persists.",
        role: "ops",
        transitions: [{ choice: "default", label: "Continue", next: "resolve" }],
      },
      escalate: {
        id: "escalate",
        title: "Escalation",
        inject: "Leadership is briefed; liquidity crunch confirmed organization-wide.",
        role: "leadership",
        transitions: [{ choice: "default", label: "Continue", next: "resolve" }],
      },
      resolve: {
        id: "resolve",
        title: "Resolution",
        inject: "Incident resolved and logged for after-action review.",
        transitions: [],
      },
    },
  },
};
