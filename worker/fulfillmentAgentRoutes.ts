import {
  aiAgentBuilderMarketplaceModule,
  attachEngagementToAiAgentBuild,
  generateAiAgentBuildSpec,
  listAiAgentBuildQueue,
  normalizeAiAgentBuildInput,
  recordAiAgentBuildSubmission,
  resolveAiAgentBuildId,
} from "./data/aiAgentBuilderAgent";
import {
  attachEngagementToRagArchitecture,
  generateRagArchitecturePlan,
  listRagArchitectureQueue,
  normalizeRagArchitectureInput,
  ragArchitectureMarketplaceModule,
  recordRagArchitectureSubmission,
  resolveRagPlanId,
} from "./data/ragArchitectureAgent";
import {
  attachEngagementToLocalAiDeployment,
  generateLocalAiDeploymentPlan,
  listLocalAiDeploymentQueue,
  localAiDeploymentMarketplaceModule,
  normalizeLocalAiDeploymentInput,
  recordLocalAiDeploymentSubmission,
  resolveDeploymentPlanId,
} from "./data/localAiDeploymentAgent";
import {
  attachEngagementToSecurityRemediation,
  generateSecurityRemediationPlan,
  listSecurityRemediationQueue,
  normalizeSecurityRemediationInput,
  recordSecurityRemediationSubmission,
  resolveRemediationPlanId,
  securityRemediationMarketplaceModule,
} from "./data/securityRemediationAgent";
import {
  attachEngagementToNorthstarBeacon,
  northstarBeaconGovernanceMarketplaceModule,
  resolveBeaconOrderId,
} from "./data/northstarBeaconGovernanceAgent";
import {
  handleOperatorNorthstarBeaconApi,
  handleNorthstarBeaconApi,
} from "./northstarBeaconRoutes";
import { getAgentGovernanceContextFor } from "../msh-ops/agent/initAgentGovernance";
import { checkAutonomy } from "../msh-ops/governance/checkAutonomy";
import type { AiGatewayEnv } from "./aiGateway";
import { aiFulfillmentEnabled } from "./aiGateway";
import { maybeEnrichWithAi } from "./aiFulfillmentEnrichment";
import { resolveEffectiveKernelContext } from "./kernel";
import type { BackboneEnv } from "./backboneEnv";
import type { WorkerEnv } from "./env";
import { readIntentCaptureByCaptureId } from "./intentCaptureStorage";

const AI_AGENT_BUILDER_AGENT_ID = "AiAgentBuilderAgent";
const SECURITY_REMEDIATION_AGENT_ID = "SecurityRemediationAgent";
const RAG_ARCHITECTURE_AGENT_ID = "RagArchitectureAgent";
const LOCAL_AI_DEPLOYMENT_AGENT_ID = "LocalAiDeploymentAgent";

const AI_AGENT_BUILD_KEYS = [
  "source_type",
  "source_reference_id",
  "package_name",
  "recommended_service",
  "agent_goal",
  "agent_autonomy_level",
  "user_interaction_channel",
  "tools_needed",
  "data_types",
  "output_modes",
  "human_approval_required",
  "risk_signals",
  "memory_requirement",
  "deployment_environment",
  "volume_level",
  "timeline",
  "budget_band",
  "diagnostic_context",
  "source_route",
] as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function autonomyErrorResponse(code: string, reason: string, status: number): Response {
  return jsonResponse({ error: reason, code }, status);
}

function readOperatorApproval(payload: Record<string, unknown>): boolean {
  return payload.operator_approval === true;
}

async function readFlexibleJsonBody(request: Request, maxBytes = 32_768): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new Error("Payload too large");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

