/**
 * Centralized Cloudflare federation fallbacks, field normalization, and route catalog.
 * All payloads remain advisory-only and non-breaking for existing consumers.
 */

export const CLOUDFLARE_HEALTH_VALUES = ["healthy", "advisory", "degraded", "optional"];

/** Canonical field names exposed on every federation route envelope. */
export const CLOUDFLARE_NORMALIZED_FIELDS = ["health", "score", "mode", "reasons"];

export const CLOUDFLARE_DOMAIN_MODES = {
  decision: ["proceed", "caution", "hold"],
  adaptive: ["steady", "caution", "review", "degraded"],
  predictive: ["stable", "watch", "alert", "fallback"],
  strategic: { horizon: ["short", "medium", "long"], stripMode: ["stable", "watch", "prioritize"] },
  sync: ["aligned", "partial", "divergent"],
};

export function normalizeCloudflareHealth(value) {
  const raw = String(value || "optional").toLowerCase();
  if (raw === "healthy" || raw === "online" || raw === "ready" || raw === "aligned" || raw === "certified" || raw === "steady" || raw === "stable" || raw === "proceed") {
    return "healthy";
  }
  if (raw === "degraded" || raw === "offline" || raw === "hold" || raw === "incompatible" || raw === "divergent" || raw === "alert" || raw === "fallback" || raw === "prioritize") {
    return "degraded";
  }
  if (raw === "optional") {
    return "optional";
  }
  return "advisory";
}

export function normalizeCloudflareScore(value, fallback = 50) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function extractDomainMode(payload = {}, domain = "unknown") {
  switch (domain) {
    case "decision":
      return payload.decision || payload.mode || null;
    case "adaptive":
      return payload.adaptiveState?.mode || payload.mode || null;
    case "predictive":
      return payload.predictiveState?.forecastMode || payload.mode || null;
    case "strategic":
      return payload.strategicState?.stripMode || payload.mode || null;
    case "ucip":
      return payload.ucipState?.mode || payload.mode || null;
    case "amg":
      return payload.amgState?.mode || payload.mode || null;
    case "cba":
      return payload.cbaState?.mode || payload.mode || null;
    case "cal":
      return payload.calState?.mode || payload.mode || null;
    case "ihl":
      return payload.ihlState?.mode || payload.mode || null;
    case "iarl":
      return payload.iarlState?.mode || payload.mode || null;
    case "acl":
      return payload.aclState?.mode || payload.mode || null;
    case "meta-stack":
      return payload.cloudflareACL?.aclState?.mode || payload.aclState?.mode || payload.mode || null;
    case "version":
      return payload.cloudflareACLMode || payload.cloudflareUCIPMode || payload.health || null;
    case "sync":
    case "cross-division":
      return payload.syncStatus || payload.mode || null;
    case "certification":
      return payload.aggregate?.status || payload.mode || null;
    case "automation":
      return (payload.activeCount ?? 0) > 0 ? "active" : "idle";
    default:
      return payload.mode || payload.status || null;
  }
}

export function extractDomainNormalizedFields(payload = {}, domain = "unknown") {
  const health = normalizeCloudflareHealth(
    payload.health ||
      payload.federationMeta?.health ||
      payload.adaptiveHealth ||
      payload.predictiveHealth ||
      payload.strategicHealth ||
      payload.orchestrationHealth ||
      payload.executionHealth ||
      payload.crossDivisionHealth ||
      payload.cloudflareCrossDivisionHealth ||
      payload.aggregate?.status ||
      (domain === "decision" ? payload.decision : null),
  );
  const score = normalizeCloudflareScore(
    payload.score ??
      payload.federationMeta?.score ??
      payload.adaptiveScore ??
      payload.predictiveScore ??
      payload.strategicScore ??
      payload.orchestrationScore ??
      payload.executionScore ??
      payload.crossDivisionScore ??
      payload.cloudflareCrossDivisionScore ??
      payload.adaptiveState?.score ??
      payload.predictiveState?.forecastScore ??
      payload.strategicState?.planScore ??
      payload.aggregate?.score ??
      payload.cloudflareInsightsScore ??
      payload.activeCount != null
        ? Math.max(0, 100 - Number(payload.activeCount) * 15)
        : null,
  );
  const reasons = Array.isArray(payload.reasons) && payload.reasons.length
    ? payload.reasons
    : Array.isArray(payload.federationMeta?.reasons) && payload.federationMeta.reasons.length
      ? payload.federationMeta.reasons
      : [
          ...(payload.crossDivisionReasons || []),
          ...(payload.cloudflareCrossDivisionReasons || []),
          ...(payload.orchestrationReasons || []),
          ...(payload.executionReasons || []),
          ...(payload.adaptiveState?.reasons || []),
          ...(payload.predictiveState?.forecastReasons || []),
          ...(payload.strategicState?.planReasons || []),
          ...(payload.aggregate?.reasons || []),
        ].filter(Boolean);
  return {
    health,
    score,
    mode: extractDomainMode(payload, domain),
    reasons,
  };
}

export function normalizeCrossDivisionFields(payload = {}) {
  const score = payload.cloudflareCrossDivisionScore ?? payload.crossDivisionScore ?? null;
  const health = payload.cloudflareCrossDivisionHealth ?? payload.crossDivisionHealth ?? "optional";
  const reasons = payload.cloudflareCrossDivisionReasons ?? payload.crossDivisionReasons ?? [];
  return {
    ...payload,
    crossDivisionScore: score,
    crossDivisionHealth: normalizeCloudflareHealth(health),
    crossDivisionReasons: reasons,
    cloudflareCrossDivisionScore: score,
    cloudflareCrossDivisionHealth: normalizeCloudflareHealth(health),
    cloudflareCrossDivisionReasons: reasons,
  };
}

export function buildCloudflareCatalogFederationBlock({
  decision = {},
  certification = {},
  crossDivision = {},
  orchestration = {},
  execution = {},
  adaptive = {},
  predictive = {},
  strategic = {},
  ucip = {},
  amg = {},
  cba = {},
  cal = {},
  ihl = {},
  iarl = {},
  acl = {},
} = {}) {
  const sync = normalizeCrossDivisionFields(crossDivision);
  return {
    cloudflareDecision: decision.decision,
    cloudflareDecisionScore: decision.score,
    cloudflareCertification: certification.aggregate,
    cloudflareCrossDivisionSync: {
      syncStatus: sync.syncStatus,
      crossDivisionScore: sync.crossDivisionScore,
      crossDivisionHealth: sync.crossDivisionHealth,
    },
    cloudflareOrchestration: {
      orchestrationScore: orchestration.orchestrationScore,
      orchestrationHealth: normalizeCloudflareHealth(orchestration.orchestrationHealth),
      planCount: (orchestration.plan || []).length,
    },
    cloudflareExecution: {
      executionScore: execution.executionScore,
      executionHealth: normalizeCloudflareHealth(execution.executionHealth),
      planCount: (execution.executionPlan || []).length,
    },
    cloudflareAdaptive: {
      adaptiveScore: adaptive.adaptiveScore,
      adaptiveHealth: normalizeCloudflareHealth(adaptive.adaptiveHealth),
      mode: adaptive.adaptiveState?.mode,
    },
    cloudflarePredictive: {
      predictiveScore: predictive.predictiveScore,
      predictiveHealth: normalizeCloudflareHealth(predictive.predictiveHealth),
      forecastMode: predictive.predictiveState?.forecastMode,
    },
    cloudflareStrategic: {
      strategicScore: strategic.strategicScore,
      strategicHealth: normalizeCloudflareHealth(strategic.strategicHealth),
      horizon: strategic.strategicState?.horizon,
      stripMode: strategic.strategicState?.stripMode,
    },
    cloudflareUCIP: {
      ucipScore: ucip.ucipScore ?? ucip.ucipState?.score,
      ucipHealth: normalizeCloudflareHealth(ucip.ucipHealth || ucip.ucipState?.health),
      mode: ucip.ucipState?.mode,
      horizon: ucip.ucipState?.horizon,
    },
    cloudflareAMG: {
      amgScore: amg.amgScore ?? amg.amgState?.score,
      amgHealth: normalizeCloudflareHealth(amg.amgHealth || amg.amgState?.health),
      mode: amg.amgState?.mode,
    },
    cloudflareCBA: {
      cbaScore: cba.cbaScore ?? cba.cbaState?.score,
      cbaHealth: normalizeCloudflareHealth(cba.cbaHealth || cba.cbaState?.health),
      mode: cba.cbaState?.mode,
    },
    cloudflareCAL: {
      calScore: cal.calScore ?? cal.calState?.score,
      calHealth: normalizeCloudflareHealth(cal.calHealth || cal.calState?.health),
      mode: cal.calState?.mode,
    },
    cloudflareIHL: {
      ihlScore: ihl.ihlScore ?? ihl.ihlState?.score,
      ihlHealth: normalizeCloudflareHealth(ihl.ihlHealth || ihl.ihlState?.health),
      mode: ihl.ihlState?.mode,
    },
    cloudflareIARL: {
      iarlScore: iarl.iarlScore ?? iarl.iarlState?.score,
      iarlHealth: normalizeCloudflareHealth(iarl.iarlHealth || iarl.iarlState?.health),
      mode: iarl.iarlState?.mode,
    },
    cloudflareACL: {
      aclScore: acl.aclScore ?? acl.aclState?.score,
      aclHealth: normalizeCloudflareHealth(acl.aclHealth || acl.aclState?.health),
      mode: acl.aclState?.mode,
    },
  };
}

