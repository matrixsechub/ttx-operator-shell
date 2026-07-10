export type RefactorApprovalDecision = "approved" | "denied" | "pending";

export interface RefactorApprovalRequest {
  agentId: "OrganizerAgent";
  suggestionIds: string[];
  description: string;
  operatorApproval: boolean;
  operatorCallsign?: string;
}

export interface RefactorApprovalResult {
  decision: RefactorApprovalDecision;
  reason: string;
  suggestionIds: string[];
  operatorCallsign?: string;
  decidedAt: string;
}

export interface RefactorDecisionEntry {
  request: RefactorApprovalRequest;
  result: RefactorApprovalResult;
}

export interface RefactorDecisionLog {
  entries: RefactorDecisionEntry[];
  append(request: RefactorApprovalRequest, result: RefactorApprovalResult): void;
  toJsonl(): string;
}

export function evaluateRefactorApproval(request: RefactorApprovalRequest): RefactorApprovalResult {
  const decidedAt = new Date().toISOString();

  if (request.agentId !== "OrganizerAgent") {
    return {
      decision: "denied",
      reason: "Only OrganizerAgent may request structural refactors",
      suggestionIds: request.suggestionIds,
      operatorCallsign: request.operatorCallsign,
      decidedAt,
    };
  }

  if (!request.operatorApproval) {
    return {
      decision: "denied",
      reason: "Structural refactors require explicit operator approval",
      suggestionIds: request.suggestionIds,
      operatorCallsign: request.operatorCallsign,
      decidedAt,
    };
  }

  if (request.suggestionIds.length === 0) {
    return {
      decision: "denied",
      reason: "No suggestion IDs provided for approval",
      suggestionIds: request.suggestionIds,
      operatorCallsign: request.operatorCallsign,
      decidedAt,
    };
  }

  return {
    decision: "approved",
    reason: `Operator approved ${request.suggestionIds.length} refactor suggestion(s)`,
    suggestionIds: request.suggestionIds,
    operatorCallsign: request.operatorCallsign,
    decidedAt,
  };
}

export function createRefactorDecisionLog(): RefactorDecisionLog {
  const entries: RefactorDecisionEntry[] = [];
  return {
    entries,
    append(request, result) {
      entries.push({ request, result });
    },
    toJsonl() {
      return entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length > 0 ? "\n" : "");
    },
  };
}