async function handleGenerateWithGovernance(options: {
  agentId: string;
  advisoryAxis: "STABILITY" | "REVENUE_VALIDATION" | "TRUST" | "CONTROLLED_GROWTH" | "WILDCARD_INNOVATION";
  advisoryPriorityIndex: number;
  advisoryDescription: string;
  recordDescription: string;
  payload: Record<string, unknown>;
  operatorApproval: boolean;
  generate: () => unknown;
  record: () => void;
  successStatus: string;
  enrichmentPrompt?: string;
  env?: WorkerEnv & BackboneEnv & AiGatewayEnv;
}): Promise<Response> {
  const governance = getAgentGovernanceContextFor(options.agentId);

  const generateDecision = checkAutonomy(
    {
      agentId: options.agentId,
      actionKind: "advisory",
      description: options.advisoryDescription,
      axis: options.advisoryAxis,
      priorityIndex: options.advisoryPriorityIndex,
    },
    governance,
  );
  if (generateDecision.decision === "denied") {
    return autonomyErrorResponse("BEACON_AUTONOMY_DENIED", generateDecision.reason, 403);
  }

  let result = options.generate() as Record<string, unknown>;

  if (options.env && options.enrichmentPrompt && aiFulfillmentEnabled(options.env)) {
    const kernelCtx = await resolveEffectiveKernelContext(options.env);
    result = await maybeEnrichWithAi(
      options.env,
      governance,
      {
        agentId: options.agentId,
        actionKind: "advisory",
        description: options.advisoryDescription,
        axis: options.advisoryAxis,
        priorityIndex: options.advisoryPriorityIndex,
      },
      result,
      options.enrichmentPrompt,
      kernelCtx.policy,
      kernelCtx.signalStates,
    );
  }

  const recordDecision = checkAutonomy(
    {
      agentId: options.agentId,
      actionKind: "mutate_state",
      description: options.recordDescription,
      axis: "STABILITY",
      priorityIndex: 0,
      operatorApproval: options.operatorApproval,
    },
    governance,
  );
  if (recordDecision.decision === "denied") {
    return autonomyErrorResponse("BEACON_SAFE_MODE", recordDecision.reason, 403);
  }
  if (recordDecision.decision === "escalate") {
    return autonomyErrorResponse("BEACON_AUTONOMY_ESCALATE", recordDecision.reason, 409);
  }

  options.record();
  return jsonResponse({ ...result, status: options.successStatus });
}

async function enrichIntentCapturePayload(
  env: WorkerEnv & BackboneEnv & AiGatewayEnv,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!env?.TTX_STATE) return;
  if (payload.source_type !== "intent_capture") return;

  const captureId = typeof payload.source_reference_id === "string" ? payload.source_reference_id.trim() : "";
  if (!captureId) return;

  const record = await readIntentCaptureByCaptureId(env, captureId);
  if (!record) return;

  const diagnostic =
    payload.diagnostic_context && typeof payload.diagnostic_context === "object" && !Array.isArray(payload.diagnostic_context)
      ? { ...(payload.diagnostic_context as Record<string, unknown>) }
      : {};

  diagnostic.intent_capture_intent = record.intent;
  diagnostic.intent_capture_page = record.page;
  if (record.category) diagnostic.intent_capture_category = record.category;
  payload.diagnostic_context = diagnostic;

  if (!payload.source_route && record.page) {
    payload.source_route = record.page;
  }
}

