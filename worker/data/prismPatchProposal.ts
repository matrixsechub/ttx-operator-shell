import { getAgentGovernanceContextFor } from "../../msh-ops/agent/initAgentGovernance";
import { checkAutonomy } from "../../msh-ops/governance/checkAutonomy";
import type { AiGatewayEnv } from "../aiGateway";
import type { BackboneEnv } from "../backboneEnv";
import type { GhostEnv } from "../ghost";
import type { TelemetryEnv } from "../telemetry";
import type { PrismUiuxStorageEnv } from "../prismUiuxStorage";
import { maybeEnrichWithAi } from "../aiFulfillmentEnrichment";
import { resolveEffectiveKernelContext } from "../kernel";
import type { UiUxAudit, UiUxFinding } from "./prismUiuxTypes";
import { PRISM_UIUX_AGENT_ID } from "./prismUiuxTypes";
import type {
  PrismPatchComplexity,
  PrismPatchProposal,
  PrismPatchProposalRisk,
  PrismPatchStep,
  PrismPatchTest,
  PrismTriageItem,
} from "./prismTriageTypes";
import { assertPrismPatchProposalInvariants } from "./prismTriageTypes";

const BLOCKED_ACTIONS = [
  "apply_patch",
  "edit_source",
  "commit",
  "push",
  "merge",
  "deploy",
  "approve_mutation",
  "publish_module",
] as const;

function severityToRisk(severity: PrismTriageItem["highestSeverity"]): PrismPatchProposalRisk {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default: {
      const never: never = severity;
      return never;
    }
  }
}

function estimateComplexity(item: PrismTriageItem, findings: UiUxFinding[]): PrismPatchComplexity {
  const routeCount = item.routes.length;
  const categoryCount = item.categories.length;
  if (routeCount > 3 || categoryCount > 3 || item.highestSeverity === "critical") {
    return "large";
  }
  if (routeCount > 1 || categoryCount > 1 || findings.some((f) => f.implementationHint)) {
    return "medium";
  }
  return "small";
}

function suspectFiles(item: PrismTriageItem, findings: UiUxFinding[]): string[] {
  const files = new Set<string>();
  for (const finding of findings) {
    if (finding.implementationHint?.includes("src/")) {
      const match = /src\/[\w./-]+\.tsx?/.exec(finding.implementationHint);
      if (match) files.add(match[0]);
    }
    if (finding.component) {
      files.add(`src/components/${finding.component}.tsx`);
      files.add(`src/pages/**/${finding.component}.tsx`);
    }
  }
  for (const route of item.routes) {
    if (route === "/") files.add("src/pages/Home.tsx");
    if (route === "/services") files.add("src/pages/Services.tsx");
    if (route === "/enter") files.add("src/pages/Enter.tsx");
    if (route === "/register") files.add("src/pages/Register.tsx");
    if (route === "/intake") files.add("src/pages/Intake.tsx");
    if (route.startsWith("/operator")) files.add("src/pages/ops/UiUxExpertPage.tsx");
  }
  return [...files].slice(0, 12);
}

function buildImplementationPlan(item: PrismTriageItem, findings: UiUxFinding[]): PrismPatchStep[] {
  const files = suspectFiles(item, findings);
  const steps: PrismPatchStep[] = [
    {
      order: 1,
      description: "Reproduce the reported UI/UX issue in staging or local preview using PRISM fixture or live capture.",
      rationale: "Operator-visible evidence must be confirmed before planning implementation.",
      suggestedFiles: [],
      verification: ["Issue reproduces on affected route/viewport", "PRISM audit finding IDs remain linked"],
    },
    {
      order: 2,
      description: item.recommendation,
      rationale: findings[0]?.userImpact ?? item.userImpact,
      suggestedFiles: files.slice(0, 6),
      verification: item.acceptanceCriteria.slice(0, 4),
    },
    {
      order: 3,
      description: "Re-run PRISM audit and accessibility capture to verify remediation.",
      rationale: "Governed proposals require evidence-backed verification before any future execution phase.",
      suggestedFiles: [],
      verification: [
        "PRISM scorecard improves or finding status resolves",
        "No new critical accessibility regressions",
      ],
    },
  ];
  return steps;
}

