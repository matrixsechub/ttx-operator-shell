import type { BeaconAxis } from "../msh-ops/beacon/beaconSchema";
import { EXPECTED_BEACON_SHA256 } from "../msh-ops/beacon/beaconHash";
import { buildAgentNorthstarAlignment } from "../msh-ops/agent/beaconAlignment";
import type { AgentGovernanceContext } from "../msh-ops/agent/initAgentGovernance";
import {
  checkAutonomy,
  type AutonomousActionProposal,
  type AutonomyActionKind,
} from "../msh-ops/governance/checkAutonomy";
import type { PolicyMode, SignalFlag } from "./policyResponse";
import {
  resolveAgentProfile,
  selectModelForProfile,
  type AiInferenceSurface,
  type AiRoutingProfile,
} from "./aiModelRegistry";
import {
  recordAiGatewayDenial,
  recordAiGatewayUsage,
  recordGovernanceEvent,
  type TelemetryContextEnv,
} from "./telemetry";

const AGENT_BLOCK_KEY_PREFIX = "ai-gateway:block:";
const AGENT_DENIAL_WINDOW_MS = 60_000;
const MAX_DENIALS_PER_WINDOW = 5;

export interface AiGatewayEnv extends TelemetryContextEnv {
  AI?: Ai;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_ACCOUNT_ID?: string;
  EXPECTED_BEACON_SHA256?: string;
  CF_AI_API_TOKEN?: string;
  AI_FULFILLMENT_ENABLED?: string;
  N8N_WEBHOOK_SECRET?: string;
}

export interface InferenceMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface InferenceRequest {
  messages: InferenceMessage[];
  model?: string;
  maxTokens?: number;
  surface: AiInferenceSurface;
  operatorCallsign?: string;
  sessionId?: string;
  proposalId?: string;
}

export interface InferenceResult {
  ok: true;
  content: string;
  model: string;
  profile: AiRoutingProfile;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  northstar_alignment: ReturnType<typeof buildAgentNorthstarAlignment>;
  autonomy: { decision: string; reason: string };
}

export interface InferenceFailure {
  ok: false;
  code: string;
  error: string;
  status: number;
  councilAdvisory?: boolean;
}

export type GovernedInferenceOutcome = InferenceResult | InferenceFailure;

export interface AigGovernanceMetadata {
  agentId: string;
  actionKind: AutonomyActionKind;
  axis: BeaconAxis;
  beaconHash: string;
  policyMode: PolicyMode;
  profile: AiRoutingProfile;
  surface: AiInferenceSurface;
  operatorCallsign?: string;
  sessionId?: string;
  proposalId?: string;
}

function jsonFailure(code: string, error: string, status: number, councilAdvisory = false): InferenceFailure {
  return { ok: false, code, error, status, councilAdvisory };
}

function verifyBeaconHash(ctx: AgentGovernanceContext, expectedHash?: string): InferenceFailure | null {
  const expected = expectedHash ?? EXPECTED_BEACON_SHA256;
  if (ctx.integrityHash !== expected) {
    return jsonFailure("BEACON_INTEGRITY_FAIL", "Beacon integrity hash mismatch", 403);
  }
  return null;
}

async function isAgentBlocked(env: AiGatewayEnv, agentId: string): Promise<boolean> {
  try {
    const raw = await env.TTX_STATE.get(`${AGENT_BLOCK_KEY_PREFIX}${agentId}`);
    if (!raw) return false;
    const blockedUntil = Number(raw);
    return Number.isFinite(blockedUntil) && Date.now() < blockedUntil;
  } catch {
    return false;
  }
}

async function recordDenialAndMaybeBlock(
  env: AiGatewayEnv,
  agentId: string,
  reason: string,
): Promise<void> {
  await recordAiGatewayDenial(env, agentId, reason);
  await recordGovernanceEvent(env, "ai_gateway_denial", { agentId, reason });

  try {
    const key = `ai-gateway:denials:${agentId}`;
    const raw = await env.TTX_STATE.get(key);
    const denials: number[] = raw ? (JSON.parse(raw) as number[]) : [];
    const now = Date.now();
    const recent = denials.filter((ts) => now - ts < AGENT_DENIAL_WINDOW_MS);
    recent.push(now);
    await env.TTX_STATE.put(key, JSON.stringify(recent), { expirationTtl: 120 });
    if (recent.length > MAX_DENIALS_PER_WINDOW) {
      await env.TTX_STATE.put(
        `${AGENT_BLOCK_KEY_PREFIX}${agentId}`,
        String(now + AGENT_DENIAL_WINDOW_MS),
        { expirationTtl: 120 },
      );
      await recordGovernanceEvent(env, "ai_gateway_rate_abuse", { agentId });
    }
  } catch {
    // KV failure is non-fatal for inference denial path.
  }
}

function extractContent(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const r = response as Record<string, unknown>;
  if (typeof r.response === "string") return r.response;
  const choices = r.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const message = (choices[0] as { message?: { content?: string } }).message;
    if (typeof message?.content === "string") return message.content;
  }
  return JSON.stringify(response);
}

function extractUsage(response: unknown): InferenceResult["usage"] {
  if (!response || typeof response !== "object") {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
  const usage = (response as { usage?: Record<string, number> }).usage;
  if (!usage) return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const promptTokens = usage.prompt_tokens ?? usage.promptTokens ?? 0;
  const completionTokens = usage.completion_tokens ?? usage.completionTokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage.total_tokens ?? usage.totalTokens ?? promptTokens + completionTokens,
  };
}

