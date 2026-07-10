import { CATALOG_ITEMS } from "./catalogData";
import { getAgentGovernanceContextFor } from "../msh-ops/agent/initAgentGovernance";
import { analyzeBehaviorIntelligence } from "./behaviorIntelligence";
import type { BackboneEnv } from "./backboneEnv";
import { resolveEffectiveKernelContext } from "./kernel";
import { MARKETPLACE_AI_ROUTES } from "./aiModelRegistry";
import { runGovernedInference, type AiGatewayEnv } from "./aiGateway";
import { getUsageSummary } from "./usage";
import { recordMarketplaceAiEvent } from "./telemetry";
import type { WorkerEnv } from "./env";

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

const ROUTE_MAP: Record<string, string> = {
  "/api/ai/marketplace/product-analysis": "product-analysis",
  "/api/ai/marketplace/fraud-score": "fraud-score",
  "/api/ai/marketplace/purchase-validate": "purchase-validate",
  "/api/ai/marketplace/revenue-validate": "revenue-validate",
  "/api/ai/marketplace/behavior-analysis": "behavior-analysis",
};

function buildMarketplacePrompt(routeKey: string, payload: Record<string, unknown>): string {
  switch (routeKey) {
    case "product-analysis": {
      const itemId = payload.itemId ?? payload.id;
      const item = CATALOG_ITEMS.find((c) => c.id === itemId);
      return `Analyze this marketplace product metadata and suggest tags, tier, and positioning (advisory only):\n${JSON.stringify(item ?? payload, null, 2)}`;
    }
    case "fraud-score":
      return `Score purchase intent fraud risk (advisory only, no PII). Signals:\n${JSON.stringify(payload, null, 2)}`;
    case "purchase-validate":
      return `Validate purchase intent against entitlements (advisory only):\n${JSON.stringify(payload, null, 2)}`;
    case "revenue-validate":
      return `Analyze revenue validation signals from marketplace usage (advisory only):\n${JSON.stringify(payload, null, 2)}`;
    case "behavior-analysis":
      return `Classify user behavior patterns for marketplace conversion (advisory only):\n${JSON.stringify(payload, null, 2)}`;
    default:
      return `Marketplace advisory analysis:\n${JSON.stringify(payload, null, 2)}`;
  }
}

export async function handleMarketplaceAiRoute(
  request: Request,
  pathname: string,
  env: WorkerEnv & BackboneEnv & AiGatewayEnv,
): Promise<Response | null> {
  const routeKey = ROUTE_MAP[pathname];
  if (!routeKey || request.method !== "POST") return null;

  const routeConfig = MARKETPLACE_AI_ROUTES[routeKey];
  if (!routeConfig) return jsonResponse({ error: "Unknown marketplace AI route" }, 404);

  try {
    const payload = await readJsonBody(request);
    const kernelCtx = await resolveEffectiveKernelContext(env);
    const agentId = `MarketplaceAi:${routeKey}`;
    const governance = getAgentGovernanceContextFor(agentId);

    let enrichedPayload = payload;
    if (routeKey === "behavior-analysis" || routeKey === "revenue-validate") {
      const usage = await getUsageSummary(env);
      const behavior = analyzeBehaviorIntelligence(usage);
      enrichedPayload = { ...payload, usage, behavior };
    }

    const outcome = await runGovernedInference(
      env,
      governance,
      {
        agentId,
        actionKind: "advisory",
        description: `Marketplace ${routeKey} advisory analysis`,
        axis: routeConfig.axis,
      },
      {
        messages: [{ role: "user", content: buildMarketplacePrompt(routeKey, enrichedPayload) }],
        surface: "marketplace",
      },
      kernelCtx.policy,
      kernelCtx.signalStates,
    );

    await recordMarketplaceAiEvent(env, routeKey, outcome.ok);

    if (!outcome.ok) {
      return jsonResponse({ error: outcome.error, code: outcome.code }, outcome.status);
    }

    return jsonResponse({
      ok: true,
      route: routeKey,
      analysis: outcome.content,
      model: outcome.model,
      profile: outcome.profile,
      usage: outcome.usage,
      northstar_alignment: outcome.northstar_alignment,
      advisory: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "marketplace-ai-failed";
    return jsonResponse({ error: message }, 400);
  }
}