function buildTestPlan(item: PrismTriageItem): PrismPatchTest[] {
  const tests: PrismPatchTest[] = [
    {
      testType: "browser",
      description: `Verify affected routes (${item.routes.join(", ") || "scoped surface"}) render without regression.`,
      required: true,
    },
    {
      testType: "accessibility",
      description: "Run axe or PRISM ACCESSIBILITY_CHECK on remediated routes.",
      required: item.categories.includes("accessibility"),
    },
    {
      testType: "responsive",
      description: `Validate layout on viewports: ${item.viewports.join(", ")}.`,
      required: item.categories.includes("responsive") || item.viewports.includes("mobile"),
    },
    {
      testType: "manual",
      description: "Operator reviews advisory proposal packet and records disposition (no auto-execution).",
      required: true,
    },
  ];
  return tests.filter((t) => t.required || t.testType !== "accessibility");
}

function buildTelemetryRequirements(item: PrismTriageItem): string[] {
  return [
    "Emit prism_triage_disposition_recorded when operator accepts, defers, or dismisses.",
    `Include triageId=${item.triageId} and sourceAuditId hash in structured telemetry.`,
    "Exclude tokens, credentials, cookies, and raw screenshots from telemetry payloads.",
  ];
}

function buildAccessibilityRequirements(item: PrismTriageItem): string[] {
  if (!item.categories.includes("accessibility")) {
    return ["Maintain existing accessibility baseline; no reduction in contrast or focus visibility."];
  }
  return [
    "Remediate reported accessibility violations to zero on recapture.",
    "Preserve keyboard focus order and visible focus indicators.",
    "Ensure form labels remain associated with controls.",
  ];
}

