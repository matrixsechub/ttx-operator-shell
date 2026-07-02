import type { TTXScenarioStatus } from "./types";

// Small, explicit state machine over TTXScenario.status. This governs which
// transition buttons the UI offers and what status value an update call
// sends — it does not orchestrate anything server-side. Draft -> published
// -> archived, one-way, no backend execution implied.
export type TTXScenarioTransition = "publish" | "archive";

const ALLOWED_TRANSITIONS: Record<TTXScenarioStatus, TTXScenarioTransition[]> = {
  draft: ["publish"],
  published: ["archive"],
  archived: [],
};

const TRANSITION_TARGET: Record<TTXScenarioTransition, TTXScenarioStatus> = {
  publish: "published",
  archive: "archived",
};

const TRANSITION_LABEL: Record<TTXScenarioTransition, string> = {
  publish: "Publish",
  archive: "Archive",
};

export function allowedTransitions(status: TTXScenarioStatus): TTXScenarioTransition[] {
  return ALLOWED_TRANSITIONS[status];
}

export function targetStatus(transition: TTXScenarioTransition): TTXScenarioStatus {
  return TRANSITION_TARGET[transition];
}

export function transitionLabel(transition: TTXScenarioTransition): string {
  return TRANSITION_LABEL[transition];
}
