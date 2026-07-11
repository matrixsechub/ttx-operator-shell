import type { BeaconAxis } from "../msh-ops/beacon/beaconSchema";
import type { PolicyMode } from "./policyResponse";

export type AiRoutingProfile =
  | "stability"
  | "revenue"
  | "trust"
  | "growth"
  | "wildcard";

export type AiInferenceSurface =
  | "cockpit"
  | "marketplace"
  | "fulfillment"
  | "ghost"
  | "organizer"
  | "n8n";

export interface AiModelProfile {
  profile: AiRoutingProfile;
  axis: BeaconAxis;
  models: readonly string[];
  cacheTtl: number;
  skipCache: boolean;
  maxTokens: number;
}

export const AI_MODEL_PROFILES: Record<AiRoutingProfile, AiModelProfile> = {
  stability: {
    profile: "stability",
    axis: "STABILITY",
    models: ["@cf/meta/llama-3.1-8b-instruct", "@cf/mistral/mistral-small-3.1-24b-instruct"],
    cacheTtl: 3600,
    skipCache: false,
    maxTokens: 1024,
  },
  revenue: {
    profile: "revenue",
    axis: "REVENUE_VALIDATION",
    models: ["@cf/moonshotai/kimi-k2.6", "openai/gpt-4.1-mini"],
    cacheTtl: 0,
    skipCache: true,
    maxTokens: 2048,
  },
  trust: {
    profile: "trust",
    axis: "TRUST",
    models: ["@cf/meta/llama-guard-3-8b", "@cf/meta/llama-3.1-8b-instruct"],
    cacheTtl: 3600,
    skipCache: false,
    maxTokens: 1024,
  },
  growth: {
    profile: "growth",
    axis: "CONTROLLED_GROWTH",
    models: ["@cf/meta/llama-3.3-70b-instruct", "@cf/moonshotai/kimi-k2.6"],
    cacheTtl: 3600,
    skipCache: false,
    maxTokens: 2048,
  },
  wildcard: {
    profile: "wildcard",
    axis: "WILDCARD_INNOVATION",
    models: ["@cf/moonshotai/kimi-k2.6"],
    cacheTtl: 0,
    skipCache: true,
    maxTokens: 2048,
  },
};

export const AGENT_ROUTING_PROFILES: Record<string, AiRoutingProfile> = {
  OrganizerAgent: "stability",
  AiAgentBuilderAgent: "growth",
  SecurityRemediationAgent: "trust",
  RagArchitectureAgent: "growth",
  LocalAiDeploymentAgent: "stability",
  NorthstarBeaconGovernanceApp: "trust",
  GuideAgent: "stability",
  GhostLayer: "wildcard",
  CockpitTtxAssist: "stability",
  PiecesOsMcpIngest: "stability",
  PRISM_UIUX_AGENT_V1: "trust",
};

export const MARKETPLACE_AI_ROUTES: Record<string, { profile: AiRoutingProfile; axis: BeaconAxis }> = {
  "product-analysis": { profile: "revenue", axis: "REVENUE_VALIDATION" },
  "fraud-score": { profile: "trust", axis: "TRUST" },
  "purchase-validate": { profile: "revenue", axis: "REVENUE_VALIDATION" },
  "revenue-validate": { profile: "revenue", axis: "REVENUE_VALIDATION" },
  "behavior-analysis": { profile: "trust", axis: "TRUST" },
};

export function resolveAgentProfile(agentId: string): AiRoutingProfile {
  return AGENT_ROUTING_PROFILES[agentId] ?? "stability";
}

export function selectModelForProfile(
  profile: AiRoutingProfile,
  options: {
    wildcardFeaturesEnabled: boolean;
    policyMode: PolicyMode;
    highRisk: boolean;
    errorState: boolean;
    preferredModel?: string;
  },
): { model: string; profile: AiModelProfile } {
  if (!options.wildcardFeaturesEnabled && profile === "wildcard") {
    profile = "stability";
  }

  if (options.policyMode === "RESTRICTIVE") {
    profile = "stability";
  }

  const modelProfile = AI_MODEL_PROFILES[profile];
  let models = [...modelProfile.models];

  if (options.errorState) {
    models = models.filter((m) => m.startsWith("@cf/"));
  }

  if (options.highRisk) {
    models = [models.find((m) => m.includes("llama-3.1-8b")) ?? models[0]];
  }

  if (options.preferredModel && models.includes(options.preferredModel)) {
    return { model: options.preferredModel, profile: modelProfile };
  }

  return { model: models[0], profile: modelProfile };
}

export function isModelAllowedForProfile(model: string, profile: AiRoutingProfile): boolean {
  return AI_MODEL_PROFILES[profile].models.includes(model);
}