export function buildCloudflareHeartbeatFields({
  federationReadiness = {},
  federationHeartbeat = {},
  cloudflareObservability = {},
  cloudflareAutonomous = {},
  cloudflareInsights = {},
  cloudflareDecision = {},
  cloudflareAutomation = {},
  cloudflareCertification = {},
  cloudflareCrossDivision = {},
  cloudflareOrchestration = {},
  cloudflareExecution = {},
  cloudflareAdaptive = {},
  cloudflarePredictive = {},
  cloudflareStrategic = {},
  cloudflareUcip = {},
  cloudflareAmg = {},
  cloudflareCba = {},
  cloudflareCal = {},
  cloudflareIhl = {},
  cloudflareIarl = {},
  cloudflareAcl = {},
  expandedFederationScore = null,
  triggers = [],
  cloudflareAutonomousHealth = null,
  cloudflareEventsHealth = null,
} = {}) {
  const sync = normalizeCrossDivisionFields(cloudflareCrossDivision);
  const eventsHealth =
    cloudflareEventsHealth != null
      ? cloudflareEventsHealth
      : cloudflareAutonomous.cloudflareEvents?.length === 0
        ? "optional"
        : "healthy";
  return {
    cloudflareObservability,
    cloudflareObservabilityHealth: normalizeCloudflareHealth(cloudflareObservability.health),
    cloudflareFederationHealth: federationReadiness.readiness,
    cloudflareFederationScore: expandedFederationScore,
    cloudflareFederationScoreBreakdown: {
      readiness: federationHeartbeat.cloudflareFederationScore,
      autonomous: cloudflareAutonomous.cloudflareSafety?.autonomousScore ?? null,
      insights: cloudflareInsights.cloudflareInsightsScore,
      expanded: expandedFederationScore,
      autonomousTriggers: triggers,
    },
    cloudflareFederationSummary: federationReadiness.actionsSummary,
    cloudflareLatencyMs: federationHeartbeat.cloudflareLatencyMs,
    cloudflareOAuthStatus: federationHeartbeat.cloudflareOAuthStatus,
    cloudflareServerStatus: cloudflareObservability.serverStatuses,
    cloudflareDocsServerHealth: cloudflareObservability.docsServerHealth,
    cloudflareLogsHealth: federationHeartbeat.cloudflareLogsHealth,
    cloudflareMetricsHealth: federationHeartbeat.cloudflareMetricsHealth,
    cloudflareBuildHealth: federationHeartbeat.cloudflareBuildHealth,
    cloudflareBindingHealth: federationHeartbeat.cloudflareBindingHealth,
    cloudflareDocsHealth: federationHeartbeat.cloudflareDocsHealth,
    cloudflareAutonomousScore: cloudflareAutonomous.cloudflareSafety?.autonomousScore ?? null,
    cloudflareAutonomousWarnings: cloudflareAutonomous.cloudflareSafety?.autonomousWarnings || [],
    cloudflareLatencyRisk: cloudflareAutonomous.cloudflareSafety?.latencyRisk || "low",
    cloudflareOAuthRisk: cloudflareAutonomous.cloudflareSafety?.oauthRisk || "low",
    cloudflareEventHooks: cloudflareAutonomous.cloudflareEvents || {},
    cloudflareAutonomousSignals: cloudflareAutonomous.cloudflareGovernance?.autonomousSignals || {},
    cloudflareAutonomousHealth: normalizeCloudflareHealth(
      cloudflareAutonomousHealth ??
        (cloudflareAutonomous.cloudflareGovernance?.health ||
          (triggers.length ? "advisory" : "healthy")),
    ),
    cloudflareInsightsHealth: normalizeCloudflareHealth(cloudflareInsights.health),
    cloudflareInsightsScore: cloudflareInsights.cloudflareInsightsScore,
    cloudflareInsights: cloudflareInsights.cloudflareInsights,
    cloudflareEventsHealth: normalizeCloudflareHealth(eventsHealth),
    cloudflareDecisionHealth: normalizeCloudflareHealth(cloudflareDecision.decision),
    cloudflareDecisionScore: cloudflareDecision.score,
    cloudflareDecisionReasons: cloudflareDecision.reasons || [],
    cloudflareDecisionSummary: cloudflareDecision.summary,
    cloudflareDecision: cloudflareDecision.decision,
    cloudflareDecisionRiskBadges: cloudflareDecision.riskBadges,
    cloudflareAutomationHealth: normalizeCloudflareHealth(
      cloudflareAutomation.health || (cloudflareAutomation.activeCount > 0 ? "advisory" : "healthy"),
    ),
    cloudflareAutomationScore: normalizeCloudflareScore(
      cloudflareAutomation.score ?? (cloudflareAutomation.activeCount != null ? 100 - cloudflareAutomation.activeCount * 15 : 50),
    ),
    cloudflareAutomationReasons: cloudflareAutomation.reasons || [],
    cloudflareAutomationLoops: cloudflareAutomation.loops || {},
    cloudflareCertificationHealth: normalizeCloudflareHealth(cloudflareCertification.aggregate?.status),
    cloudflareCertificationScore: cloudflareCertification.aggregate?.score ?? null,
    cloudflareCertificationReasons: cloudflareCertification.aggregate?.reasons || [],
    cloudflareCrossDivisionScore: sync.crossDivisionScore,
    cloudflareCrossDivisionHealth: sync.crossDivisionHealth,
    cloudflareCrossDivisionReasons: sync.crossDivisionReasons,
    cloudflareCrossDivisionSyncStatus: sync.syncStatus || "partial",
    cloudflareCrossDivisionSync: sync,
    cloudflareOrchestrationHealth: normalizeCloudflareHealth(cloudflareOrchestration.orchestrationHealth),
    cloudflareOrchestrationScore: cloudflareOrchestration.orchestrationScore ?? null,
    cloudflareOrchestrationReasons: cloudflareOrchestration.orchestrationReasons || [],
    cloudflareOrchestrationPlan: cloudflareOrchestration.plan || [],
    cloudflareAgentSignals: cloudflareOrchestration.cloudflareAgentSignals || cloudflareOrchestration.agents || {},
    cloudflareExecutionHealth: normalizeCloudflareHealth(cloudflareExecution.executionHealth),
    cloudflareExecutionScore: cloudflareExecution.executionScore ?? null,
    cloudflareExecutionReasons: cloudflareExecution.executionReasons || [],
    cloudflareExecutionPlan: cloudflareExecution.executionPlan || [],
    cloudflareExecutionNextActions: cloudflareExecution.nextActions || [],
    cloudflareExecutionSignals: cloudflareExecution.cloudflareExecutionSignals || {},
    cloudflareAdaptiveHealth: normalizeCloudflareHealth(cloudflareAdaptive.adaptiveHealth),
    cloudflareAdaptiveScore: cloudflareAdaptive.adaptiveScore,
    cloudflareAdaptiveMode: cloudflareAdaptive.adaptiveState?.mode || "caution",
    cloudflareAdaptiveReasons: cloudflareAdaptive.adaptiveState?.reasons || [],
    cloudflareAdaptiveUiHints: cloudflareAdaptive.uiHints || [],
    cloudflareAdaptiveOperatorGuidance: cloudflareAdaptive.operatorGuidance || [],
    cloudflarePredictiveHealth: normalizeCloudflareHealth(cloudflarePredictive.predictiveHealth),
    cloudflarePredictiveScore: cloudflarePredictive.predictiveScore,
    cloudflarePredictiveMode: cloudflarePredictive.predictiveState?.forecastMode || "watch",
    cloudflarePredictiveReasons: cloudflarePredictive.predictiveState?.forecastReasons || [],
    cloudflarePredictiveForecast: cloudflarePredictive.predictions || [],
    cloudflarePredictivePreemptiveActions: cloudflarePredictive.recommendedPreemptiveActions || [],
    cloudflareStrategicHealth: normalizeCloudflareHealth(cloudflareStrategic.strategicHealth),
    cloudflareStrategicScore: cloudflareStrategic.strategicScore,
    cloudflareStrategicHorizon: cloudflareStrategic.strategicState?.horizon || "short",
    cloudflareStrategicStripMode: cloudflareStrategic.strategicState?.stripMode || "watch",
    cloudflareStrategicReasons: cloudflareStrategic.strategicState?.planReasons || [],
    cloudflareStrategicPlan: cloudflareStrategic.strategicPlan || [],
    cloudflareStrategicThemes: cloudflareStrategic.strategicThemes || [],
    cloudflareStrategicCampaigns: cloudflareStrategic.recommendedCampaigns || [],
    cloudflareUCIPHealth: cloudflareUcip.ucipHealth || cloudflareUcip.ucipState?.health || "optional",
    cloudflareUCIPScore: cloudflareUcip.ucipScore ?? cloudflareUcip.ucipState?.score ?? null,
    cloudflareUCIPMode: cloudflareUcip.ucipState?.mode || "yellow",
    cloudflareUCIPReasons: cloudflareUcip.ucipReasons || [],
    cloudflareUCIPRecommendedActions: cloudflareUcip.ucipRecommendedActions || [],
    cloudflareUCIPCampaigns: cloudflareUcip.ucipCampaigns || [],
    cloudflareUCIPSignals: cloudflareUcip.ucipSignals || {},
    cloudflareAMGHealth: cloudflareAmg.amgHealth || cloudflareAmg.amgState?.health || "optional",
    cloudflareAMGScore: cloudflareAmg.amgScore ?? cloudflareAmg.amgState?.score ?? null,
    cloudflareAMGMode: cloudflareAmg.amgState?.mode || "govern_yellow",
    cloudflareAMGReasons: cloudflareAmg.amgReasons || [],
    cloudflareAMGRules: cloudflareAmg.amgRules || [],
    cloudflareAMGOperatorNudges: cloudflareAmg.amgOperatorNudges || [],
    cloudflareAMGPolicyHints: cloudflareAmg.amgPolicyHints || [],
    cloudflareCBAHealth: cloudflareCba.cbaHealth || cloudflareCba.cbaState?.health || "optional",
    cloudflareCBAScore: cloudflareCba.cbaScore ?? cloudflareCba.cbaState?.score ?? null,
    cloudflareCBAMode: cloudflareCba.cbaState?.mode || "behavior_yellow",
    cloudflareCBABehaviorPatterns: cloudflareCba.cbaBehaviorPatterns || [],
    cloudflareCBABehaviorDriftWarnings: cloudflareCba.cbaBehaviorDriftWarnings || [],
    cloudflareCBAOperatorBehaviorHints: cloudflareCba.cbaOperatorBehaviorHints || [],
    cloudflareCBASystemBehaviorHints: cloudflareCba.cbaSystemBehaviorHints || [],
    cloudflareCBAReasons: cloudflareCba.cbaReasons || [],
    cloudflareCALHealth: cloudflareCal.calHealth || cloudflareCal.calState?.health || "optional",
    cloudflareCALScore: cloudflareCal.calScore ?? cloudflareCal.calState?.score ?? null,
    cloudflareCALMode: cloudflareCal.calState?.mode || "align_yellow",
    cloudflareCALAlignmentFindings: cloudflareCal.calAlignmentFindings || [],
    cloudflareCALAlignmentWarnings: cloudflareCal.calAlignmentWarnings || [],
    cloudflareCALOperatorAlignmentHints: cloudflareCal.calOperatorAlignmentHints || [],
    cloudflareCALSystemAlignmentHints: cloudflareCal.calSystemAlignmentHints || [],
    cloudflareCALReasons: cloudflareCal.calReasons || [],
    cloudflareIHLHealth: cloudflareIhl.ihlHealth || cloudflareIhl.ihlState?.health || "optional",
    cloudflareIHLScore: cloudflareIhl.ihlScore ?? cloudflareIhl.ihlState?.score ?? null,
    cloudflareIHLMode: cloudflareIhl.ihlState?.mode || "intent_yellow",
    cloudflareIHLIntentFindings: cloudflareIhl.ihlIntentFindings || [],
    cloudflareIHLIntentWarnings: cloudflareIhl.ihlIntentWarnings || [],
    cloudflareIHLOperatorIntentHints: cloudflareIhl.ihlOperatorIntentHints || [],
    cloudflareIHLSystemIntentHints: cloudflareIhl.ihlSystemIntentHints || [],
    cloudflareIHLReasons: cloudflareIhl.ihlReasons || [],
    cloudflareIARLHealth: cloudflareIarl.iarlHealth || cloudflareIarl.iarlState?.health || "optional",
    cloudflareIARLScore: cloudflareIarl.iarlScore ?? cloudflareIarl.iarlState?.score ?? null,
    cloudflareIARLMode: cloudflareIarl.iarlState?.mode || "resonance_yellow",
    cloudflareIARLResonanceFindings: cloudflareIarl.iarlResonanceFindings || [],
    cloudflareIARLResonanceWarnings: cloudflareIarl.iarlResonanceWarnings || [],
    cloudflareIARLOperatorResonanceHints: cloudflareIarl.iarlOperatorResonanceHints || [],
    cloudflareIARLSystemResonanceHints: cloudflareIarl.iarlSystemResonanceHints || [],
    cloudflareIARLReasons: cloudflareIarl.iarlReasons || [],
    cloudflareACLHealth: cloudflareAcl.aclHealth || cloudflareAcl.aclState?.health || "optional",
    cloudflareACLScore: cloudflareAcl.aclScore ?? cloudflareAcl.aclState?.score ?? null,
    cloudflareACLMode: cloudflareAcl.aclState?.mode || "coherence_yellow",
    cloudflareACLCoherenceFindings: cloudflareAcl.aclCoherenceFindings || [],
    cloudflareACLCoherenceWarnings: cloudflareAcl.aclCoherenceWarnings || [],
    cloudflareACLOperatorCoherenceHints: cloudflareAcl.aclOperatorCoherenceHints || [],
    cloudflareACLSystemCoherenceHints: cloudflareAcl.aclSystemCoherenceHints || [],
    cloudflareACLReasons: cloudflareAcl.aclReasons || [],
    advisoryOnly: true,
  };
}

