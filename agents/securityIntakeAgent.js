const allowedUsage = new Set([
  "chatgpt",
  "microsoft_copilot",
  "gemini",
  "claude",
  "customer_chatbot",
  "internal_knowledge_assistant",
  "rag_system",
  "n8n_make_zapier",
  "local_models_ollama",
  "multimodal_ai",
  "no_ai_yet",
]);

const allowedRiskLevels = new Set([
  "handling_sensitive_data",
  "customer_facing_ai",
  "internal_only_ai",
  "regulated_compliance_heavy",
  "unknown",
]);

const allowedBusinessTypes = new Set([
  "solo_freelancer",
  "small_business",
  "agency",
  "saas_company",
  "enterprise_team",
  "nonprofit",
  "regulated_business",
]);

const RISK_LABELS = {
  handling_sensitive_data: "handling sensitive data",
  customer_facing_ai: "customer-facing AI",
  internal_only_ai: "internal-only AI",
  regulated_compliance_heavy: "regulated / compliance-heavy environment",
  unknown: "unknown risk profile",
};

const EXPOSURE_LABELS = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const SECURITY_SERVICE_LABELS = {
  ai_security_audit: "AI Security Audit",
  copilot_governance: "Copilot Governance",
  rag_security_review: "RAG Security Review",
  local_ai_hardening: "Local AI Hardening",
};

const UNGOVERNED_TOOLS = new Set(["chatgpt", "gemini", "claude"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText(value)).filter(Boolean) : [];
}

function clampCatalogUsage(values) {
  const filtered = normalizeArray(values).filter((value) => allowedUsage.has(value));
  if (!filtered.length) {
    return ["no_ai_yet"];
  }
  if (filtered.includes("no_ai_yet")) {
    return ["no_ai_yet"];
  }
  return [...new Set(filtered)];
}

function detectUnsafePatterns(usage, riskLevel, businessType) {
  const patterns = [];
  const hasGovernance = usage.includes("microsoft_copilot") || usage.includes("internal_knowledge_assistant");
  const sensitiveContext =
    riskLevel === "handling_sensitive_data" ||
    riskLevel === "customer_facing_ai" ||
    riskLevel === "regulated_compliance_heavy" ||
    businessType === "regulated_business" ||
    businessType === "enterprise_team";

  for (const tool of UNGOVERNED_TOOLS) {
    if (usage.includes(tool) && !hasGovernance) {
      patterns.push(`ungoverned_${tool}`);
    }
  }

  if (usage.includes("n8n_make_zapier") && sensitiveContext) {
    patterns.push("ungoverned_automation_with_sensitive_data");
  }

  if (usage.includes("multimodal_ai") && !hasGovernance) {
    patterns.push("ungoverned_multimodal_ai");
  }

  if (usage.includes("customer_chatbot") && UNGOVERNED_TOOLS.has(usage.find((item) => UNGOVERNED_TOOLS.has(item)))) {
    patterns.push("consumer_llm_behind_customer_chatbot");
  }

  return patterns;
}

function normalize(selector = {}, engagement = {}) {
  const riskLevel = normalizeText(selector.risk_level) || "unknown";
  const businessType = normalizeText(selector.business_type);
  const usage = clampCatalogUsage(selector.current_ai_usage);
  const customerFacing =
    riskLevel === "customer_facing_ai" ||
    usage.includes("customer_chatbot") ||
    normalizeText(engagement.safetyLevel) === "customer_facing";

  return {
    selector_id: normalizeText(selector.selector_id) || null,
    primary_goal: normalizeText(selector.primary_goal) || "not_sure",
    business_type: allowedBusinessTypes.has(businessType) ? businessType : null,
    current_ai_usage: usage,
    risk_level: allowedRiskLevels.has(riskLevel) ? riskLevel : "unknown",
    customer_facing: customerFacing,
    unsafe_patterns: detectUnsafePatterns(usage, riskLevel, businessType),
    created_at: selector.created_at || null,
  };
}

function hasDiagnosticCrossLinks(engagement = {}) {
  return Boolean(
    engagement.auditId ||
      engagement.scanId ||
      engagement.agentCheckId ||
      engagement.automationRoiId ||
      engagement.ragRiskId,
  );
}

function deriveExposureLevel(score) {
  if (score >= 85) {
    return "critical";
  }
  if (score >= 65) {
    return "high";
  }
  if (score >= 40) {
    return "medium";
  }
  return "low";
}

function deriveRecommendedSecurityService(normalized) {
  const usage = normalized.current_ai_usage || [];

  if (usage.includes("microsoft_copilot") || normalized.primary_goal === "govern_copilot_enterprise_ai") {
    return "copilot_governance";
  }

  if (usage.includes("rag_system") || usage.includes("internal_knowledge_assistant")) {
    return "rag_security_review";
  }

  if (usage.includes("local_models_ollama") || normalized.primary_goal === "build_private_local_ai") {
    return "local_ai_hardening";
  }

  if (
    normalized.customer_facing ||
    normalized.risk_level === "regulated_compliance_heavy" ||
    normalized.unsafe_patterns.length > 0
  ) {
    return "ai_security_audit";
  }

  return "ai_security_audit";
}

