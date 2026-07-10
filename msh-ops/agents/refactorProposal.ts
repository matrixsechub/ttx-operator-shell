import type { AgentActionClass, RefactorSuggestion } from "./types.ts";

export interface RefactorProposal {
  proposalId: string;
  actionClass: AgentActionClass;
  summary: string;
  diffPlan: string[];
  affectedFiles: string[];
  tests: string[];
  rollbackSteps: string[];
  behaviorPreserved: boolean;
  requiresApproval: true;
}

const MAX_DIFF_STEPS = 20;

export function buildRefactorProposal(
  suggestions: RefactorSuggestion[],
  context: { summary: string; tests?: string[] },
): RefactorProposal {
  const bounded = suggestions.slice(0, MAX_DIFF_STEPS);
  return {
    proposalId: crypto.randomUUID(),
    actionClass: bounded.length > 5 ? "C3" : "C2",
    summary: context.summary,
    diffPlan: bounded.map(
      (suggestion) => `${suggestion.action}: ${suggestion.relativePath}${suggestion.targetPath ? ` -> ${suggestion.targetPath}` : ""}`,
    ),
    affectedFiles: [...new Set(bounded.flatMap((s) => [s.relativePath, s.targetPath].filter(Boolean) as string[]))],
    tests: context.tests ?? [],
    rollbackSteps: ["git restore affected paths", "re-run npm test and codex:validate"],
    behaviorPreserved: true,
    requiresApproval: true,
  };
}