export const CLOUDFLARE_FEDERATION_ROUTES = [
  {
    domain: "automation",
    route: "/api/os/cloudflare/automation",
    purpose: "Advisory automation loops for logs, metrics, build, bindings, OAuth, and latency signals.",
    layer: "automation",
  },
  {
    domain: "autonomous",
    route: "/api/os/cloudflare/autonomous",
    purpose: "Governance, safety, and event-hook snapshot from autonomous Cloudflare signal inputs.",
    layer: "autonomous",
  },
  {
    domain: "decision",
    route: "/api/os/cloudflare/decision",
    purpose: "Proceed / caution / hold advisory from federation, insights, and autonomous signals.",
    layer: "decision",
  },
  {
    domain: "certification",
    route: "/api/os/cloudflare/certification",
    aliasOf: "/api/marketplace/certification",
    purpose: "Marketplace module Cloudflare certification scores and compatibility advisories.",
    layer: "certification",
  },
  {
    domain: "sync",
    route: "/api/os/cloudflare/sync",
    purpose: "Cross-division sync comparison between operator-shell and marketplace-backend.",
    layer: "sync",
  },
  {
    domain: "cross-division",
    route: "/api/os/cloudflare/cross-division",
    purpose: "Prefixed cross-division federation view with routes and division snapshots.",
    layer: "sync",
  },
  {
    domain: "orchestration",
    route: "/api/os/cloudflare/orchestration",
    purpose: "Multi-agent orchestration plan and recommended actions across divisions.",
    layer: "orchestration",
  },
  {
    domain: "execution",
    route: "/api/os/cloudflare/execution",
    purpose: "Execution plan and next actions derived from orchestration and sync signals.",
    layer: "execution",
  },
  {
    domain: "adaptive",
    route: "/api/os/cloudflare/adaptive",
    purpose: "Adaptive runtime mode, UI hints, and operator guidance from federation signals.",
    layer: "adaptive",
  },
  {
    domain: "predictive",
    route: "/api/os/cloudflare/predictive",
    purpose: "Predictive forecasts for drift, module risk, and pipeline advisories.",
    layer: "predictive",
  },
  {
    domain: "strategic",
    route: "/api/os/cloudflare/strategic",
    purpose: "Medium-horizon strategic plans, themes, and recommended campaigns.",
    layer: "strategic",
  },
  {
    domain: "ucip",
    route: "/api/os/cloudflare/ucip",
    purpose: "Unified Cloudflare Intelligence Plane synthesizing all federation layers into one advisory signal.",
    layer: "ucip",
  },
  {
    domain: "amg",
    route: "/api/os/cloudflare/amg",
    purpose: "Autonomous Meta-Governance: advisory rules, nudges, and policy hints derived from UCIP.",
    layer: "amg",
  },
  {
    domain: "cba",
    route: "/api/os/cloudflare/cba",
    purpose: "Behavioral Autonomy: advisory behavior patterns and drift warnings from AMG + UCIP.",
    layer: "cba",
  },
  {
    domain: "cal",
    route: "/api/os/cloudflare/cal",
    purpose: "Cognitive Alignment Layer: unified alignment signal from CBA + AMG + UCIP.",
    layer: "cal",
  },
  {
    domain: "ihl",
    route: "/api/os/cloudflare/ihl",
    purpose: "Intent Harmonization Layer: unified intent signal from CAL + CBA + AMG + UCIP.",
    layer: "ihl",
  },
  {
    domain: "iarl",
    route: "/api/os/cloudflare/iarl",
    purpose: "Intent-to-Action Resonance Layer: evaluates intent vs action resonance from IHL + CAL + CBA + AMG + UCIP.",
    layer: "iarl",
  },
  {
    domain: "acl",
    route: "/api/os/cloudflare/acl",
    purpose: "Autonomous Coherence Layer: OS-wide coherence signal from IARL + IHL + CAL + CBA + AMG + UCIP.",
    layer: "acl",
  },
];

