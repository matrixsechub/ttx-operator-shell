import type { BeaconAxis } from "../msh-ops/beacon/beaconSchema";
import { getAgentGovernanceContextFor } from "../msh-ops/agent/initAgentGovernance";
import { ingestMcpPayload } from "../msh-ops/mcp/ingestMcpPayload";
import { getAccessTokenOperator } from "./auth";
import type { BackboneEnv } from "./backboneEnv";
import type { WorkerEnv } from "./env";
import { resolveEffectiveKernelContext } from "./kernel";
import { resolveSurfaceMode } from "./surface";
import {
  runGovernedInference,
  type AiGatewayEnv,
  type InferenceMessage,
} from "./aiGateway";
import { getAiUsageRollup } from "./telemetry";
import { buildCouncilPacket } from "./councilPacket";
import { handleMarketplaceAiRoute } from "./marketplaceAiRoutes";

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

async function readJsonBody(request: Request, maxBytes = 32_768): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const raw = await request.text();
  if (raw.length > maxBytes) throw new Error("Payload too large");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

function parseMessages(raw: unknown): InferenceMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("messages must be a non-empty array");
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`messages[${index}] must be an object`);
    }
    const msg = item as Record<string, unknown>;
    const role = msg.role;
    const content = msg.content;
    if (role !== "system" && role !== "user" && role !== "assistant") {
      throw new Error(`messages[${index}].role is invalid`);
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error(`messages[${index}].content must be a non-empty string`);
    }
    return { role, content: content.trim() };
  });
}

function parseAxis(raw: unknown): BeaconAxis {
  const allowed = [
    "STABILITY",
    "REVENUE_VALIDATION",
    "TRUST",
    "CONTROLLED_GROWTH",
    "WILDCARD_INNOVATION",
  ] as const;
  if (typeof raw !== "string" || !allowed.includes(raw as BeaconAxis)) {
    return "STABILITY";
  }
  return raw as BeaconAxis;
}

function parseActionKind(raw: unknown): "advisory" | "mutate_state" | "autonomous_execute" {
  if (raw === "mutate_state" || raw === "autonomous_execute") return raw;
  return "advisory";
}

function isAiRouteBlockedOnPublicSurface(pathname: string, env: Env): boolean {
  const mode = resolveSurfaceMode(env);
  return mode === "public" && pathname.startsWith("/api/ai/");
}

function validateN8nSecret(request: Request, env: AiGatewayEnv): boolean {
  const secret = env.N8N_WEBHOOK_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("X-N8N-Webhook-Secret");
  return provided === secret;
}

export async function handleAiGatewayRoute(
  request: Request,
  pathname: string,
  env: WorkerEnv & BackboneEnv & AiGatewayEnv,
): Promise<Response | null> {
  if (pathname === "/api/council/packet" && request.method === "GET") {
    const packet = await buildCouncilPacket(env);
    return jsonResponse({ ok: true, packet });
  }

  if (pathname === "/api/telemetry/events" && request.method === "GET") {
    const rollup = await getAiUsageRollup(env);
    const govRaw = await env.TTX_STATE.get("telemetry:governance-events");
    const governanceEvents = govRaw ? JSON.parse(govRaw) : [];
    return jsonResponse({
      ok: true,
      events: governanceEvents,
      aiUsage: rollup,
      source: "kv",
    });
  }

  if (!pathname.startsWith("/api/ai/")) return null;

  if (isAiRouteBlockedOnPublicSurface(pathname, env)) {
    return jsonResponse({ error: "AI routes are not available on the public surface" }, 403);
  }

  if (pathname.startsWith("/api/ai/marketplace/")) {
    return handleMarketplaceAiRoute(request, pathname, env);
  }

  if (pathname === "/api/ai/usage" && request.method === "GET") {
    const rollup = await getAiUsageRollup(env);
    return jsonResponse({ ok: true, rollup });
  }

  if (pathname === "/api/ai/mcp/signal" && request.method === "POST") {
    try {
      const payload = await readJsonBody(request);
      const result = await ingestMcpPayload(payload);
      if (!result.accepted) {
        return jsonResponse({ error: "MCP validation failed", errors: result.errors }, 400);
      }
      const severity = result.proposal?.governanceSignal?.severity;
      if (severity === "high" || severity === "medium") {
        await env.TTX_STATE.put(
          "ai-gateway:mcp-strict-signal",
          JSON.stringify({ severity, at: new Date().toISOString() }),
          { expirationTtl: 3600 },
        );
      }
      return jsonResponse({
        ok: true,
        accepted: true,
        proposalId: result.proposal?.proposalId ?? null,
        mutationApplied: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "mcp-signal-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  if (pathname === "/api/ai/infer" && request.method === "POST") {
    const n8nAuthorized = validateN8nSecret(request, env);
    if (!n8nAuthorized) {
      const operator = await getAccessTokenOperator(request, env);
      if (!operator) {
        return jsonResponse({ error: "Operator authentication required" }, 401);
      }
    }

    try {
      const payload = await readJsonBody(request);
      const agentId = typeof payload.agentId === "string" ? payload.agentId.trim() : "GuideAgent";
      const axis = n8nAuthorized ? "STABILITY" : parseAxis(payload.axis);
      const actionKind = n8nAuthorized ? "advisory" : parseActionKind(payload.actionKind);
      const messages = parseMessages(payload.messages);
      const operator = await getAccessTokenOperator(request, env);

      const kernelCtx = await resolveEffectiveKernelContext(env);
      const governance = getAgentGovernanceContextFor(agentId);
      const outcome = await runGovernedInference(
        env,
        governance,
        {
          agentId,
          actionKind,
          description: typeof payload.description === "string" ? payload.description : "AI inference request",
          axis,
          priorityIndex: typeof payload.priorityIndex === "number" ? payload.priorityIndex : undefined,
          operatorApproval: payload.operator_approval === true,
        },
        {
          messages,
          model: typeof payload.model === "string" ? payload.model : undefined,
          maxTokens: typeof payload.maxTokens === "number" ? payload.maxTokens : undefined,
          surface: n8nAuthorized
            ? "n8n"
            : typeof payload.surface === "string"
              ? (payload.surface as import("./aiModelRegistry").AiInferenceSurface)
              : "cockpit",
          operatorCallsign: operator?.handle,
          sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
          proposalId: typeof payload.proposalId === "string" ? payload.proposalId : undefined,
        },
        kernelCtx.policy,
        kernelCtx.signalStates,
      );

      if (!outcome.ok) {
        return jsonResponse(
          { error: outcome.error, code: outcome.code, councilAdvisory: outcome.councilAdvisory ?? false },
          outcome.status,
        );
      }

      return jsonResponse({
        ok: true,
        content: outcome.content,
        model: outcome.model,
        profile: outcome.profile,
        usage: outcome.usage,
        northstar_alignment: outcome.northstar_alignment,
        autonomy: outcome.autonomy,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "ai-infer-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  return null;
}
