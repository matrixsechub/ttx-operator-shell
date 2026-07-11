import { getAccessTokenOperator, type AuthEnv } from "./auth";
import { getCodexManifest } from "./codex/manifestHash";
import { getAiUsageRollup, type TelemetryEnv } from "./telemetry";
import type { ModeEnv } from "./mode";

export const ORGANIZER_REPORT_KV_KEY = "organizer:v1:latest";

export type OperatorAgentsRouteEnv = TelemetryEnv & AuthEnv & ModeEnv;

interface CodexAgentEntry {
  agent_id: string;
  name: string;
  role: string;
  autonomy_level: string;
  implementation: string;
}

export interface OperatorAgentRegistryEntry {
  agentId: string;
  name: string;
  role: string;
  autonomyLevel: string;
  implementation: string;
  approvalGated: boolean;
  requestCount: number;
  state: "idle" | "active";
}

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function isApprovalGated(autonomyLevel: string): boolean {
  return autonomyLevel !== "A0" && autonomyLevel !== "A1";
}

export async function handleOperatorAgentsRoute(
  request: Request,
  pathname: string,
  method: string,
  env: OperatorAgentsRouteEnv,
): Promise<Response | null> {
  if (pathname === "/api/operator/agents" && method === "GET") {
    const operator = await getAccessTokenOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required" }, 401);
    }

    const manifest = getCodexManifest() as { agents?: CodexAgentEntry[] };
    const aiUsage = await getAiUsageRollup(env);
    const agents: OperatorAgentRegistryEntry[] = (manifest.agents ?? []).map((agent) => {
      const requestCount = aiUsage.byAgent[agent.agent_id] ?? 0;
      return {
        agentId: agent.agent_id,
        name: agent.name,
        role: agent.role,
        autonomyLevel: agent.autonomy_level,
        implementation: agent.implementation,
        approvalGated: isApprovalGated(agent.autonomy_level),
        requestCount,
        state: requestCount > 0 ? "active" : "idle",
      };
    });

    return jsonResponse({
      ok: true,
      agents,
      aiUsage: {
        requestCount: aiUsage.requestCount,
        denialCount: aiUsage.denialCount,
        updatedAt: aiUsage.updatedAt,
      },
    });
  }

  if (
    (pathname === "/api/operator/organizer/report" || pathname === "/api/operator/agents/organizer/report") &&
    method === "GET"
  ) {
    const operator = await getAccessTokenOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required" }, 401);
    }

    const raw = await env.TTX_STATE.get(ORGANIZER_REPORT_KV_KEY);
    if (!raw) {
      return jsonResponse({
        ok: true,
        available: false,
        reason: "no_report_published",
        hint: "Run npm run organizer:scheduled with ORGANIZER_KV_PUBLISH=1 to publish a report.",
      });
    }

    try {
      const report = JSON.parse(raw) as Record<string, unknown>;
      return jsonResponse({ ok: true, available: true, report });
    } catch {
      return jsonResponse({
        ok: true,
        available: false,
        reason: "report_parse_failed",
      });
    }
  }

  return null;
}