const AUTOMATION_LOOP_IDS = ["logs", "metrics", "build", "bindings", "oauth", "latency"];

const DOMAIN_DEFAULT_SCORES = {
  automation: 50,
  autonomous: 50,
  decision: 50,
  certification: 50,
  sync: 50,
  "cross-division": 50,
  orchestration: 50,
  execution: 50,
  adaptive: 35,
  predictive: 30,
  strategic: 25,
  ucip: 20,
  amg: 15,
  cba: 10,
  cal: 5,
  ihl: 3,
  iarl: 2,
  acl: 1,
  version: 50,
  "meta-stack": 1,
  insights: 0,
  events: 50,
};

/** In-memory advisory cache (per isolate). TTL 2–5s depending on domain. */
const ADVISORY_MEMORY_CACHE = new Map();

export const META_ADVISORY_DOMAINS = new Set([
  "ucip",
  "amg",
  "cba",
  "cal",
  "ihl",
  "iarl",
  "acl",
  "version",
  "meta-stack",
]);

export const ADVISORY_TIMEOUT_MS = 60;
export const ADVISORY_HEAVY_TIMEOUT_MS = 75;
export const ADVISORY_VERSION_TIMEOUT_MS = 200;
export const ADVISORY_CACHE_TTL_MS = 3000;
export const ADVISORY_VERSION_CACHE_TTL_MS = 5000;
export const ADVISORY_STALE_CACHE_MS = 30000;

function advisoryCacheKey(domain, suffix = "") {
  return suffix ? `${domain}:${suffix}` : domain;
}

function readAdvisoryMemoryCache(domain, suffix = "", { allowStale = false } = {}) {
  const entry = ADVISORY_MEMORY_CACHE.get(advisoryCacheKey(domain, suffix));
  if (!entry) {
    return null;
  }
  const age = Date.now() - entry.storedAt;
  if (!allowStale && Date.now() > entry.expiresAt) {
    return null;
  }
  if (allowStale && age > ADVISORY_STALE_CACHE_MS) {
    ADVISORY_MEMORY_CACHE.delete(advisoryCacheKey(domain, suffix));
    return null;
  }
  return entry.payload;
}

function writeAdvisoryMemoryCache(domain, payload, suffix = "", ttlMs = ADVISORY_CACHE_TTL_MS) {
  ADVISORY_MEMORY_CACHE.set(advisoryCacheKey(domain, suffix), {
    payload,
    expiresAt: Date.now() + ttlMs,
    storedAt: Date.now(),
  });
}

function createAdvisoryTimeoutError(domain) {
  const error = new Error(`Cloudflare advisory timeout for ${domain}`);
  error.name = "AdvisoryTimeoutError";
  return error;
}

export async function withAdvisoryTimeout(handler, domain, timeoutMs = ADVISORY_TIMEOUT_MS) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(createAdvisoryTimeoutError(domain)), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(handler), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export function isCloudflareAdvisoryDegraded(payload = {}) {
  return Boolean(
    payload.advisoryDegraded ||
      payload.degraded ||
      payload.federationMeta?.stale ||
      payload.federationMeta?.failureKind,
  );
}

export function classifyCloudflareFailure(error) {
  const message = String(error?.message || error || "Unknown error");
  if (/AdvisoryTimeout|advisory timeout/i.test(message)) {
    return "timeout";
  }
  if (/oauth|401|403|requires.?oauth/i.test(message)) {
    return "requires_oauth";
  }
  if (/mcp|offline|probe timeout|initialize failed|no content from/i.test(message)) {
    return "mcp_offline";
  }
  if (/upstream|engine|fetch|timeout|unreachable|ECONNREFUSED|1102|503/i.test(message)) {
    return "upstream_unreachable";
  }
  return "degraded";
}

export function buildDegradedReason(error, domain) {
  const kind = classifyCloudflareFailure(error);
  const message = String(error?.message || error || `${domain} unavailable.`);
  switch (kind) {
    case "requires_oauth":
      return "Cloudflare MCP OAuth required; federation remains advisory-only.";
    case "mcp_offline":
      return "Cloudflare MCP offline; using minimal advisory payload.";
    case "upstream_unreachable":
      return "Upstream engine unreachable; federation signals degraded.";
    case "timeout":
      return "Advisory layer timed out; serving cached or minimal fallback.";
    default:
      return message;
  }
}

function idleAutomationLoops(checkedAt, reason) {
  const loops = {};
  for (const id of AUTOMATION_LOOP_IDS) {
    loops[id] = {
      active: false,
      lastSignal: "unavailable",
      recommendedAction: reason,
      lastRun: checkedAt,
    };
  }
  return loops;
}