async function proposalEvidenceHash(payload: Record<string, unknown>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function stableProposalId(triageId: string, revision: number): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${triageId}:rev:${revision}`),
  );
  return `proposal-${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 28)}`;
}

export async function generatePatchProposal(
  item: PrismTriageItem,
  audit: UiUxAudit,
  findings: UiUxFinding[],
  revision: number,
): Promise<PrismPatchProposal> {
  const matchedFindings = findings.filter((f) => item.sourceFindingIds.includes(f.id));
  const components = [...new Set(matchedFindings.map((f) => f.component).filter(Boolean) as string[])];
  const complexity = estimateComplexity(item, matchedFindings);
  const proposalId = await stableProposalId(item.triageId, revision);

  const governancePayload = {
    sourceAuditId: audit.auditId,
    sourceFindingIds: [...item.sourceFindingIds].sort(),
    sourceEvidenceHash: audit.evidenceHash,
    revision,
    triageEvidenceHash: item.evidenceHash,
  };
  const evidenceHash = await proposalEvidenceHash(governancePayload);

  const proposal: PrismPatchProposal = {
    proposalId,
    triageId: item.triageId,
    sourceAuditId: audit.auditId,
    title: `Patch proposal: ${item.title}`,
    objective: `Remediate PRISM findings for ${item.routes.join(", ") || "scoped surface"} while preserving advisory-only governance.`,
    affectedRoutes: item.routes,
    affectedComponents: components,
    suspectedFiles: suspectFiles(item, matchedFindings),
    implementationPlan: buildImplementationPlan(item, matchedFindings),
    testPlan: buildTestPlan(item),
    rollbackPlan: [
      "Retain prior PRISM audit record unchanged as evidence baseline.",
      "If a future execution phase is authorized, revert via version control — not via PRISM triage APIs.",
      "Re-open triage item if regression detected on recapture.",
    ],
    telemetryRequirements: buildTelemetryRequirements(item),
    accessibilityRequirements: buildAccessibilityRequirements(item),
    acceptanceCriteria: item.acceptanceCriteria,
    estimatedComplexity: complexity,
    risk: severityToRisk(item.highestSeverity),
    dependencies: audit.routes.length > 1 ? ["Cross-route regression check"] : [],
    blockedActions: [...BLOCKED_ACTIONS],
    generatedAt: new Date().toISOString(),
    advisoryOnly: true,
    mutationAuthorized: false,
    operatorApprovalRequired: true,
    evidenceHash,
    governance: {
      advisoryOnly: true,
      mutationAuthorized: false,
      operatorApprovalRequired: true,
      sourceAuditId: audit.auditId,
      sourceFindingIds: [...item.sourceFindingIds].sort(),
      sourceEvidenceHash: audit.evidenceHash,
      proposalEvidenceHash: evidenceHash,
      revision,
    },
  };

  assertPrismPatchProposalInvariants(proposal);
  return proposal;
}

function buildEnrichmentPrompt(proposal: PrismPatchProposal): string {
  return (
    `Improve wording for this advisory patch proposal (no execution authority):\n` +
    `Title: ${proposal.title}\nObjective: ${proposal.objective}\n` +
    `Steps: ${proposal.implementationPlan.map((s) => s.description).join("; ")}\n` +
    `Return JSON with optional fields: objective, implementationHints (string[]).`
  );
}

export type PrismPatchProposalEnv = PrismUiuxStorageEnv & BackboneEnv & AiGatewayEnv & GhostEnv & TelemetryEnv;

export async function maybeEnrichPatchProposal(
  env: PrismPatchProposalEnv,
  proposal: PrismPatchProposal,
): Promise<PrismPatchProposal> {
  const governance = getAgentGovernanceContextFor(PRISM_UIUX_AGENT_ID);
  const decision = checkAutonomy(
    {
      agentId: PRISM_UIUX_AGENT_ID,
      actionKind: "advisory",
      description: "PRISM patch proposal advisory enrichment",
      axis: "TRUST",
      priorityIndex: 2,
    },
    governance,
  );
  if (decision.decision === "denied") {
    return proposal;
  }

  const kernelCtx = await resolveEffectiveKernelContext(env);
  const enriched = await maybeEnrichWithAi(
    env,
    governance,
    {
      agentId: PRISM_UIUX_AGENT_ID,
      actionKind: "advisory",
      description: "PRISM patch proposal advisory enrichment",
      axis: "TRUST",
      priorityIndex: 2,
    },
    { proposalId: proposal.proposalId, objective: proposal.objective },
    buildEnrichmentPrompt(proposal),
    kernelCtx.policy,
    kernelCtx.signalStates,
  );

  if (typeof enriched.ai_enrichment === "string") {
    const next = {
      ...proposal,
      ai_enrichment: enriched.ai_enrichment,
      ai_model: enriched.ai_model,
      governance: {
        ...proposal.governance,
        mutationAuthorized: false as const,
      },
    };
    assertPrismPatchProposalInvariants(next);
    return next;
  }
  return proposal;
}

export function exportProposalAsText(proposal: PrismPatchProposal): string {
  const lines = [
    "PRISM PATCH PROPOSAL (ADVISORY ONLY — NO MUTATION AUTHORITY)",
    `Proposal ID: ${proposal.proposalId}`,
    `Triage ID: ${proposal.triageId}`,
    `Revision: ${proposal.governance.revision}`,
    `Risk: ${proposal.risk} | Complexity: ${proposal.estimatedComplexity}`,
    "",
    "OBJECTIVE",
    proposal.objective,
    "",
    "AFFECTED ROUTES",
    ...proposal.affectedRoutes.map((r) => `- ${r}`),
    "",
    "IMPLEMENTATION PLAN",
    ...proposal.implementationPlan.map(
      (s) => `${s.order}. ${s.description}\n   Rationale: ${s.rationale}`,
    ),
    "",
    "TEST PLAN",
    ...proposal.testPlan.map((t) => `- [${t.testType}${t.required ? ", required" : ""}] ${t.description}`),
    "",
    "ACCEPTANCE CRITERIA",
    ...proposal.acceptanceCriteria.map((c) => `- ${c}`),
    "",
    "BLOCKED ACTIONS",
    ...proposal.blockedActions.map((a) => `- ${a}`),
  ];
  return lines.join("\n");
}
