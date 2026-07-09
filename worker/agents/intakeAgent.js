import serviceSelector from "../data/serviceSelector.js";

const { getServiceBySlug } = serviceSelector;

const intakeRoutingTable = {
  service_selector: {
    submit: "POST /api/service-selector",
    funnel: "GET /enter?source=service-selector",
    operator: "GET /operator/service-intake",
  },
  audit_lite: {
    submit: "POST /api/audit-lite",
    funnel: "GET /enter?source=audit-lite",
    operator: "GET /operator/audit-lite",
  },
  public_register: {
    submit: "POST /api/register",
    funnel: "GET /enter?source=public-register",
    operator: "GET /operator/register-intake",
    lifecycle: "GET /api/register-lifecycle",
    security: "GET /api/register-security",
    queue: "GET /api/register-queue",
  },
};

const serviceMap = {
  secure_ai_tools: { primary: "ai_security_audit", secondary: "copilot_governance" },
  build_ai_agent: { primary: "ai_agent_build", secondary: "ai_automation_systems" },
  automate_workflow: { primary: "ai_automation_systems", secondary: "ai_agent_build" },
  improve_ai_visibility: { primary: "aeo_visibility_setup", secondary: "rag_governance_review" },
  build_private_local_ai: { primary: "local_ai_setup", secondary: "ai_security_audit" },
  govern_copilot_enterprise_ai: { primary: "copilot_governance", secondary: "ai_security_audit" },
  assess_multimodal_ai: { primary: "multimodal_ai_risk_review", secondary: "ai_security_audit" },
  not_sure: { primary: "ai_security_audit", secondary: "aeo_visibility_setup" },
};

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

const allowedBudgetRanges = new Set(["under_500", "500_2500", "2500_10000", "10000_plus", "not_sure"]);
const allowedUrgency = new Set(["this_week", "this_month", "planning_phase", "research_only"]);

const RISK_LABELS = {
  handling_sensitive_data: "handling sensitive data",
  customer_facing_ai: "customer-facing AI",
  internal_only_ai: "internal-only AI",
  regulated_compliance_heavy: "regulated / compliance-heavy environment",
  unknown: "unknown risk profile",
};

const URGENCY_LABELS = {
  this_week: "needs attention this week",
  this_month: "targeting delivery this month",
  planning_phase: "in planning phase",
  research_only: "research-only timeline",
};

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