export function buildCloudflareAdvisoryFallback(domain, error, overrides = {}) {
  const checkedAt = new Date().toISOString();
  const reason = buildDegradedReason(error, domain);
  const reasons = [reason];
  const score = DOMAIN_DEFAULT_SCORES[domain] ?? 50;
  const health = domain === "adaptive" || domain === "predictive" || domain === "strategic" ? "degraded" : "advisory";
  const base = {
    advisoryOnly: true,
    advisoryDegraded: true,
    checkedAt,
    degraded: true,
    federationMeta: {
      domain,
      health,
      score,
      reasons,
      failureKind: classifyCloudflareFailure(error),
    },
    ...(error?.message ? { error: error.message } : {}),
  };

  switch (domain) {
    case "sync":
      return {
        ...base,
        operatorShell: {},
        marketplaceBackend: {},
        syncStatus: "partial",
        crossDivisionScore: score,
        crossDivisionHealth: health,
        crossDivisionReasons: reasons,
        ...overrides,
      };
    case "cross-division":
      return {
        ...base,
        cloudflareCrossDivisionScore: score,
        cloudflareCrossDivisionHealth: health,
        cloudflareCrossDivisionReasons: reasons,
        syncStatus: "partial",
        operatorShell: {},
        marketplaceBackend: {},
        routes: {},
        sources: {},
        ...overrides,
      };
    case "automation":
      return {
        ...base,
        loops: idleAutomationLoops(checkedAt, reason),
        activeCount: 0,
        health,
        score,
        reasons,
        mode: "idle",
        ...overrides,
      };
    case "autonomous":
      return {
        ...base,
        cloudflareGovernance: {
          health: "degraded",
          autonomousSignals: { triggers: [], advisories: [], signals: {} },
        },
        cloudflareSafety: {
          autonomousScore: score,
          latencyRisk: "unknown",
          oauthRisk: "unknown",
          autonomousWarnings: reasons,
        },
        cloudflareEvents: [],
        eventHooks: { simulated: true, cloudflareEvents: [] },
        ...overrides,
      };
    case "decision":
      return {
        ...base,
        decision: "caution",
        score,
        reasons,
        riskBadges: { latency: "unknown", oauth: "unknown" },
        summary: { triggerCount: 0 },
        route: "/api/os/cloudflare/decision",
        ...overrides,
      };
    case "certification":
      return {
        ...base,
        certifications: {},
        modules: [],
        aggregate: {
          status: "review",
          score,
          reasons,
          advisoryOnly: true,
        },
        ...overrides,
      };
    case "orchestration":
      return {
        ...base,
        plan: [],
        agents: {},
        recommendedActions: reasons,
        orchestrationScore: score,
        orchestrationHealth: health,
        orchestrationReasons: reasons,
        syncStatus: "partial",
        ...overrides,
      };
    case "execution":
      return {
        ...base,
        executionPlan: [],
        nextActions: reasons,
        executionScore: score,
        executionHealth: health,
        executionReasons: reasons,
        syncStatus: "partial",
        ...overrides,
      };
    case "execution-signals":
      return {
        ...base,
        cloudflareExecutionSignals: {
          operatorShell: { executionReadiness: "review", advisoryOnly: true },
          marketplaceBackend: { executionReadiness: "review", advisoryOnly: true },
          crossDivision: { syncStatus: "partial", executionReadiness: "review", advisoryOnly: true },
        },
        ...overrides,
      };
    case "agents":
      return {
        ...base,
        cloudflareAgentSignals: {
          operatorShell: { health: "optional", advisoryOnly: true },
          marketplaceBackend: { health: "optional", advisoryOnly: true },
          crossDivision: { syncStatus: "partial", advisoryOnly: true },
        },
        ...overrides,
      };
    case "adaptive":
      return {
        ...base,
        adaptiveState: { mode: "degraded", reasons, score },
        uiHints: [{ surface: "operator", hint: reason, priority: "high" }],
        operatorGuidance: ["Federation remains optional; complete OAuth when ready."],
        adaptiveScore: score,
        adaptiveHealth: health,
        ...overrides,
      };
    case "predictive":
      return {
        ...base,
        predictiveState: {
          forecastMode: "fallback",
          forecastScore: score,
          forecastReasons: reasons,
        },
        predictions: [],
        recommendedPreemptiveActions: ["Federation remains optional; complete OAuth when ready."],
        predictiveScore: score,
        predictiveHealth: health,
        ...overrides,
      };
    case "strategic":
      return {
        ...base,
        strategicState: {
          horizon: "short",
          planScore: score,
          planReasons: reasons,
          stripMode: "prioritize",
        },
        strategicPlan: [
          {
            action: "Use short-horizon advisory plan until Cloudflare signals recover.",
            horizon: "short",
            theme: "risk_reduction",
            priority: "high",
          },
        ],
        strategicThemes: ["risk_reduction"],
        recommendedCampaigns: ["Signal Recovery Check"],
        strategicScore: score,
        strategicHealth: health,
        ...overrides,
      };
    case "ucip":
      return {
        ...base,
        ucipState: {
          mode: "red",
          score,
          health: "degraded",
          horizon: "short",
          stripMode: "prioritize",
        },
        ucipReasons: reasons,
        ucipSignals: {},
        ucipRecommendedActions: ["Use minimal advisory payload until Cloudflare signals recover."],
        ucipCampaigns: ["Signal Recovery Check"],
        ucipHealth: "degraded",
        ucipScore: score,
        mode: "red",
        ...overrides,
      };
    case "amg":
      return {
        ...base,
        amgState: {
          mode: "govern_red",
          score,
          health: "degraded",
        },
        amgRules: [
          {
            id: "amg-fallback",
            rule: "UCIP degraded: use minimal AMG governance fallback until signals recover.",
            surface: "os",
            priority: "critical",
          },
        ],
        amgOperatorNudges: [
          { surface: "operator", nudge: "Restore Cloudflare MCP OAuth or upstream UCIP signals.", priority: "critical" },
        ],
        amgPolicyHints: [
          { surface: "os", hint: "AMG fallback active; federation guidance is advisory-only." },
        ],
        amgReasons: reasons,
        amgHealth: "degraded",
        amgScore: score,
        mode: "govern_red",
        ...overrides,
      };
    case "cba":
      return {
        ...base,
        cbaState: {
          mode: "behavior_red",
          score,
          health: "degraded",
        },
        cbaBehaviorPatterns: [
          { id: "cba-fallback", pattern: "AMG/UCIP degraded: minimal behavioral advisory payload.", surface: "os" },
        ],
        cbaBehaviorDriftWarnings: ["Upstream AMG or UCIP degraded; behavioral drift cannot be fully assessed."],
        cbaOperatorBehaviorHints: ["Restore UCIP/AMG signals before relying on behavioral guidance."],
        cbaSystemBehaviorHints: ["CBA fallback active; advisory-only behavioral hints."],
        cbaReasons: reasons,
        cbaHealth: "degraded",
        cbaScore: score,
        mode: "behavior_red",
        ...overrides,
      };
    case "cal":
      return {
        ...base,
        calState: {
          mode: "align_red",
          score,
          health: "degraded",
        },
        calAlignmentFindings: [
          {
            id: "cal-fallback",
            finding: "CBA/AMG/UCIP degraded: minimal cognitive alignment advisory payload.",
            surface: "os",
            aligned: false,
          },
        ],
        calAlignmentWarnings: ["Upstream CBA, AMG, or UCIP degraded; cognitive alignment cannot be fully assessed."],
        calOperatorAlignmentHints: ["Restore UCIP/AMG/CBA signals before relying on alignment guidance."],
        calSystemAlignmentHints: ["CAL fallback active; advisory-only alignment hints."],
        calReasons: reasons,
        calHealth: "degraded",
        calScore: score,
        mode: "align_red",
        ...overrides,
      };
    case "ihl":
      return {
        ...base,
        ihlState: {
          mode: "intent_red",
          score,
          health: "degraded",
        },
        ihlIntentFindings: [
          {
            id: "ihl-fallback",
            finding: "CAL/CBA/AMG/UCIP degraded: minimal intent harmonization advisory payload.",
            surface: "os",
            harmonized: false,
          },
        ],
        ihlIntentWarnings: ["Upstream CAL, CBA, AMG, or UCIP degraded; intent harmonization cannot be fully assessed."],
        ihlOperatorIntentHints: ["Restore UCIP/AMG/CBA/CAL signals before relying on intent guidance."],
        ihlSystemIntentHints: ["IHL fallback active; advisory-only intent hints."],
        ihlReasons: reasons,
        ihlHealth: "degraded",
        ihlScore: score,
        mode: "intent_red",
        ...overrides,
      };
    case "iarl":
      return {
        ...base,
        iarlState: {
          mode: "resonance_red",
          score,
          health: "degraded",
        },
        iarlResonanceFindings: [
          {
            id: "iarl-fallback",
            finding: "IHL/CAL/CBA/AMG/UCIP degraded: minimal intent-to-action resonance advisory payload.",
            surface: "os",
            resonant: false,
          },
        ],
        iarlResonanceWarnings: ["Upstream IHL, CAL, CBA, AMG, or UCIP degraded; resonance cannot be fully assessed."],
        iarlOperatorResonanceHints: ["Restore UCIP/AMG/CBA/CAL/IHL signals before relying on resonance guidance."],
        iarlSystemResonanceHints: ["IARL fallback active; advisory-only resonance hints."],
        iarlReasons: reasons,
        iarlHealth: "degraded",
        iarlScore: score,
        mode: "resonance_red",
        ...overrides,
      };
    case "acl":
      return {
        ...base,
        aclState: {
          mode: "coherence_red",
          score,
          health: "degraded",
        },
        aclCoherenceFindings: [
          {
            id: "acl-fallback",
            finding: "IARL/IHL/CAL/CBA/AMG/UCIP degraded: minimal autonomous coherence advisory payload.",
            surface: "os",
            coherent: false,
          },
        ],
        aclCoherenceWarnings: ["Upstream IARL, IHL, CAL, CBA, AMG, or UCIP degraded; coherence cannot be fully assessed."],
        aclOperatorCoherenceHints: ["Restore UCIP/AMG/CBA/CAL/IHL/IARL signals before relying on coherence guidance."],
        aclSystemCoherenceHints: ["ACL fallback active; advisory-only coherence hints."],
        aclReasons: reasons,
        aclHealth: "degraded",
        aclScore: score,
        mode: "coherence_red",
        ...overrides,
      };
    case "insights":
      return {
        ...base,
        cloudflareInsights: { recommendations: [] },
        cloudflareInsightsScore: score,
        health,
        ...overrides,
      };
    case "events":
      return {
        ...base,
        simulated: true,
        cloudflareEvents: [],
        ...overrides,
      };
    case "version":
      return buildCloudflareVersionHealthFallback(error, { ...base, ...overrides });
    case "meta-stack":
      return {
        ...base,
        cloudflareAmg: buildCloudflareAdvisoryFallback("amg", error),
        cloudflareCba: buildCloudflareAdvisoryFallback("cba", error),
        cloudflareCal: buildCloudflareAdvisoryFallback("cal", error),
        cloudflareIhl: buildCloudflareAdvisoryFallback("ihl", error),
        cloudflareIarl: buildCloudflareAdvisoryFallback("iarl", error),
        cloudflareAcl: buildCloudflareAdvisoryFallback("acl", error),
        ...overrides,
      };
    default:
      return { ...base, reasons, ...overrides };
  }
}

export function buildCloudflareVersionHealthFallback(error, overrides = {}) {
  const score = DOMAIN_DEFAULT_SCORES.version;
  const reason = buildDegradedReason(error, "version");
  return {
    advisoryOnly: true,
    advisoryDegraded: true,
    degraded: true,
    health: "degraded",
    reasons: [reason],
    checkedAt: new Date().toISOString(),
    cloudflareFederationHealth: "degraded",
    cloudflareAutonomousHealth: "optional",
    cloudflareInsightsHealth: "optional",
    cloudflareDecisionHealth: "advisory",
    cloudflareAutomationHealth: "optional",
    cloudflareCertificationHealth: "optional",
    cloudflareCrossDivisionHealth: "optional",
    cloudflareOrchestrationHealth: "optional",
    cloudflareExecutionHealth: "optional",
    cloudflareAdaptiveHealth: "degraded",
    cloudflareAdaptiveMode: "degraded",
    cloudflarePredictiveHealth: "degraded",
    cloudflarePredictiveMode: "fallback",
    cloudflareStrategicHealth: "degraded",
    cloudflareStrategicHorizon: "short",
    cloudflareUCIPHealth: "degraded",
    cloudflareUCIPScore: DOMAIN_DEFAULT_SCORES.ucip,
    cloudflareUCIPMode: "red",
    cloudflareAMGHealth: "degraded",
    cloudflareAMGScore: DOMAIN_DEFAULT_SCORES.amg,
    cloudflareAMGMode: "govern_red",
    cloudflareCBAHealth: "degraded",
    cloudflareCBAScore: DOMAIN_DEFAULT_SCORES.cba,
    cloudflareCBAMode: "behavior_red",
    cloudflareCALHealth: "degraded",
    cloudflareCALScore: DOMAIN_DEFAULT_SCORES.cal,
    cloudflareCALMode: "align_red",
    cloudflareIHLHealth: "degraded",
    cloudflareIHLScore: DOMAIN_DEFAULT_SCORES.ihl,
    cloudflareIHLMode: "intent_red",
    cloudflareIARLHealth: "degraded",
    cloudflareIARLScore: DOMAIN_DEFAULT_SCORES.iarl,
    cloudflareIARLMode: "resonance_red",
    cloudflareACLHealth: "degraded",
    cloudflareACLScore: DOMAIN_DEFAULT_SCORES.acl,
    cloudflareACLMode: "coherence_red",
    cloudflareAutonomousScore: score,
    cloudflareInsightsScore: score,
    cloudflareDecisionScore: score,
    cloudflareCertificationScore: score,
    cloudflareCrossDivisionScore: score,
    cloudflareOrchestrationScore: score,
    cloudflareExecutionScore: score,
    cloudflareAdaptiveScore: DOMAIN_DEFAULT_SCORES.adaptive,
    cloudflarePredictiveScore: DOMAIN_DEFAULT_SCORES.predictive,
    cloudflareStrategicScore: DOMAIN_DEFAULT_SCORES.strategic,
    federationMeta: {
      domain: "version",
      health: "degraded",
      score,
      reasons: [reason],
      failureKind: classifyCloudflareFailure(error),
    },
    ...overrides,
  };
}

