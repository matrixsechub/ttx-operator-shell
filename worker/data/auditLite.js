const auditLiteMarketplaceModule = {
  module_id: "msh-ai-security-audit-lite",
  service_slug: "ai_security_audit_lite",
  name: "AI Security Audit Lite",
  category: "ai_security",
  public_service_route: "/apps/ai-security-audit",
  operator_route: "/operator/audit-lite",
  description: "Free diagnostic AI security risk check that scores exposure and routes qualified leads into a full audit intake.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "Full AI Security Audit",
  required_inputs: [
    "company_type",
    "ai_tools_used",
    "data_used_with_ai",
    "ai_exposure",
    "governance_controls",
    "main_concern",
  ],
  delivery_outputs: [
    "risk_score",
    "risk_tier",
    "top_3_risks",
    "recommended_next_step",
    "intake_route",
  ],
  status: "active",
};

const allowedCompanyTypes = new Set([
  "solo_operator",
  "small_business",
  "agency",
  "saas_company",
  "enterprise_team",
  "regulated_business",
]);

const allowedAiTools = new Set([
  "chatgpt",
  "microsoft_copilot",
  "gemini",
  "claude",
  "customer_chatbot",
  "internal_ai_assistant",
  "rag_knowledge_base",
  "ai_agent",
  "n8n_make_zapier",
  "local_llm_ollama",
  "multimodal_ai",
  "none_yet",
]);

const allowedData = new Set([
  "public_content",
  "internal_docs",
  "customer_data",
  "financial_data",
  "health_data",
  "legal_data",
  "credentials_or_secrets",
  "regulated_data",
  "not_sure",
]);

const allowedExposure = new Set([
  "internal_only",
  "customer_facing",
  "public_website",
  "connected_to_business_tools",
  "autonomous_actions",
  "not_sure",
]);

const allowedControls = new Set([
  "written_ai_policy",
  "approved_tool_list",
  "access_controls",
  "logging_monitoring",
  "human_review",
  "vendor_review",
  "prompt_security_testing",
  "none",
  "not_sure",
]);

const allowedConcern = new Set([
  "data_leakage",
  "prompt_injection",
  "employee_misuse",
  "compliance",
  "agent_actions",
  "automation_failure",
  "hallucinations",
  "not_sure",
]);

const riskMetadata = {
  data_leakage: {
    title: "Data leakage exposure",
    description: "Your AI tooling appears to touch business or sensitive data that could leak through prompts, outputs, or connector misuse.",
    recommended_control: "Add data classification boundaries, approved usage rules, and human review for sensitive workflows.",
  },
  prompt_injection: {
    title: "Prompt injection risk",
    description: "Your AI environment has exposure paths where hostile content may steer models or connected workflows in unsafe ways.",
    recommended_control: "Introduce prompt-security testing, input boundary controls, and safer retrieval and tool invocation patterns.",
  },
  ai_agent_action_risk: {
    title: "AI agent action risk",
    description: "Your AI setup may be able to trigger business actions with insufficient guardrails or human checkpoints.",
    recommended_control: "Add approval gates, scoped permissions, action logging, and escalation paths for autonomous behavior.",
  },
  rag_data_exposure: {
    title: "RAG data exposure",
    description: "Knowledge-base AI and retrieval flows can expose internal documents or retrieval results beyond intended audiences.",
    recommended_control: "Review retrieval permissions, document segmentation, and prompt injection boundaries for RAG systems.",
  },
  workflow_automation_risk: {
    title: "Workflow automation risk",
    description: "Connected automation tools may create downstream failures, over-sharing, or unintended execution chains.",
    recommended_control: "Add workflow runbooks, failure controls, scoped credentials, and monitored human checkpoints.",
  },
  copilot_governance_gap: {
    title: "Copilot governance gap",
    description: "Microsoft Copilot and enterprise AI use may be running ahead of formal governance, policy, or review controls.",
    recommended_control: "Define approved-tool policy, access boundaries, logging expectations, and vendor review for enterprise AI.",
  },
  multimodal_privacy_risk: {
    title: "Multimodal privacy risk",
    description: "Image, document, audio, or video AI introduces media handling and privacy exposure that often lacks explicit controls.",
    recommended_control: "Document retention rules, moderation controls, and privacy review for multimodal inputs and outputs.",
  },
  local_ai_governance_gap: {
    title: "Local AI governance gap",
    description: "Local or self-hosted models can bypass central governance even when they reduce external exposure.",
    recommended_control: "Establish local model policy, logging, approved deployment patterns, and operator review expectations.",
  },
  missing_policy_controls: {
    title: "Missing policy controls",
    description: "The current AI environment appears to lack enough written policy, review, or monitoring controls.",
    recommended_control: "Start with written AI policy, access controls, prompt testing, and monitoring for high-risk workflows.",
  },
  compliance_exposure: {
    title: "Compliance exposure",
    description: "Your AI usage may intersect with regulated or sensitive data obligations that require more formal controls.",
    recommended_control: "Map compliance obligations to AI usage, vendor review, logging, and human approval requirements.",
  },
};

