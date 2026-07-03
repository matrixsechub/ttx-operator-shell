// Pure scenario graph state-transition logic (Phase 25) — no I/O, no KV,
// just "given a scenario definition and a node id (+ optional choice),
// what's next". Kept separate from worker/ttx.ts's KV/session plumbing so
// the transition rules are easy to read in isolation.

import type { ScenarioDefinition, ScenarioNode } from "./scenarioManifest";

export type GraphStepResult =
  | { status: "moved"; node: ScenarioNode }
  | { status: "done" }
  | { status: "error"; message: string };

export function entryNode(scenario: ScenarioDefinition): ScenarioNode {
  return scenario.nodes[scenario.entry];
}

// Advances from the given node. Zero transitions means the scenario is
// done. Exactly one auto-advances (keeps a plain "Next Phase" button
// working for linear content, same UX as Phase 24). More than one requires
// an explicit `choice` matching one of the transitions — the only form of
// branching this engine supports: operator-driven and deterministic,
// never random or weighted (see scenarioManifest.ts's header comment).
export function step(scenario: ScenarioDefinition, currentNodeId: string, choice?: string): GraphStepResult {
  const current = scenario.nodes[currentNodeId];
  if (!current) return { status: "error", message: "Unknown current node" };

  if (current.transitions.length === 0) {
    return { status: "done" };
  }

  let transition = current.transitions[0];
  if (current.transitions.length > 1) {
    const matched = current.transitions.find((candidate) => candidate.choice === choice);
    if (!matched) {
      return {
        status: "error",
        message: `This phase branches — choose one of: ${current.transitions.map((t) => t.choice).join(", ")}`,
      };
    }
    transition = matched;
  }

  const next = scenario.nodes[transition.next];
  if (!next) return { status: "error", message: "Transition target not found" };
  return { status: "moved", node: next };
}