export function flattenCloudflareVersionHealthResponse(health = {}) {
  return {
    cloudflareMcpHealth: health,
    cloudflareFederationHealth: health.cloudflareFederationHealth ?? health.health ?? "optional",
    cloudflareAutonomousHealth: health.cloudflareAutonomousHealth ?? "optional",
    cloudflareInsightsHealth: health.cloudflareInsightsHealth ?? "optional",
    cloudflareAutonomousScore: health.cloudflareAutonomousScore ?? null,
    cloudflareInsightsScore: health.cloudflareInsightsScore ?? null,
    cloudflareDecisionHealth: health.cloudflareDecisionHealth ?? "optional",
    cloudflareDecisionScore: health.cloudflareDecisionScore ?? null,
    cloudflareAutomationHealth: health.cloudflareAutomationHealth ?? "optional",
    cloudflareCertificationHealth: health.cloudflareCertificationHealth ?? "optional",
    cloudflareCertificationScore: health.cloudflareCertificationScore ?? null,
    cloudflareCrossDivisionHealth: health.cloudflareCrossDivisionHealth ?? "optional",
    cloudflareCrossDivisionScore: health.cloudflareCrossDivisionScore ?? null,
    cloudflareOrchestrationHealth: health.cloudflareOrchestrationHealth ?? "optional",
    cloudflareOrchestrationScore: health.cloudflareOrchestrationScore ?? null,
    cloudflareExecutionHealth: health.cloudflareExecutionHealth ?? "optional",
    cloudflareExecutionScore: health.cloudflareExecutionScore ?? null,
    cloudflareAdaptiveHealth: health.cloudflareAdaptiveHealth ?? "optional",
    cloudflareAdaptiveScore: health.cloudflareAdaptiveScore ?? null,
    cloudflareAdaptiveMode: health.cloudflareAdaptiveMode ?? null,
    cloudflarePredictiveHealth: health.cloudflarePredictiveHealth ?? "optional",
    cloudflarePredictiveScore: health.cloudflarePredictiveScore ?? null,
    cloudflarePredictiveMode: health.cloudflarePredictiveMode ?? null,
    cloudflareStrategicHealth: health.cloudflareStrategicHealth ?? "optional",
    cloudflareStrategicScore: health.cloudflareStrategicScore ?? null,
    cloudflareStrategicHorizon: health.cloudflareStrategicHorizon ?? null,
    cloudflareUCIPHealth: health.cloudflareUCIPHealth ?? "optional",
    cloudflareUCIPScore: health.cloudflareUCIPScore ?? null,
    cloudflareUCIPMode: health.cloudflareUCIPMode ?? null,
    cloudflareAMGHealth: health.cloudflareAMGHealth ?? "optional",
    cloudflareAMGScore: health.cloudflareAMGScore ?? null,
    cloudflareAMGMode: health.cloudflareAMGMode ?? null,
    cloudflareCBAHealth: health.cloudflareCBAHealth ?? "optional",
    cloudflareCBAScore: health.cloudflareCBAScore ?? null,
    cloudflareCBAMode: health.cloudflareCBAMode ?? null,
    cloudflareCALHealth: health.cloudflareCALHealth ?? "optional",
    cloudflareCALScore: health.cloudflareCALScore ?? null,
    cloudflareCALMode: health.cloudflareCALMode ?? null,
    cloudflareIHLHealth: health.cloudflareIHLHealth ?? "optional",
    cloudflareIHLScore: health.cloudflareIHLScore ?? null,
    cloudflareIHLMode: health.cloudflareIHLMode ?? null,
    cloudflareIARLHealth: health.cloudflareIARLHealth ?? "optional",
    cloudflareIARLScore: health.cloudflareIARLScore ?? null,
    cloudflareIARLMode: health.cloudflareIARLMode ?? null,
    cloudflareACLHealth: health.cloudflareACLHealth ?? "optional",
    cloudflareACLScore: health.cloudflareACLScore ?? null,
    cloudflareACLMode: health.cloudflareACLMode ?? null,
    cloudflareAdvisoryDegraded: isCloudflareAdvisoryDegraded(health),
    advisoryOnly: true,
  };
}

function inferHealth(payload, domain) {
  const meta = payload.federationMeta;
  if (meta?.health) {
    return meta.health;
  }
  const direct =
    payload.health ||
    payload.adaptiveHealth ||
    payload.predictiveHealth ||
    payload.strategicHealth ||
    payload.orchestrationHealth ||
    payload.executionHealth ||
    payload.crossDivisionHealth ||
    payload.cloudflareCrossDivisionHealth ||
    payload.aggregate?.status;
  if (direct) {
    if (direct === "review" || direct === "partial") {
      return "advisory";
    }
    if (CLOUDFLARE_HEALTH_VALUES.includes(direct)) {
      return direct;
    }
    return "advisory";
  }
  if (domain === "decision") {
    if (payload.decision === "proceed") {
      return "healthy";
    }
    if (payload.decision === "hold") {
      return "degraded";
    }
    return "advisory";
  }
  return "optional";
}

function inferScore(payload) {
  if (payload.federationMeta?.score != null) {
    return payload.federationMeta.score;
  }
  return (
    payload.score ??
    payload.adaptiveScore ??
    payload.predictiveScore ??
    payload.strategicScore ??
    payload.orchestrationScore ??
    payload.executionScore ??
    payload.crossDivisionScore ??
    payload.cloudflareCrossDivisionScore ??
    payload.adaptiveState?.score ??
    payload.predictiveState?.forecastScore ??
    payload.strategicState?.planScore ??
    payload.aggregate?.score ??
    null
  );
}

function inferReasons(payload) {
  if (Array.isArray(payload.federationMeta?.reasons) && payload.federationMeta.reasons.length) {
    return payload.federationMeta.reasons;
  }
  if (Array.isArray(payload.reasons) && payload.reasons.length) {
    return payload.reasons;
  }
  const nested =
    payload.crossDivisionReasons ||
    payload.cloudflareCrossDivisionReasons ||
    payload.orchestrationReasons ||
    payload.executionReasons ||
    payload.adaptiveState?.reasons ||
    payload.predictiveState?.forecastReasons ||
    payload.strategicState?.planReasons ||
    payload.aggregate?.reasons;
  return Array.isArray(nested) ? nested : [];
}

export function ensureCloudflareAdvisoryEnvelope(payload = {}, domain = "unknown") {
  const normalized = extractDomainNormalizedFields(payload, domain);
  const health = normalized.health;
  const score = normalized.score;
  const reasons = normalized.reasons;
  const mode = normalized.mode;
  const routeEntry = CLOUDFLARE_FEDERATION_ROUTES.find((entry) => entry.domain === domain);

  return {
    ...payload,
    health,
    score,
    mode,
    reasons,
    advisoryOnly: payload.advisoryOnly !== false,
    checkedAt: payload.checkedAt || new Date().toISOString(),
    federationMeta: {
      domain,
      route: routeEntry?.route || null,
      purpose: routeEntry?.purpose || null,
      layer: routeEntry?.layer || domain,
      health,
      score,
      mode,
      reasons,
      ...(payload.federationMeta || {}),
    },
  };
}