export async function handleFulfillmentAgentApi(
  request: Request,
  pathname: string,
  method: string,
  env?: WorkerEnv & BackboneEnv & AiGatewayEnv,
): Promise<Response | null> {
  if (method === "POST" && pathname === "/api/ai-agent-build-spec-generate") {
    try {
      const payload = await readFlexibleJsonBody(request);
      if (env) {
        await enrichIntentCapturePayload(env, payload);
      }
      const input = normalizeAiAgentBuildInput(payload);
      const result = generateAiAgentBuildSpec(input);
      return handleGenerateWithGovernance({
        agentId: AI_AGENT_BUILDER_AGENT_ID,
        advisoryAxis: "TRUST",
        advisoryPriorityIndex: 3,
        advisoryDescription: "Generate AI agent build specification",
        recordDescription: "Record AI agent build submission queue entry",
        payload,
        operatorApproval: readOperatorApproval(payload),
        generate: () => result,
        record: () => recordAiAgentBuildSubmission(input, result),
        successStatus: "ai-agent-build-spec-complete",
        enrichmentPrompt: `Enrich this AI agent build spec with advisory implementation notes:\n${JSON.stringify(result)}`,
        env,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ai-agent-build-spec-generate-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/security-remediation-plan-generate") {
    try {
      const payload = await readFlexibleJsonBody(request);
      const input = normalizeSecurityRemediationInput(payload);
      const result = generateSecurityRemediationPlan(input);
      return handleGenerateWithGovernance({
        agentId: SECURITY_REMEDIATION_AGENT_ID,
        advisoryAxis: "TRUST",
        advisoryPriorityIndex: 2,
        advisoryDescription: "Generate security remediation plan",
        recordDescription: "Record security remediation submission queue entry",
        payload,
        operatorApproval: readOperatorApproval(payload),
        generate: () => result,
        record: () => recordSecurityRemediationSubmission(input, result),
        successStatus: "security-remediation-plan-complete",
        enrichmentPrompt: `Enrich this security remediation plan:\n${JSON.stringify(result)}`,
        env,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "security-remediation-plan-generate-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/rag-architecture-plan-generate") {
    try {
      const payload = await readFlexibleJsonBody(request);
      const input = normalizeRagArchitectureInput(payload);
      const result = generateRagArchitecturePlan(input);
      return handleGenerateWithGovernance({
        agentId: RAG_ARCHITECTURE_AGENT_ID,
        advisoryAxis: "CONTROLLED_GROWTH",
        advisoryPriorityIndex: 4,
        advisoryDescription: "Generate RAG architecture plan",
        recordDescription: "Record RAG architecture submission queue entry",
        payload,
        operatorApproval: readOperatorApproval(payload),
        generate: () => result,
        record: () => recordRagArchitectureSubmission(input, result),
        successStatus: "rag-architecture-plan-complete",
        enrichmentPrompt: `Enrich this RAG architecture plan:\n${JSON.stringify(result)}`,
        env,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "rag-architecture-plan-generate-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/local-ai-deployment-plan-generate") {
    try {
      const payload = await readFlexibleJsonBody(request);
      const input = normalizeLocalAiDeploymentInput(payload);
      const result = generateLocalAiDeploymentPlan(input);
      return handleGenerateWithGovernance({
        agentId: LOCAL_AI_DEPLOYMENT_AGENT_ID,
        advisoryAxis: "TRUST",
        advisoryPriorityIndex: 2,
        advisoryDescription: "Generate local AI deployment plan",
        recordDescription: "Record local AI deployment submission queue entry",
        payload,
        operatorApproval: readOperatorApproval(payload),
        generate: () => result,
        record: () => recordLocalAiDeploymentSubmission(input, result),
        successStatus: "local-ai-deployment-plan-complete",
        enrichmentPrompt: `Enrich this local AI deployment plan:\n${JSON.stringify(result)}`,
        env,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "local-ai-deployment-plan-generate-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/marketplace/service-modules") {
    return jsonResponse({
      modules: [
        aiAgentBuilderMarketplaceModule,
        securityRemediationMarketplaceModule,
        ragArchitectureMarketplaceModule,
        localAiDeploymentMarketplaceModule,
        northstarBeaconGovernanceMarketplaceModule,
      ],
    });
  }

  const northstarResponse = await handleNorthstarBeaconApi(request, pathname, method);
  if (northstarResponse) {
    return northstarResponse;
  }

  return null;
}

export function processAiAgentBuildEngagement(
  payload: Record<string, unknown>,
  engagement: Record<string, unknown>,
): void {
  const buildId = resolveAiAgentBuildId(payload);
  if (!buildId) return;
  attachEngagementToAiAgentBuild({
    ai_agent_build_id: buildId,
    engagement_id: String(engagement.engagement_id || engagement.id || ""),
    agent_name: String(payload.agent_name || ""),
    agent_category: String(payload.agent_category || ""),
    estimated_effort: String(payload.estimated_effort || ""),
    delivery_timeline: String(payload.delivery_timeline || ""),
    complexity_level: String(payload.complexity_level || ""),
    risk_level: String(payload.risk_level || ""),
    source_reference_id: String(payload.source_reference_id || ""),
    recommended_service: String(payload.recommended_service || payload.service || ""),
    priority: String(payload.priority || ""),
    status: String(engagement.status || "intake-received"),
    created_at: String(engagement.createdAt || engagement.created_at || ""),
    source: String(payload.source || "ai-agent-builder"),
  });
}

export function processRagArchitectureEngagement(
  payload: Record<string, unknown>,
  engagement: Record<string, unknown>,
): void {
  const planId = resolveRagPlanId(payload);
  if (!planId) return;
  attachEngagementToRagArchitecture({
    rag_plan_id: planId,
    engagement_id: String(engagement.engagement_id || engagement.id || ""),
    complexity_level: String(payload.complexity_level || ""),
    risk_level: String(payload.risk_level || ""),
    estimated_effort: String(payload.estimated_effort || ""),
    priority: String(payload.priority || ""),
    source_reference_id: String(payload.source_reference_id || ""),
    status: String(engagement.status || "intake-received"),
    created_at: String(engagement.createdAt || engagement.created_at || ""),
    source: String(payload.source || "rag-architecture-planner"),
  });
}

export function processLocalAiDeploymentEngagement(
  payload: Record<string, unknown>,
  engagement: Record<string, unknown>,
): void {
  const planId = resolveDeploymentPlanId(payload);
  if (!planId) return;
  attachEngagementToLocalAiDeployment({
    deployment_plan_id: planId,
    engagement_id: String(engagement.engagement_id || engagement.id || ""),
    complexity_level: String(payload.complexity_level || ""),
    risk_level: String(payload.risk_level || ""),
    estimated_effort: String(payload.estimated_effort || ""),
    priority: String(payload.priority || ""),
    source_reference_id: String(payload.source_reference_id || ""),
    status: String(engagement.status || "intake-received"),
    created_at: String(engagement.createdAt || engagement.created_at || ""),
    source: String(payload.source || "local-ai-deployment-planner"),
  });
}

export function processSecurityRemediationEngagement(
  payload: Record<string, unknown>,
  engagement: Record<string, unknown>,
): void {
  const planId = resolveRemediationPlanId(payload);
  if (!planId) return;
  attachEngagementToSecurityRemediation({
    remediation_plan_id: planId,
    engagement_id: String(engagement.engagement_id || engagement.id || ""),
    risk_level: String(payload.risk_level || ""),
    priority: String(payload.priority || ""),
    estimated_effort: String(payload.estimated_effort || ""),
    compliance_alignment: String(payload.compliance_alignment || ""),
    source_reference_id: String(payload.source_reference_id || ""),
    status: String(engagement.status || "intake-received"),
    created_at: String(engagement.createdAt || engagement.created_at || ""),
    source: String(payload.source || "security-remediation-planner"),
  });
}

export function processNorthstarBeaconEngagement(
  payload: Record<string, unknown>,
  engagement: Record<string, unknown>,
): void {
  const orderId = resolveBeaconOrderId(payload);
  if (!orderId) return;
  attachEngagementToNorthstarBeacon({
    beacon_order_id: orderId,
    engagement_id: String(engagement.engagement_id || engagement.id || ""),
    status: String(engagement.status || "intake-received"),
  });
}

export function handleOperatorFulfillmentAgentApi(
  pathname: string,
  method: string,
  engagements: Array<Record<string, unknown>> = [],
): Response | null {
  if (method === "GET" && pathname === "/api/operator/ai-agent-builds") {
    return jsonResponse({ rows: listAiAgentBuildQueue(engagements) });
  }
  if (method === "GET" && pathname === "/api/operator/security-remediation") {
    return jsonResponse({ rows: listSecurityRemediationQueue(engagements) });
  }
  if (method === "GET" && pathname === "/api/operator/rag-architectures") {
    return jsonResponse({ rows: listRagArchitectureQueue(engagements) });
  }
  if (method === "GET" && pathname === "/api/operator/local-ai-deployments") {
    return jsonResponse({ rows: listLocalAiDeploymentQueue(engagements) });
  }
  const northstarOperatorResponse = handleOperatorNorthstarBeaconApi(pathname, method);
  if (northstarOperatorResponse) {
    return northstarOperatorResponse;
  }
  return null;
}

export {
  AI_AGENT_BUILD_KEYS,
  resolveAiAgentBuildId,
  resolveDeploymentPlanId,
  resolveRemediationPlanId,
  resolveRagPlanId,
  resolveBeaconOrderId,
};
