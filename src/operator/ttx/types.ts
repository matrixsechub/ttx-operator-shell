export type TTXScenarioStatus = "draft" | "published" | "archived";

export interface TTXScenario {
  id: string;
  title: string;
  summary: string;
  division?: string;
  status: TTXScenarioStatus;
  injectCount: number;
  createdAt: string;
}

export type TTXInjectSeverity = "info" | "elevated" | "critical";

export interface TTXInject {
  id: string;
  scenarioId: string;
  sequence: number;
  title: string;
  description: string;
  triggerAtMinutes: number;
  severity: TTXInjectSeverity;
}

export interface TTXOperatorRole {
  id: string;
  name: string;
  description: string;
  isFacilitator: boolean;
}

export type TTXSessionStatus = "scheduled" | "active" | "completed";

export interface TTXSession {
  id: string;
  scenarioId: string;
  status: TTXSessionStatus;
  startedAt?: string;
}

export interface TTXScoreEntry {
  id: string;
  sessionId: string;
  roleId: string;
  points: number;
  notes?: string;
}

// The rubric defines what's being scored (criteria + max points per criterion).
// TTXScoreEntry above is the outcome once someone's been scored against it.
// Actual point computation happens server-side once the engine implements
// this — the client only defines/renders the rubric shape.
export interface TTXRubricCriterion {
  id: string;
  label: string;
  description?: string;
  maxPoints: number;
}

export interface TTXScoringRubric {
  id: string;
  scenarioId: string;
  criteria: TTXRubricCriterion[];
}