export function buildAdvisoryHeartbeatFallback(error = null) {
  const reason = error ? buildDegradedReason(error, "heartbeat") : "Advisory heartbeat unavailable.";
  return {
    cloudflareFederationHealth: "degraded",
    cloudflareFederationScore: DOMAIN_DEFAULT_SCORES.version,
    cloudflareUCIPHealth: "degraded",
    cloudflareUCIPMode: "red",
    cloudflareAMGHealth: "degraded",
    cloudflareAMGMode: "govern_red",
    cloudflareCBAHealth: "degraded",
    cloudflareCBAMode: "behavior_red",
    cloudflareCALHealth: "degraded",
    cloudflareCALMode: "align_red",
    cloudflareIHLHealth: "degraded",
    cloudflareIHLMode: "intent_red",
    cloudflareIARLHealth: "degraded",
    cloudflareIARLMode: "resonance_red",
    cloudflareACLHealth: "degraded",
    cloudflareACLMode: "coherence_red",
    cloudflareAutonomousHealth: "optional",
    cloudflareInsightsHealth: "optional",
    cloudflareDecisionHealth: "advisory",
    cloudflareAutomationHealth: "optional",
    cloudflareCertificationHealth: "optional",
    cloudflareCrossDivisionHealth: "degraded",
    cloudflareCrossDivisionSyncStatus: "partial",
    cloudflareOrchestrationHealth: "optional",
    cloudflareExecutionHealth: "optional",
    cloudflareAdaptiveHealth: "degraded",
    cloudflareAdaptiveMode: "degraded",
    cloudflarePredictiveHealth: "degraded",
    cloudflarePredictiveMode: "fallback",
    cloudflareStrategicHealth: "degraded",
    cloudflareStrategicStripMode: "watch",
    cloudflareAdvisoryDegraded: true,
    cloudflareAdvisoryDegradedReason: reason,
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function resolveCloudflareAdvisoryCall(handler, domain, options = {}) {
  const {
    timeoutMs =
      domain === "version"
        ? ADVISORY_VERSION_TIMEOUT_MS
        : META_ADVISORY_DOMAINS.has(domain)
          ? ADVISORY_HEAVY_TIMEOUT_MS
          : ADVISORY_TIMEOUT_MS,
    cacheTtlMs = domain === "version" ? ADVISORY_VERSION_CACHE_TTL_MS : ADVISORY_CACHE_TTL_MS,
    cacheKeySuffix = "",
    useCache = true,
  } = options;

  if (useCache) {
    const cached = readAdvisoryMemoryCache(domain, cacheKeySuffix);
    if (cached) {
      return {
        ...cached,
        federationMeta: {
          ...(cached.federationMeta || {}),
          cacheHit: true,
        },
      };
    }
  }

  try {
    const raw = await withAdvisoryTimeout(handler, domain, timeoutMs);
    const payload = ensureCloudflareAdvisoryEnvelope(raw, domain);
    if (useCache) {
      writeAdvisoryMemoryCache(domain, payload, cacheKeySuffix, cacheTtlMs);
    }
    return payload;
  } catch (error) {
    const stale = useCache ? readAdvisoryMemoryCache(domain, cacheKeySuffix, { allowStale: true }) : null;
    if (stale) {
      return {
        ...stale,
        advisoryDegraded: true,
        degraded: true,
        federationMeta: {
          ...(stale.federationMeta || {}),
          cacheHit: true,
          stale: true,
          failureKind: classifyCloudflareFailure(error),
          reasons: [
            buildDegradedReason(error, domain),
            ...(stale.federationMeta?.reasons || []).slice(0, 1),
          ],
        },
      };
    }
    return buildCloudflareAdvisoryFallback(domain, error);
  }
}

export async function resolveCloudflareFederationRoute(handler, domain, options = {}) {
  return resolveCloudflareAdvisoryCall(handler, domain, options);
}

export function getCloudflareFederationRouteCatalog() {
  return {
    routes: CLOUDFLARE_FEDERATION_ROUTES.map((entry) => ({
      ...entry,
      advisoryOnly: true,
    })),
    normalizedFields: {
      health: CLOUDFLARE_HEALTH_VALUES,
      score: "0-100",
      mode: "domain-specific status (decision, adaptive mode, forecast, strip, sync)",
      reasons: "string[]",
      topLevel: CLOUDFLARE_NORMALIZED_FIELDS,
      federationMeta: "{ domain, route, purpose, layer, health, score, mode, reasons }",
    },
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export function getCloudflareFederationDocumentation(format = "json") {
  const layers = [
    { name: "Automation", route: "/api/os/cloudflare/automation", summary: "Loop advisories for observability and binding signals." },
    { name: "Autonomous", route: "/api/os/cloudflare/autonomous", summary: "Governance and safety triggers from federation probes." },
    { name: "Decision", route: "/api/os/cloudflare/decision", summary: "PROCEED / CAUTION / HOLD operator guidance." },
    { name: "Certification", route: "/api/os/cloudflare/certification", summary: "Module compatibility and certification scores." },
    { name: "Sync / Cross-division", route: "/api/os/cloudflare/cross-division", summary: "Operator-shell vs marketplace-backend alignment." },
    { name: "Orchestration", route: "/api/os/cloudflare/orchestration", summary: "Multi-agent plan and recommended actions." },
    { name: "Execution", route: "/api/os/cloudflare/execution", summary: "Next execution steps from orchestration context." },
    { name: "Adaptive", route: "/api/os/cloudflare/adaptive", summary: "Runtime mode and UI hints (steady / caution / review / degraded)." },
    { name: "Predictive", route: "/api/os/cloudflare/predictive", summary: "Forecasts for drift, risk, and pipeline advisories." },
    { name: "Strategic", route: "/api/os/cloudflare/strategic", summary: "Medium-horizon plans, themes, and campaigns." },
    { name: "UCIP", route: "/api/os/cloudflare/ucip", summary: "Unified intelligence plane synthesizing all layers into one signal." },
    { name: "AMG", route: "/api/os/cloudflare/amg", summary: "Autonomous Meta-Governance: UCIP-derived rules, nudges, and policy hints." },
    { name: "CBA", route: "/api/os/cloudflare/cba", summary: "Behavioral Autonomy: advisory patterns and drift warnings from AMG + UCIP." },
    { name: "CAL", route: "/api/os/cloudflare/cal", summary: "Cognitive Alignment Layer: unified alignment signal from CBA + AMG + UCIP." },
    { name: "IHL", route: "/api/os/cloudflare/ihl", summary: "Intent Harmonization Layer: unified intent signal from CAL + CBA + AMG + UCIP." },
    { name: "IARL", route: "/api/os/cloudflare/iarl", summary: "Intent-to-Action Resonance Layer: intent vs action resonance from IHL + CAL + CBA + AMG + UCIP." },
    { name: "ACL", route: "/api/os/cloudflare/acl", summary: "Autonomous Coherence Layer: OS-wide coherence from IARL + IHL + CAL + CBA + AMG + UCIP." },
  ];

  const interpretation = {
    acl: {
      COHERENCE_GREEN: "Strong coherence across operator, mission, marketplace, and OS layers.",
      COHERENCE_YELLOW: "Partial coherence; mild fragmentation — review coherence hints.",
      COHERENCE_ORANGE: "Significant fragmentation or divergent meta-intelligence signals.",
      COHERENCE_RED: "Degraded upstream or severe fragmentation; minimal fallback.",
    },
    iarl: {
      RESONANCE_GREEN: "Strong resonance between operator/mission/OS intent and actual actions.",
      RESONANCE_YELLOW: "Partial resonance; mild intent-to-action mismatch — review resonance hints.",
      RESONANCE_ORANGE: "Significant mismatch or divergent action posture vs harmonized intent.",
      RESONANCE_RED: "Degraded upstream or severe intent-to-action mismatch; minimal fallback.",
    },
    ihl: {
      INTENT_GREEN: "Strong intent harmony across operator, mission, and OS layers.",
      INTENT_YELLOW: "Partial harmony; mild intent drift — review intent hints.",
      INTENT_ORANGE: "Significant intent conflict or divergent governance signals.",
      INTENT_RED: "Degraded upstream or severe intent misalignment; minimal fallback.",
    },
    cal: {
      ALIGN_GREEN: "Strong cognitive alignment with UCIP + AMG + CBA; mission and operator posture coherent.",
      ALIGN_YELLOW: "Partial alignment; mild cognitive drift — review alignment hints.",
      ALIGN_ORANGE: "Significant misalignment or conflicting governance/behavior signals.",
      ALIGN_RED: "Degraded upstream or severe cognitive misalignment; minimal fallback.",
    },
    cba: {
      BEHAVIOR_GREEN: "Stable behavior aligned with UCIP + AMG; no significant drift.",
      BEHAVIOR_YELLOW: "Mild drift or inconsistent operator/system behavior; review hints.",
      BEHAVIOR_ORANGE: "Significant drift or conflicting governance signals.",
      BEHAVIOR_RED: "Degraded upstream or severe behavioral drift; minimal fallback.",
    },
    amg: {
      GOVERN_GREEN: "Stable UCIP: low-risk governance environment; proceed with optional review.",
      GOVERN_YELLOW: "Caution UCIP: medium-risk; review rules and nudges before promotion.",
      GOVERN_ORANGE: "Alert UCIP: high-risk; defer promotion and follow AMG rules.",
      GOVERN_RED: "Degraded UCIP: fallback governance payload; restore signals.",
    },
    ucip: {
      GREEN: "Stable federation posture: proceed + steady + stable forecast.",
      YELLOW: "Caution/watch: review advisories; federation remains optional.",
      ORANGE: "Hold/alert/prioritize: defer promotion; focus strategic actions.",
      RED: "Degraded/fallback: minimal payload; restore OAuth or MCP signals.",
    },
    decision: {
      PROCEED: "Signals are healthy enough to continue normal operator workflows.",
      CAUTION: "Review advisories before promotion; federation does not block actions.",
      HOLD: "Defer promotion or autonomous actions until signals improve.",
    },
    strategicStrip: {
      STABLE: "No urgent strategic actions; maintain current federation posture.",
      WATCH: "Monitor trends; prepare optional hardening steps.",
      PRIORITIZE: "Focus on top strategic plan items in the next hours–days.",
    },
    health: {
      healthy: "Signals within normal advisory thresholds.",
      advisory: "Worth review; optional operator attention.",
      degraded: "Minimal fallback payload; complete OAuth or restore MCP/upstream.",
      optional: "Cloudflare federation not required for core OS operation.",
    },
  };

  const doc = {
    title: "Cloudflare Federation — Operator Guide",
    version: "3.5",
    advisoryOnly: true,
    layers,
    interpretation,
    routes: CLOUDFLARE_FEDERATION_ROUTES,
    surfaces: {
      mission: "UCIP + AMG + CBA + CAL + IHL + IARL + ACL strips; top actions, rules, drift, alignment, intent, resonance, and coherence hints.",
      os: "Heartbeat aggregates cloudflareUCIP*, cloudflareAMG*, cloudflareCBA*, cloudflareCAL*, cloudflareIHL*, cloudflareIARL*, and cloudflareACL* fields.",
      marketplace: "Module badges: UCIP_*, AMG_*, CBA_*, CAL_*, IHL_*, IARL_*, and ACL_ALIGNED / ACL_PARTIAL / ACL_FRAGMENTED.",
      operator: "UCIP + AMG + CBA + CAL + IHL + IARL + Cloudflare Autonomous Coherence Layer panels.",
    },
    checkedAt: new Date().toISOString(),
  };

  if (format === "html") {
    const layerRows = layers
      .map(
        (layer) =>
          `<tr><td>${layer.name}</td><td><code>${layer.route}</code></td><td>${layer.summary}</td></tr>`,
      )
      .join("");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloudflare Federation — MSHOPS v3.5</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    code { background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; vertical-align: top; }
    th { background: #fafafa; }
    .note { background: #fffbeb; border: 1px solid #fcd34d; padding: 1rem; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>Cloudflare Federation — Operator Guide</h1>
  <p class="note"><strong>Advisory only.</strong> Cloudflare federation never blocks core OS pipelines unless explicit governance rules enable blocking. All routes return <code>advisoryOnly: true</code>.</p>
  <h2>Layers (automation → strategic)</h2>
  <table><thead><tr><th>Layer</th><th>Route</th><th>Summary</th></tr></thead><tbody>${layerRows}</tbody></table>
  <h2>Reading Mission signals</h2>
  <ul>
    <li><strong>PROCEED</strong> — ${interpretation.decision.PROCEED}</li>
    <li><strong>CAUTION</strong> — ${interpretation.decision.CAUTION}</li>
    <li><strong>HOLD</strong> — ${interpretation.decision.HOLD}</li>
  </ul>
  <h2>Strategic strip</h2>
  <ul>
    <li><strong>STABLE</strong> — ${interpretation.strategicStrip.STABLE}</li>
    <li><strong>WATCH</strong> — ${interpretation.strategicStrip.WATCH}</li>
    <li><strong>PRIORITIZE</strong> — ${interpretation.strategicStrip.PRIORITIZE}</li>
  </ul>
  <h2>UCIP (Unified Cloudflare Intelligence Plane)</h2>
  <p>Single synthesized signal from all 11 federation layers. Route: <code>/api/os/cloudflare/ucip</code></p>
  <ul>
    <li><strong>GREEN</strong> — ${interpretation.ucip.GREEN}</li>
    <li><strong>YELLOW</strong> — ${interpretation.ucip.YELLOW}</li>
    <li><strong>ORANGE</strong> — ${interpretation.ucip.ORANGE}</li>
    <li><strong>RED</strong> — ${interpretation.ucip.RED}</li>
  </ul>
  <h2>AMG (Autonomous Meta-Governance)</h2>
  <p>UCIP-derived advisory governance rules, operator nudges, and OS policy hints. Route: <code>/api/os/cloudflare/amg</code></p>
  <ul>
    <li><strong>GOVERN_GREEN</strong> — ${interpretation.amg.GOVERN_GREEN}</li>
    <li><strong>GOVERN_YELLOW</strong> — ${interpretation.amg.GOVERN_YELLOW}</li>
    <li><strong>GOVERN_ORANGE</strong> — ${interpretation.amg.GOVERN_ORANGE}</li>
    <li><strong>GOVERN_RED</strong> — ${interpretation.amg.GOVERN_RED}</li>
  </ul>
  <h2>CBA (Behavioral Autonomy)</h2>
  <p>AMG + UCIP-derived advisory behavioral patterns and drift warnings. Route: <code>/api/os/cloudflare/cba</code></p>
  <ul>
    <li><strong>BEHAVIOR_GREEN</strong> — ${interpretation.cba.BEHAVIOR_GREEN}</li>
    <li><strong>BEHAVIOR_YELLOW</strong> — ${interpretation.cba.BEHAVIOR_YELLOW}</li>
    <li><strong>BEHAVIOR_ORANGE</strong> — ${interpretation.cba.BEHAVIOR_ORANGE}</li>
    <li><strong>BEHAVIOR_RED</strong> — ${interpretation.cba.BEHAVIOR_RED}</li>
  </ul>
  <h2>CAL (Cognitive Alignment Layer)</h2>
  <p>CBA + AMG + UCIP-derived unified cognitive alignment signal. Route: <code>/api/os/cloudflare/cal</code></p>
  <ul>
    <li><strong>ALIGN_GREEN</strong> — ${interpretation.cal.ALIGN_GREEN}</li>
    <li><strong>ALIGN_YELLOW</strong> — ${interpretation.cal.ALIGN_YELLOW}</li>
    <li><strong>ALIGN_ORANGE</strong> — ${interpretation.cal.ALIGN_ORANGE}</li>
    <li><strong>ALIGN_RED</strong> — ${interpretation.cal.ALIGN_RED}</li>
  </ul>
  <h2>IHL (Intent Harmonization Layer)</h2>
  <p>CAL + CBA + AMG + UCIP-derived unified intent harmonization signal. Route: <code>/api/os/cloudflare/ihl</code></p>
  <ul>
    <li><strong>INTENT_GREEN</strong> — ${interpretation.ihl.INTENT_GREEN}</li>
    <li><strong>INTENT_YELLOW</strong> — ${interpretation.ihl.INTENT_YELLOW}</li>
    <li><strong>INTENT_ORANGE</strong> — ${interpretation.ihl.INTENT_ORANGE}</li>
    <li><strong>INTENT_RED</strong> — ${interpretation.ihl.INTENT_RED}</li>
  </ul>
  <h2>IARL (Intent-to-Action Resonance Layer)</h2>
  <p>IHL + CAL + CBA + AMG + UCIP-derived intent-to-action resonance signal. Route: <code>/api/os/cloudflare/iarl</code></p>
  <ul>
    <li><strong>RESONANCE_GREEN</strong> — ${interpretation.iarl.RESONANCE_GREEN}</li>
    <li><strong>RESONANCE_YELLOW</strong> — ${interpretation.iarl.RESONANCE_YELLOW}</li>
    <li><strong>RESONANCE_ORANGE</strong> — ${interpretation.iarl.RESONANCE_ORANGE}</li>
    <li><strong>RESONANCE_RED</strong> — ${interpretation.iarl.RESONANCE_RED}</li>
  </ul>
  <h2>ACL (Autonomous Coherence Layer)</h2>
  <p>IARL + IHL + CAL + CBA + AMG + UCIP-derived OS-wide coherence signal. Route: <code>/api/os/cloudflare/acl</code></p>
  <ul>
    <li><strong>COHERENCE_GREEN</strong> — ${interpretation.acl.COHERENCE_GREEN}</li>
    <li><strong>COHERENCE_YELLOW</strong> — ${interpretation.acl.COHERENCE_YELLOW}</li>
    <li><strong>COHERENCE_ORANGE</strong> — ${interpretation.acl.COHERENCE_ORANGE}</li>
    <li><strong>COHERENCE_RED</strong> — ${interpretation.acl.COHERENCE_RED}</li>
  </ul>
  <h2>Health values</h2>
  <ul>
    <li><strong>healthy</strong> — ${interpretation.health.healthy}</li>
    <li><strong>advisory</strong> — ${interpretation.health.advisory}</li>
    <li><strong>degraded</strong> — ${interpretation.health.degraded}</li>
    <li><strong>optional</strong> — ${interpretation.health.optional}</li>
  </ul>
  <p><a href="/mission">Mission Control</a> · <a href="/operator">Operator</a> · <a href="/os">OS Dashboard</a> · <a href="/api/os/cloudflare/federation/routes">Route catalog (JSON)</a></p>
</body>
</html>`;
  }

  return doc;
}


export function buildVersionAdvisoryHealthFallback(error, overrides = {}) {
  return buildCloudflareVersionHealthFallback(error, overrides);
}

export async function runAdvisoryGuarded(handler, domain, options = {}) {
  return resolveCloudflareAdvisoryCall(handler, domain, options);
}