function computeBaseUrgencyScore(answers) {
  let score = 20;
  const usage = answers.current_ai_usage || [];

  switch (answers.urgency) {
    case "this_week":
      score += 25;
      break;
    case "this_month":
      score += 15;
      break;
    case "planning_phase":
      score += 5;
      break;
    default:
      break;
  }

  switch (answers.risk_level) {
    case "regulated_compliance_heavy":
      score += 30;
      break;
    case "customer_facing_ai":
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

  if (answers.business_type === "enterprise_team" || answers.business_type === "regulated_business") {
    score += 20;
  } else if (answers.business_type === "saas_company" || answers.business_type === "agency") {
    score += 10;
  }

  if (usage.includes("customer_chatbot")) score += 15;
  if (usage.includes("rag_system")) score += 10;
  if (usage.includes("multimodal_ai")) score += 10;
  if (usage.includes("microsoft_copilot")) score += 5;
  if (usage.includes("n8n_make_zapier")) score += 5;
  if (usage.includes("local_models_ollama")) score += 5;

  return Math.max(0, Math.min(100, score));
}

function deriveRevenuePotential(budgetRange) {
  switch (budgetRange) {
    case "under_500":
      return "low";
    case "500_2500":
      return "medium";
    case "2500_10000":
      return "high";
    case "10000_plus":
      return "enterprise";
    default:
      return "medium";
  }
}

function deriveAgentPriority(score) {
  if (score >= 85) {
    return "critical";
  }
  if (score >= 65) {
    return "high";
  }
  if (score >= 40) {
    return "normal";
  }
  return "low";
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

function serviceName(slug) {
  const service = getServiceBySlug(slug);
  return service ? service.name : slug || "Unknown Service";
}

function normalizeSelector(selector = {}) {
  const primaryGoal = normalizeText(selector.primary_goal) || "not_sure";
  const riskLevel = normalizeText(selector.risk_level) || "unknown";
  const budgetRange = normalizeText(selector.budget_range) || "not_sure";
  const urgency = normalizeText(selector.urgency) || "research_only";
  const usage = clampCatalogUsage(selector.current_ai_usage);
  const match = serviceMap[Object.prototype.hasOwnProperty.call(serviceMap, primaryGoal) ? primaryGoal : "not_sure"];

  let recommendedService = normalizeText(selector.recommended_service);
  if (!recommendedService) {
    recommendedService = match.primary;
  }

  let secondaryService = normalizeText(selector.secondary_service) || match.secondary || null;

  return {
    selector_id: normalizeText(selector.selector_id) || null,
    primary_goal: Object.prototype.hasOwnProperty.call(serviceMap, primaryGoal) ? primaryGoal : "not_sure",
    business_type: normalizeText(selector.business_type) || null,
    current_ai_usage: usage,
    risk_level: allowedRiskLevels.has(riskLevel) ? riskLevel : "unknown",
    budget_range: allowedBudgetRanges.has(budgetRange) ? budgetRange : "not_sure",
    urgency: allowedUrgency.has(urgency) ? urgency : "research_only",
    source_route: normalizeText(selector.source_route) || "/services",
    recommended_service: recommendedService,
    secondary_service: secondaryService,
    created_at: selector.created_at || null,
  };
}

function score(selector, engagement = {}) {
  const normalized = normalizeSelector(selector);
  let urgencyScore = computeBaseUrgencyScore(normalized);

  const engagementUrgency = normalizeText(engagement.urgency);
  if (engagementUrgency === "this_week") {
    urgencyScore = Math.min(100, urgencyScore + 10);
  }

  if (hasDiagnosticCrossLinks(engagement)) {
    urgencyScore = Math.min(100, urgencyScore + 5);
  }

  const revenuePotential = deriveRevenuePotential(normalized.budget_range);
  const priority = deriveAgentPriority(urgencyScore);

  return {
    urgency_score: urgencyScore,
    revenue_potential: revenuePotential,
    priority,
    recommended_service: normalized.recommended_service,
    secondary_service: normalized.secondary_service,
  };
}

function summarize(selector, engagement = {}, scores = {}) {
  const normalized = normalizeSelector(selector);
  const recommended = scores.recommended_service || normalized.recommended_service;
  const secondary = scores.secondary_service || normalized.secondary_service;
  const urgencyScore = scores.urgency_score ?? 0;
  const priority = scores.priority || "normal";
  const revenuePotential = scores.revenue_potential || "medium";

  const riskNote = RISK_LABELS[normalized.risk_level] || normalized.risk_level;
  const usageList = normalized.current_ai_usage.join(", ") || "no AI yet";
  const org = normalizeText(engagement.organization) || "unspecified organization";
  const urgencyLabel = URGENCY_LABELS[normalized.urgency] || normalized.urgency;

  const agentSummary = [
    `Recommended service: ${serviceName(recommended)} (${recommended}).`,
    secondary ? `Secondary service: ${serviceName(secondary)} (${secondary}).` : null,
    `Risk profile: ${riskNote}; current AI usage includes ${usageList}.`,
    `Opportunity: ${org} with budget range ${normalized.budget_range.replace(/_/g, " ")} — revenue potential ${revenuePotential}.`,
    `Urgency: ${urgencyLabel} (score ${urgencyScore}/100) → priority ${priority}.`,
    engagement.transmission
      ? `Engagement note: ${normalizeText(engagement.transmission).slice(0, 200)}${normalizeText(engagement.transmission).length > 200 ? "…" : ""}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const agentNotes = [
    `• Primary: ${serviceName(recommended)}`,
    secondary ? `• Secondary: ${serviceName(secondary)}` : null,
    `• Risk: ${riskNote}`,
    `• Usage: ${usageList}`,
    `• Priority ${priority} | urgency ${urgencyScore} | revenue ${revenuePotential}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { agent_summary: agentSummary, agent_notes: agentNotes };
}

function process(selector, engagement = {}) {
  const normalized = normalizeSelector(selector);
  const scores = score(normalized, engagement);
  const { agent_summary, agent_notes } = summarize(normalized, engagement, scores);

  const selectorId = normalized.selector_id || normalizeText(selector.selector_id);
  const engagementId = normalizeText(engagement.id || engagement.engagement_id);
  const now = new Date().toISOString();

  const record = {
    selector_id: selectorId,
    engagement_id: engagementId,
    recommended_service: scores.recommended_service,
    secondary_service: scores.secondary_service,
    urgency_score: scores.urgency_score,
    revenue_potential: scores.revenue_potential,
    priority: scores.priority,
    agent_summary,
    agent_notes,
    status: "intake-received",
    processed_at: now,
    created_at: normalized.created_at || engagement.createdAt || now,
  };

  return {
    record,
    response: {
      status: "intake-agent-complete",
      selector_id: selectorId,
      engagement_id: engagementId,
      recommended_service: scores.recommended_service,
      secondary_service: scores.secondary_service,
      urgency_score: scores.urgency_score,
      revenue_potential: scores.revenue_potential,
      priority: scores.priority,
      agent_summary,
      next_route: "/operator/service-intake",
    },
  };
}

export default {
  intakeRoutingTable,
  normalizeSelector,
  score,
  summarize,
  process,
};