function computeSecurityRisk(selector = {}, engagement = {}) {
  const normalized = normalize(selector, engagement);
  let score = 15;
  const usage = normalized.current_ai_usage || [];

  switch (normalized.risk_level) {
    case "regulated_compliance_heavy":
      score += 30;
      break;
    case "customer_facing_ai":
      score += 25;
      break;
    case "handling_sensitive_data":
      score += 20;
      break;
    case "unknown":
      score += 10;
      break;
    case "internal_only_ai":
      score += 5;
      break;
    default:
      break;
  }

  if (normalized.business_type === "enterprise_team" || normalized.business_type === "regulated_business") {
    score += 15;
  } else if (normalized.business_type === "saas_company" || normalized.business_type === "agency") {
    score += 8;
  }

  if (normalized.customer_facing) {
    score += 20;
  }

  if (usage.includes("customer_chatbot")) {
    score += 18;
  }
  if (usage.includes("rag_system")) {
    score += 12;
  }
  if (usage.includes("multimodal_ai")) {
    score += 10;
  }
  if (usage.includes("n8n_make_zapier")) {
    score += 8;
  }

  score += Math.min(20, normalized.unsafe_patterns.length * 7);

  if (hasDiagnosticCrossLinks(engagement)) {
    score += 5;
  }

  if (engagement.injectionScore && engagement.injectionScore >= 70) {
    score += 10;
  }
  if (engagement.riskScore && engagement.riskScore >= 70) {
    score += 8;
  }

  const securityRiskScore = Math.max(0, Math.min(100, score));
  const securityExposureLevel = deriveExposureLevel(securityRiskScore);
  const recommendedSecurityService = deriveRecommendedSecurityService(normalized);

  return {
    security_risk_score: securityRiskScore,
    security_exposure_level: securityExposureLevel,
    recommended_security_service: recommendedSecurityService,
    normalized,
  };
}

function generateSecuritySummary(selector = {}, engagement = {}, scores = {}) {
  const normalized = scores.normalized || normalize(selector, engagement);
  const riskScore = scores.security_risk_score ?? 0;
  const exposureLevel = scores.security_exposure_level || "low";
  const recommendedService = scores.recommended_security_service || "ai_security_audit";
  const usageList = normalized.current_ai_usage.join(", ") || "no AI yet";
  const riskNote = RISK_LABELS[normalized.risk_level] || normalized.risk_level;
  const org = normalizeText(engagement.organization) || "unspecified organization";
  const serviceLabel = SECURITY_SERVICE_LABELS[recommendedService] || recommendedService;

  const exposureNote = normalized.customer_facing
    ? "Customer-facing AI exposure detected — external users may interact with ungoverned models."
    : "No direct customer-facing AI surface identified.";

  const governanceGaps =
    normalized.unsafe_patterns.length > 0
      ? `Governance gaps: ${normalized.unsafe_patterns.map((pattern) => pattern.replace(/_/g, " ")).join("; ")}.`
      : "No major ungoverned AI usage patterns detected.";

  const nextSteps = `Recommended next step: route to ${serviceLabel} (${recommendedService}) for operator review.`;

  return [
    `AI footprint for ${org}: ${usageList}.`,
    `Risk profile: ${riskNote} (${EXPOSURE_LABELS[exposureLevel]} exposure, score ${riskScore}/100).`,
    exposureNote,
    governanceGaps,
    nextSteps,
    engagement.transmission
      ? `Engagement context: ${normalizeText(engagement.transmission).slice(0, 180)}${normalizeText(engagement.transmission).length > 180 ? "…" : ""}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function process(selector = {}, engagement = {}) {
  const scores = computeSecurityRisk(selector, engagement);
  const securitySummary = generateSecuritySummary(selector, engagement, scores);

  const selectorId = scores.normalized.selector_id || normalizeText(selector.selector_id);
  const engagementId = normalizeText(engagement.id || engagement.engagement_id);
  const now = new Date().toISOString();

  const record = {
    selector_id: selectorId,
    engagement_id: engagementId,
    security_risk_score: scores.security_risk_score,
    security_exposure_level: scores.security_exposure_level,
    recommended_security_service: scores.recommended_security_service,
    security_summary: securitySummary,
    agent_type: "security-intake",
    status: "ready-for-review",
    processed_at: now,
    created_at: scores.normalized.created_at || engagement.createdAt || now,
  };

  return {
    record,
    response: {
      status: "security-intake-complete",
      selector_id: selectorId,
      engagement_id: engagementId,
      security_risk_score: scores.security_risk_score,
      security_exposure_level: scores.security_exposure_level,
      recommended_security_service: scores.recommended_security_service,
      security_summary: securitySummary,
      next_route: "/operator/service-intake",
    },
  };
}

module.exports = {
  normalize,
  computeSecurityRisk,
  generateSecuritySummary,
  process,
};