function isAiFulfillmentEnabled(env: AiGatewayEnv): boolean {
  return env.AI_FULFILLMENT_ENABLED === "true" || env.AI_FULFILLMENT_ENABLED === "1";
}

export function aiFulfillmentEnabled(env: AiGatewayEnv): boolean {
  return isAiFulfillmentEnabled(env);
}

export async function runGovernedInference(
  env: AiGatewayEnv,
  ctx: AgentGovernanceContext,
  proposal: AutonomousActionProposal,
  request: InferenceRequest,
  policy: { mode: PolicyMode; wildcardFeaturesEnabled: boolean },
  signalStates: SignalFlag[] = [],
): Promise<GovernedInferenceOutcome> {
  const hashFailure = verifyBeaconHash(ctx, env.EXPECTED_BEACON_SHA256);
  if (hashFailure) {
    await recordDenialAndMaybeBlock(env, proposal.agentId, hashFailure.error);
    return hashFailure;
  }

  if (await isAgentBlocked(env, proposal.agentId)) {
    return jsonFailure("AI_GATEWAY_RATE_ABUSE", "Agent temporarily blocked due to repeated denials", 429);
  }

  const autonomy = checkAutonomy(proposal, ctx);
  if (autonomy.decision === "denied") {
    await recordDenialAndMaybeBlock(env, proposal.agentId, autonomy.reason);
    return jsonFailure("BEACON_AUTONOMY_DENIED", autonomy.reason, 403);
  }
  if (autonomy.decision === "escalate") {
    await recordDenialAndMaybeBlock(env, proposal.agentId, autonomy.reason);
    return jsonFailure("BEACON_AUTONOMY_ESCALATE", autonomy.reason, 409, true);
  }

  if (ctx.safeMode && proposal.actionKind !== "advisory") {
    return jsonFailure("BEACON_SAFE_MODE", "Beacon safe mode — advisory only", 403);
  }

  const profileName = resolveAgentProfile(proposal.agentId);
  const highRisk = signalStates.includes("HIGH_RISK");
  const errorState = signalStates.includes("ERROR_STATE");

  const { model, profile } = selectModelForProfile(profileName, {
    wildcardFeaturesEnabled: policy.wildcardFeaturesEnabled,
    policyMode: policy.mode,
    highRisk,
    errorState,
    preferredModel: request.model,
  });

  const maxTokens = highRisk
    ? Math.min(request.maxTokens ?? profile.maxTokens, 512)
    : (request.maxTokens ?? profile.maxTokens);

  const skipCache =
    proposal.actionKind !== "advisory" || profile.skipCache || policy.mode === "RESTRICTIVE";

  const metadata: AigGovernanceMetadata = {
    agentId: proposal.agentId,
    actionKind: proposal.actionKind,
    axis: proposal.axis,
    beaconHash: ctx.integrityHash,
    policyMode: policy.mode,
    profile: profileName,
    surface: request.surface,
    operatorCallsign: request.operatorCallsign,
    sessionId: request.sessionId,
    proposalId: request.proposalId,
  };

  try {
    let response: unknown;

    if (env.AI) {
      const gatewayId = env.AI_GATEWAY_ID ?? "mshops-net-governance";
      response = await env.AI.run(
        model,
        { messages: request.messages, max_tokens: maxTokens },
        {
          gateway: {
            id: gatewayId,
            skipCache,
            cacheTtl: skipCache ? undefined : profile.cacheTtl,
          },
        },
      );
    } else if (env.CF_AI_API_TOKEN && env.AI_GATEWAY_ACCOUNT_ID) {
      const gatewayId = env.AI_GATEWAY_ID ?? "mshops-net-governance";
      const url = `https://api.cloudflare.com/client/v4/accounts/${env.AI_GATEWAY_ACCOUNT_ID}/ai/v1/chat/completions`;
      const upstream = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CF_AI_API_TOKEN}`,
          "Content-Type": "application/json",
          "cf-aig-gateway-id": gatewayId,
          "cf-aig-metadata": JSON.stringify(metadata),
          "cf-aig-collect-log": "true",
          ...(skipCache ? { "cf-aig-skip-cache": "true" } : { "cf-aig-cache-ttl": String(profile.cacheTtl) }),
          "cf-aig-request-timeout": "30000",
          "cf-aig-max-attempts": "2",
          "cf-aig-backoff": "exponential",
        },
        body: JSON.stringify({ model, messages: request.messages, max_tokens: maxTokens }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return jsonFailure("AI_GATEWAY_UPSTREAM_ERROR", detail.slice(0, 240), upstream.status);
      }
      response = await upstream.json();
      if (response && typeof response === "object" && "result" in response) {
        response = (response as { result: unknown }).result;
      }
    } else {
      return jsonFailure(
        "AI_GATEWAY_UNAVAILABLE",
        "AI binding and CF_AI_API_TOKEN are not configured",
        503,
      );
    }

    const content = extractContent(response);
    const usage = extractUsage(response);

    await recordAiGatewayUsage(env, {
      agentId: proposal.agentId,
      profile: profileName,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      surface: request.surface,
    });
    await recordGovernanceEvent(env, "ai_inference", {
      agentId: proposal.agentId,
      axis: proposal.axis,
      decision: autonomy.decision,
      model,
      profile: profileName,
    });

    return {
      ok: true,
      content,
      model,
      profile: profileName,
      usage,
      northstar_alignment: buildAgentNorthstarAlignment(proposal.agentId, proposal.axis),
      autonomy: { decision: autonomy.decision, reason: autonomy.reason },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonFailure("AI_GATEWAY_EXECUTION_ERROR", message, 502);
  }
}