const auditLiteSubmissions = [];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText(value)).filter(Boolean) : [];
}

function validateSingle(value, allowedSet, fieldName, fallback = "") {
  const normalized = normalizeText(value);
  if (!allowedSet.has(normalized)) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`${fieldName} is invalid`);
  }
  return normalized;
}

function validateMulti(values, allowedSet, fieldName, fallbackValue) {
  const filtered = normalizeArray(values).filter((value) => allowedSet.has(value));
  if (!filtered.length) {
    return [fallbackValue];
  }
  if (filtered.includes(fallbackValue)) {
    return [fallbackValue];
  }
  return [...new Set(filtered)];
}

function normalizeAuditLiteAnswers(payload = {}) {
  return {
    company_type: validateSingle(payload.company_type, allowedCompanyTypes, "company_type", "small_business"),
    ai_tools_used: validateMulti(payload.ai_tools_used, allowedAiTools, "ai_tools_used", "none_yet"),
    data_used_with_ai: validateMulti(payload.data_used_with_ai, allowedData, "data_used_with_ai", "not_sure"),
    ai_exposure: validateSingle(payload.ai_exposure, allowedExposure, "ai_exposure", "not_sure"),
    governance_controls: validateMulti(payload.governance_controls, allowedControls, "governance_controls", "not_sure"),
    main_concern: validateSingle(payload.main_concern, allowedConcern, "main_concern", "not_sure"),
    source_route: normalizeText(payload.source_route) || "/apps/ai-security-audit",
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

function deriveRiskTier(score) {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function derivePriorityFromTier(tier) {
  if (tier === "low") return "low";
  if (tier === "medium") return "medium";
  return "high";
}

function computeRiskScore(answers) {
  let score = 20;

  if (answers.ai_exposure === "customer_facing") score += 20;
  if (answers.ai_exposure === "public_website") score += 15;
  if (answers.ai_exposure === "autonomous_actions") score += 20;
  if (answers.ai_exposure === "connected_to_business_tools") score += 10;

  if (answers.data_used_with_ai.includes("regulated_data")) score += 20;
  if (answers.data_used_with_ai.includes("credentials_or_secrets")) score += 20;
  if (answers.data_used_with_ai.includes("customer_data")) score += 15;
  if (answers.data_used_with_ai.includes("financial_data")) score += 15;
  if (answers.data_used_with_ai.includes("health_data")) score += 15;
  if (answers.data_used_with_ai.includes("legal_data")) score += 15;

  if (answers.ai_tools_used.includes("customer_chatbot")) score += 10;
  if (answers.ai_tools_used.includes("ai_agent")) score += 10;
  if (answers.ai_tools_used.includes("rag_knowledge_base")) score += 10;
  if (answers.ai_tools_used.includes("n8n_make_zapier")) score += 10;
  if (answers.ai_tools_used.includes("microsoft_copilot")) score += 10;
  if (answers.ai_tools_used.includes("multimodal_ai")) score += 10;

  if (answers.governance_controls.includes("none")) score += 15;
  if (answers.governance_controls.includes("not_sure")) score += 10;

  if (answers.governance_controls.includes("written_ai_policy")) score -= 10;
  if (answers.governance_controls.includes("access_controls")) score -= 10;
  if (answers.governance_controls.includes("logging_monitoring")) score -= 10;
  if (answers.governance_controls.includes("human_review")) score -= 10;
  if (answers.governance_controls.includes("vendor_review")) score -= 10;
  if (answers.governance_controls.includes("prompt_security_testing")) score -= 10;

  return clampScore(score);
}

function addRisk(risks, category, severity) {
  if (risks.some((risk) => risk.category === category)) {
    return;
  }
  const meta = riskMetadata[category];
  if (!meta) {
    return;
  }
  risks.push({
    title: meta.title,
    severity,
    category,
    description: meta.description,
    recommended_control: meta.recommended_control,
  });
}

function buildTopRisks(answers, riskScore, riskTier) {
  const risks = [];
  const elevatedSeverity = riskTier === "critical" ? "critical" : riskTier === "high" ? "high" : "medium";

  if (
    answers.data_used_with_ai.includes("customer_data") ||
    answers.data_used_with_ai.includes("credentials_or_secrets") ||
    answers.data_used_with_ai.includes("financial_data")
  ) {
    addRisk(risks, "data_leakage", elevatedSeverity);
  }

  if (
    answers.main_concern === "prompt_injection" ||
    answers.ai_exposure === "public_website" ||
    answers.ai_exposure === "customer_facing"
  ) {
    addRisk(risks, "prompt_injection", elevatedSeverity);
  }

  if (answers.ai_tools_used.includes("ai_agent") || answers.ai_exposure === "autonomous_actions") {
    addRisk(risks, "ai_agent_action_risk", elevatedSeverity);
  }

  if (answers.ai_tools_used.includes("rag_knowledge_base")) {
    addRisk(risks, "rag_data_exposure", elevatedSeverity);
  }

  if (answers.ai_tools_used.includes("n8n_make_zapier") || answers.main_concern === "automation_failure") {
    addRisk(risks, "workflow_automation_risk", elevatedSeverity);
  }

  if (answers.ai_tools_used.includes("microsoft_copilot")) {
    addRisk(risks, "copilot_governance_gap", riskTier === "low" ? "medium" : elevatedSeverity);
  }

  if (answers.ai_tools_used.includes("multimodal_ai")) {
    addRisk(risks, "multimodal_privacy_risk", elevatedSeverity);
  }

  if (answers.ai_tools_used.includes("local_llm_ollama")) {
    addRisk(risks, "local_ai_governance_gap", riskTier === "low" ? "medium" : elevatedSeverity);
  }

  if (answers.governance_controls.includes("none") || answers.governance_controls.includes("not_sure")) {
    addRisk(risks, "missing_policy_controls", elevatedSeverity);
  }

  if (
    answers.company_type === "regulated_business" ||
    answers.data_used_with_ai.includes("regulated_data") ||
    answers.data_used_with_ai.includes("health_data") ||
    answers.data_used_with_ai.includes("legal_data") ||
    answers.main_concern === "compliance"
  ) {
    addRisk(risks, "compliance_exposure", elevatedSeverity);
  }

  if (!risks.length) {
    addRisk(risks, "missing_policy_controls", riskScore >= 35 ? "medium" : "low");
  }

  if (risks.length < 3) {
    const fillOrder = [
      "data_leakage",
      "prompt_injection",
      "workflow_automation_risk",
      "missing_policy_controls",
      "compliance_exposure",
    ];
    for (const category of fillOrder) {
      addRisk(risks, category, riskTier === "low" ? "low" : "medium");
      if (risks.length >= 3) {
        break;
      }
    }
  }

  return risks.slice(0, 3);
}

function generateAuditLiteId() {
  return `aud-lite-${1001 + auditLiteSubmissions.length}`;
}

function computeAuditLiteResult(answers, auditId = generateAuditLiteId()) {
  const riskScore = computeRiskScore(answers);
  const riskTier = deriveRiskTier(riskScore);
  const priority = derivePriorityFromTier(riskTier);
  const topRisks = buildTopRisks(answers, riskScore, riskTier);
  const params = new URLSearchParams({
    service: "ai_security_audit",
    priority,
    source: "audit-lite",
    audit_id: auditId,
    risk_score: String(riskScore),
    risk_tier: riskTier,
  });

  return {
    status: "audit-lite-complete",
    audit_id: auditId,
    risk_score: riskScore,
    risk_tier: riskTier,
    priority,
    top_risks: topRisks,
    recommended_service: "ai_security_audit",
    next_route: `/enter?${params.toString()}`,
  };
}

function upsertAuditLiteSubmission(submission) {
  const index = auditLiteSubmissions.findIndex((entry) => entry.audit_id === submission.audit_id);
  if (index >= 0) {
    auditLiteSubmissions[index] = { ...auditLiteSubmissions[index], ...submission };
    return auditLiteSubmissions[index];
  }

  auditLiteSubmissions.unshift(submission);
  return submission;
}

function recordAuditLiteSubmission(answers, result) {
  return upsertAuditLiteSubmission({
    audit_id: result.audit_id,
    created_at: new Date().toISOString(),
    source_route: answers.source_route,
    company_type: answers.company_type,
    ai_tools_used: [...answers.ai_tools_used],
    data_used_with_ai: [...answers.data_used_with_ai],
    ai_exposure: answers.ai_exposure,
    governance_controls: [...answers.governance_controls],
    main_concern: answers.main_concern,
    risk_score: result.risk_score,
    risk_tier: result.risk_tier,
    priority: result.priority,
    top_risks: result.top_risks.map((risk) => ({ ...risk })),
    recommended_service: "ai_security_audit",
    next_route: result.next_route,
    engagement_id: null,
    status: "audit-lite-complete",
  });
}

function attachEngagementToAuditLite(details = {}) {
  const auditId = normalizeText(details.audit_id || details.auditId);
  if (!auditId) {
    return null;
  }

  const existing = auditLiteSubmissions.find((entry) => entry.audit_id === auditId);
  const base =
    existing ||
    {
      audit_id: auditId,
      created_at: details.created_at || new Date().toISOString(),
      source_route: details.source || "audit-lite",
      company_type: normalizeText(details.company_type) || "",
      ai_tools_used: [],
      data_used_with_ai: [],
      ai_exposure: "",
      governance_controls: [],
      main_concern: "",
      risk_score: Number.isFinite(Number(details.risk_score)) ? Number(details.risk_score) : 0,
      risk_tier: normalizeText(details.risk_tier) || "low",
      priority: normalizeText(details.priority) || "low",
      top_risks: Array.isArray(details.top_risks) ? details.top_risks : [],
      recommended_service: "ai_security_audit",
      next_route: "",
      status: "audit-lite-complete",
    };

  base.engagement_id = normalizeText(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.risk_score = Number.isFinite(Number(details.risk_score)) ? Number(details.risk_score) : base.risk_score || 0;
  base.risk_tier = normalizeText(details.risk_tier) || base.risk_tier || "low";
  base.priority = normalizeText(details.priority) || base.priority || "low";
  base.status = normalizeText(details.status) || "intake-received";
  base.recommended_service = normalizeText(details.recommended_service || details.recommendedService) || "ai_security_audit";
  if (Array.isArray(details.top_risks) && details.top_risks.length) {
    base.top_risks = details.top_risks;
  }

  return upsertAuditLiteSubmission(base);
}

function listAuditLiteQueue(engagements = []) {
  const queue = [];

  for (const submission of auditLiteSubmissions) {
    const linkedEngagement = engagements.find((entry) => entry.auditId && entry.auditId === submission.audit_id);
    queue.push({
      audit_id: submission.audit_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      risk_score: submission.risk_score,
      risk_tier: submission.risk_tier,
      priority: submission.priority,
      top_risk_category: submission.top_risks?.[0]?.category || null,
      recommended_service: submission.recommended_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at,
    });
  }

  for (const engagement of engagements) {
    if (!engagement.auditId) {
      continue;
    }
    if (queue.some((entry) => entry.engagement_id === engagement.id)) {
      continue;
    }
    queue.push({
      audit_id: engagement.auditId,
      engagement_id: engagement.id,
      risk_score: engagement.riskScore || 0,
      risk_tier: engagement.riskTier || "low",
      priority: engagement.priority || "low",
      top_risk_category: engagement.topRiskCategory || null,
      recommended_service: engagement.recommendedService || "ai_security_audit",
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null,
    });
  }

  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}

export default {
  auditLiteMarketplaceModule,
  auditLiteSubmissions,
  normalizeAuditLiteAnswers,
  computeAuditLiteResult,
  recordAuditLiteSubmission,
  attachEngagementToAuditLite,
  listAuditLiteQueue,
};
