const trafficAcquisitionMarketplaceModule = {
  module_id: "msh-traffic-acquisition-agent",
  service_slug: "traffic_acquisition_agent",
  slug: "traffic-acquisition-agent",
  name: "Traffic Acquisition Agent",
  title: "Traffic Acquisition Agent",
  category: "Growth",
  access_level: "public",
  metadata: { accessLevel: "public" },
  public_service_route: "/apps/traffic-acquisition",
  operator_route: "/operator/traffic-acquisition",
  description:
    "Autonomous inbound engine that grows the operator ecosystem through content, SEO, and membership funnel routing.",
  membership_value_statement:
    "Autonomous inbound engine that grows the operator ecosystem.",
  revenue_type: "growth",
  base_price: 0,
  recommended_upsell: "Operator-guided growth campaign",
  agent_config_key: "traffic",
  security_stage: "03:ANALYSIS_READY",
  required_inputs: ["target_audience", "growth_goal", "channels"],
  delivery_outputs: [
    "campaign_id",
    "content_artifacts",
    "distribution_plan",
    "seo_signals",
    "telemetry_summary",
  ],
  status: "active",
};

const allowedGrowthGoals = new Set([
  "membership_signups",
  "marketplace_visits",
  "module_discovery",
  "intake_conversions",
  "operator_onboarding",
  "not_sure",
]);

const allowedChannels = new Set([
  "marketplace",
  "services_catalog",
  "onboarding",
  "email_digest",
  "social_snippet",
  "not_sure",
]);

const trafficCampaigns = [];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeChannels(values) {
  const filtered = Array.isArray(values)
    ? values.map((value) => normalizeText(value)).filter((entry) => allowedChannels.has(entry))
    : [];
  if (!filtered.length) {
    return ["marketplace"];
  }
  if (filtered.includes("not_sure")) {
    return ["marketplace"];
  }
  return [...new Set(filtered)];
}

function generateCampaignId() {
  return `traffic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTrafficCampaignInput(payload = {}) {
  const growthGoal = normalizeText(payload.growth_goal);
  return {
    target_audience: normalizeText(payload.target_audience) || "operators and builders",
    growth_goal: allowedGrowthGoals.has(growthGoal) ? growthGoal : "marketplace_visits",
    channels: normalizeChannels(payload.channels),
    source_route: normalizeText(payload.source_route) || "/apps/traffic-acquisition",
  };
}

function computeTrafficAcquisitionResult(input, campaignId = generateCampaignId()) {
  const primaryKeyword =
    input.growth_goal === "membership_signups"
      ? "operator membership"
      : input.growth_goal === "intake_conversions"
        ? "AI security intake"
        : "marketplace modules";

  const contentArtifacts = [
    {
      type: "headline",
      channel: input.channels[0],
      body: `Grow ${input.target_audience} with guided marketplace discovery.`,
      seo_keywords: [primaryKeyword, "MSHOPS", "operator ecosystem"],
    },
    {
      type: "cta",
      channel: input.channels[0],
      body: "[ EXPLORE MEMBERSHIP ]",
      seo_keywords: [primaryKeyword, "membership"],
    },
  ];

  const distributionPlan = {
    channels: [...input.channels],
    cadence: "weekly",
    audience_segments: [input.target_audience],
    scheduled_pushes: [],
  };

  const seoSignals = {
    primary_keywords: [primaryKeyword, "marketplace visibility", "inbound traffic"],
    opportunity_score: 0.72,
    ranking_notes: "Bootstrap campaign — refine with seo_analyze feedback loop.",
  };

  return {
    schema: "traffic_acquisition_v1",
    status: "traffic-acquisition-complete",
    campaign_id: campaignId,
    timestamp_utc: new Date().toISOString(),
    target_audience: input.target_audience,
    growth_goal: input.growth_goal,
    content_artifacts: contentArtifacts,
    distribution_plan: distributionPlan,
    seo_signals: seoSignals,
    telemetry_events_emitted: 1,
    conversion_hooks: ["/register", "/enter", "/marketplace"],
    next_actions: [
      "Review content artifacts in operator cockpit",
      "Approve distribution_push schedule",
      "Monitor telemetry_write events",
    ],
    requires_human_review: false,
    telemetry_summary: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      notes: "Campaign registered; telemetry pending distribution.",
    },
  };
}

function recordTrafficCampaign(input, result) {
  const entry = {
    campaign_id: result.campaign_id,
    created_at: result.timestamp_utc,
    target_audience: input.target_audience,
    growth_goal: input.growth_goal,
    channels: [...input.channels],
    source_route: input.source_route,
    status: "queued",
    requires_human_review: result.requires_human_review,
    seo_opportunity_score: result.seo_signals.opportunity_score,
    content_artifact_count: result.content_artifacts.length,
    telemetry_events_emitted: result.telemetry_events_emitted,
  };
  trafficCampaigns.unshift(entry);
  return entry;
}

function listTrafficAcquisitionQueue() {
  return trafficCampaigns.map((entry) => ({ ...entry }));
}

function buildTrafficAcquisitionOperatorSummary() {
  const queued = trafficCampaigns.filter((entry) => entry.status === "queued").length;
  const active = trafficCampaigns.filter((entry) => entry.status === "active").length;
  return {
    queue_length: trafficCampaigns.length,
    queued,
    active,
    last_campaign: trafficCampaigns[0] || null,
    module: trafficAcquisitionMarketplaceModule,
  };
}

module.exports = {
  trafficAcquisitionMarketplaceModule,
  trafficCampaigns,
  normalizeTrafficCampaignInput,
  computeTrafficAcquisitionResult,
  recordTrafficCampaign,
  listTrafficAcquisitionQueue,
  buildTrafficAcquisitionOperatorSummary,
};
