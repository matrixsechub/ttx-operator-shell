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

const AUDIT_LIFECYCLE_SEQUENCE = ["received", "validated", "queued", "processed"];
const AUDIT_LIFECYCLE_LABELS = {
  received: "Pending Intake",
  validated: "Validated",
  queued: "Queued",
  processed: "Processed",
};
const AUDIT_QUEUE_WEIGHT = {
  queued: 0,
  validated: 1,
  received: 2,
  processed: 3,
};

const auditLiteSubmissions = [];
const auditLiteHealth = {
  audit_lite_received: 0,
  audit_lite_validated: 0,
  audit_lite_processed: 0,
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullable(value) {
  const normalized = normalizeText(value);
  return normalized || null;
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

function cloneTopRisks(topRisks = []) {
  return topRisks.map((risk) => ({ ...risk }));
}

function buildLifecycleEntry(status, at, note = null) {
  return {
    status,
    label: AUDIT_LIFECYCLE_LABELS[status] || status,
    at: at || new Date().toISOString(),
    note: note || null,
  };
}

function ensureTimeline(submission = {}) {
  return Array.isArray(submission.lifecycle_timeline) ? submission.lifecycle_timeline : [];
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

function ensureAuditLiteSubmission(details = {}) {
  const auditId = normalizeText(details.audit_id || details.auditId);
  if (!auditId) {
    return null;
  }

  const existing = auditLiteSubmissions.find((entry) => entry.audit_id === auditId);
  if (existing) {
    return existing;
  }

  return upsertAuditLiteSubmission({
    audit_id: auditId,
    created_at: details.created_at || new Date().toISOString(),
    source_route: normalizeText(details.source_route || details.source) || "audit-lite",
    company_type: normalizeText(details.company_type) || "",
    ai_tools_used: normalizeArray(details.ai_tools_used),
    data_used_with_ai: normalizeArray(details.data_used_with_ai),
    ai_exposure: normalizeText(details.ai_exposure),
    governance_controls: normalizeArray(details.governance_controls),
    main_concern: normalizeText(details.main_concern),
    risk_score: Number.isFinite(Number(details.risk_score)) ? Number(details.risk_score) : 0,
    risk_tier: normalizeText(details.risk_tier) || "low",
    priority: normalizeText(details.priority) || "low",
    top_risks: cloneTopRisks(details.top_risks),
    recommended_service: normalizeText(details.recommended_service) || "ai_security_audit",
    next_route: normalizeText(details.next_route),
    engagement_id: normalizeNullable(details.engagement_id || details.engagementId),
    status: "audit-lite-complete",
    lifecycle_status: "received",
    lifecycle_label: AUDIT_LIFECYCLE_LABELS.received,
    lifecycle_timeline: [],
  });
}

function incrementHealthCounter(status) {
  if (status === "received") {
    auditLiteHealth.audit_lite_received += 1;
  }
  if (status === "validated") {
    auditLiteHealth.audit_lite_validated += 1;
  }
  if (status === "processed") {
    auditLiteHealth.audit_lite_processed += 1;
  }
}

function advanceAuditLiteLifecycle(auditId, targetStatus, patch = {}) {
  const normalizedId = normalizeText(auditId);
  if (!normalizedId || !AUDIT_LIFECYCLE_SEQUENCE.includes(targetStatus)) {
    return null;
  }

  const submission = ensureAuditLiteSubmission({ audit_id: normalizedId, ...patch });
  if (!submission) {
    return null;
  }

  const now = patch.updated_at || new Date().toISOString();
  const timeline = ensureTimeline(submission);
  const reached = new Set(timeline.map((entry) => entry.status));
  const targetIndex = AUDIT_LIFECYCLE_SEQUENCE.indexOf(targetStatus);

  for (let index = 0; index <= targetIndex; index += 1) {
    const status = AUDIT_LIFECYCLE_SEQUENCE[index];
    if (!reached.has(status)) {
      timeline.push(buildLifecycleEntry(status, now, index === targetIndex ? patch.lifecycle_note : null));
      reached.add(status);
      incrementHealthCounter(status);
    }
  }

  submission.lifecycle_timeline = timeline;
  submission.lifecycle_status = targetStatus;
  submission.lifecycle_label = AUDIT_LIFECYCLE_LABELS[targetStatus] || targetStatus;
  submission.status = normalizeText(patch.status) || submission.status || "audit-lite-complete";
  submission.engagement_id =
    normalizeNullable(patch.engagement_id || patch.engagementId) || submission.engagement_id || null;
  submission.risk_score = Number.isFinite(Number(patch.risk_score)) ? Number(patch.risk_score) : submission.risk_score;
  submission.risk_tier = normalizeText(patch.risk_tier) || submission.risk_tier || "low";
  submission.priority = normalizeText(patch.priority) || submission.priority || "low";
  submission.recommended_service =
    normalizeText(patch.recommended_service || patch.recommendedService) || submission.recommended_service || "ai_security_audit";
  if (Array.isArray(patch.top_risks) && patch.top_risks.length) {
    submission.top_risks = cloneTopRisks(patch.top_risks);
  }

  return upsertAuditLiteSubmission(submission);
}

function recordAuditLiteSubmission(answers, result) {
  const submission = upsertAuditLiteSubmission({
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
    top_risks: cloneTopRisks(result.top_risks),
    recommended_service: "ai_security_audit",
    next_route: result.next_route,
    engagement_id: null,
    status: "audit-lite-complete",
    lifecycle_status: "received",
    lifecycle_label: AUDIT_LIFECYCLE_LABELS.received,
    lifecycle_timeline: [],
  });

  advanceAuditLiteLifecycle(result.audit_id, "received", {
    created_at: submission.created_at,
    lifecycle_note: "Audit lite submission captured.",
  });
  return advanceAuditLiteLifecycle(result.audit_id, "validated", {
    created_at: submission.created_at,
    lifecycle_note: "Audit lite payload validated and ready for intake.",
  });
}

function attachEngagementToAuditLite(details = {}) {
  const auditId = normalizeText(details.audit_id || details.auditId);
  if (!auditId) {
    return null;
  }

  const submission = ensureAuditLiteSubmission({
    audit_id: auditId,
    created_at: details.created_at || new Date().toISOString(),
    source_route: details.source || "audit-lite",
    company_type: normalizeText(details.company_type) || "",
    risk_score: details.risk_score,
    risk_tier: details.risk_tier,
    priority: details.priority,
    top_risks: Array.isArray(details.top_risks) ? details.top_risks : [],
    recommended_service: details.recommended_service || details.recommendedService,
    next_route: details.next_route,
    engagement_id: details.engagement_id || details.engagementId,
  });

  if (!submission) {
    return null;
  }

  if (!ensureTimeline(submission).some((entry) => entry.status === "validated")) {
    advanceAuditLiteLifecycle(auditId, "validated", {
      created_at: submission.created_at,
      lifecycle_note: "Audit lite context reconstructed for intake lifecycle.",
    });
  }

  return advanceAuditLiteLifecycle(auditId, "queued", {
    engagement_id: details.engagement_id || details.engagementId,
    risk_score: details.risk_score,
    risk_tier: details.risk_tier,
    priority: details.priority,
    recommended_service: details.recommended_service || details.recommendedService,
    top_risks: details.top_risks,
    created_at: details.created_at || submission.created_at,
    status: normalizeText(details.status) || "intake-received",
    lifecycle_note: "Engagement linked and routed into intake queue.",
  });
}

function markAuditLiteProcessed(auditId, note = "Operator view acknowledged the queued audit-lite record.") {
  return advanceAuditLiteLifecycle(auditId, "processed", {
    status: "processed",
    lifecycle_note: note,
  });
}

function getAuditLiteSubmission(auditId) {
  const normalizedId = normalizeText(auditId);
  if (!normalizedId) {
    return null;
  }
  return auditLiteSubmissions.find((entry) => entry.audit_id === normalizedId) || null;
}

function buildLifecycleSnapshot(submission = {}, engagement = null) {
  const lifecycleStatus = normalizeText(submission.lifecycle_status) || "received";
  return {
    audit_id: submission.audit_id,
    selector_id: null,
    engagement_id: submission.engagement_id || engagement?.id || null,
    recommended_service: submission.recommended_service || "ai_security_audit",
    risk_score: submission.risk_score ?? 0,
    risk_tier: submission.risk_tier || "low",
    top_risks: cloneTopRisks(submission.top_risks),
    status: lifecycleStatus,
    lifecycle_status: lifecycleStatus,
    lifecycle_label: submission.lifecycle_label || AUDIT_LIFECYCLE_LABELS[lifecycleStatus] || lifecycleStatus,
    lifecycle_timeline: ensureTimeline(submission).map((entry) => ({ ...entry })),
    observer_mode: lifecycleStatus === "received" || lifecycleStatus === "validated",
    operator_mode: lifecycleStatus === "processed",
    next_route: submission.next_route || null,
    created_at: submission.created_at || engagement?.createdAt || null,
  };
}

function getAuditLiteLifecycle(auditId, engagements = []) {
  const submission = getAuditLiteSubmission(auditId);
  if (!submission) {
    return null;
  }
  const engagement = engagements.find((entry) => entry.auditId === submission.audit_id) || null;
  return buildLifecycleSnapshot(submission, engagement);
}

function listAuditLiteQueue(engagements = [], options = {}) {
  const shouldMarkProcessed = Boolean(options.markProcessed);
  const queue = [];

  for (const submission of auditLiteSubmissions) {
    const linkedEngagement = engagements.find((entry) => entry.auditId && entry.auditId === submission.audit_id) || null;
    const activeSubmission =
      shouldMarkProcessed && linkedEngagement && submission.lifecycle_status === "queued"
        ? markAuditLiteProcessed(submission.audit_id)
        : submission;

    queue.push({
      audit_id: activeSubmission.audit_id,
      engagement_id: activeSubmission.engagement_id || linkedEngagement?.id || null,
      risk_score: activeSubmission.risk_score,
      risk_tier: activeSubmission.risk_tier,
      priority: activeSubmission.priority,
      top_risk_category: activeSubmission.top_risks?.[0]?.category || null,
      recommended_service: activeSubmission.recommended_service,
      status: linkedEngagement?.status || activeSubmission.status,
      lifecycle_status: activeSubmission.lifecycle_status || "received",
      lifecycle_label: activeSubmission.lifecycle_label || AUDIT_LIFECYCLE_LABELS.received,
      lifecycle_timeline: ensureTimeline(activeSubmission).map((entry) => ({ ...entry })),
      created_at: linkedEngagement?.createdAt || activeSubmission.created_at,
    });
  }

  for (const engagement of engagements) {
    if (!engagement.auditId) {
      continue;
    }
    if (queue.some((entry) => entry.audit_id === engagement.auditId)) {
      continue;
    }
    const submission = attachEngagementToAuditLite({
      audit_id: engagement.auditId,
      engagement_id: engagement.id,
      risk_score: engagement.riskScore || 0,
      risk_tier: engagement.riskTier || "low",
      priority: engagement.priority || "low",
      recommended_service: engagement.recommendedService || "ai_security_audit",
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || new Date().toISOString(),
    });

    queue.push({
      audit_id: engagement.auditId,
      engagement_id: engagement.id,
      risk_score: submission?.risk_score ?? engagement.riskScore ?? 0,
      risk_tier: submission?.risk_tier || engagement.riskTier || "low",
      priority: submission?.priority || engagement.priority || "low",
      top_risk_category: submission?.top_risks?.[0]?.category || engagement.topRiskCategory || null,
      recommended_service: submission?.recommended_service || engagement.recommendedService || "ai_security_audit",
      status: engagement.status || "intake-received",
      lifecycle_status: submission?.lifecycle_status || "queued",
      lifecycle_label: submission?.lifecycle_label || AUDIT_LIFECYCLE_LABELS.queued,
      lifecycle_timeline: ensureTimeline(submission).map((entry) => ({ ...entry })),
      created_at: engagement.createdAt || null,
    });
  }

  return queue.sort((left, right) => {
    const leftRank = AUDIT_QUEUE_WEIGHT[left.lifecycle_status] ?? 99;
    const rightRank = AUDIT_QUEUE_WEIGHT[right.lifecycle_status] ?? 99;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    if ((right.risk_score || 0) !== (left.risk_score || 0)) {
      return (right.risk_score || 0) - (left.risk_score || 0);
    }
    return String(right.created_at || "").localeCompare(String(left.created_at || ""));
  });
}

function buildRiskTierDistribution(rows = []) {
  return rows.reduce(
    (distribution, row) => {
      const tier = normalizeText(row.risk_tier) || "low";
      distribution[tier] = (distribution[tier] || 0) + 1;
      return distribution;
    },
    { low: 0, medium: 0, high: 0, critical: 0 },
  );
}

function buildLifecycleDistribution(rows = []) {
  return rows.reduce(
    (distribution, row) => {
      const status = normalizeText(row.lifecycle_status) || "received";
      distribution[status] = (distribution[status] || 0) + 1;
      return distribution;
    },
    { received: 0, validated: 0, queued: 0, processed: 0 },
  );
}

function getAuditLiteHealthRecord() {
  return { ...auditLiteHealth };
}

function getAuditLiteOperatorSnapshot(engagements = [], options = {}) {
  const rows = listAuditLiteQueue(engagements, options);
  return {
    rows,
    summary: {
      total: rows.length,
      last_10_submissions: rows.slice(0, 10),
      risk_tier_distribution: buildRiskTierDistribution(rows),
      lifecycle_distribution: buildLifecycleDistribution(rows),
      health: getAuditLiteHealthRecord(),
    },
  };
}

function getAuditLiteMarketplaceSummary(engagements = []) {
  const rows = listAuditLiteQueue(engagements);
  const latest = rows[0] || null;
  return {
    total_submissions: rows.length,
    latest_lifecycle_status: latest?.lifecycle_status || "received",
    latest_lifecycle_label: latest?.lifecycle_label || AUDIT_LIFECYCLE_LABELS.received,
    observer_mode: Boolean(latest && latest.lifecycle_status !== "processed"),
    operator_mode: Boolean(latest && latest.lifecycle_status === "processed"),
    risk_tier_distribution: buildRiskTierDistribution(rows),
  };
}

export default {
  AUDIT_LIFECYCLE_LABELS,
  auditLiteMarketplaceModule,
  auditLiteSubmissions,
  normalizeAuditLiteAnswers,
  computeAuditLiteResult,
  recordAuditLiteSubmission,
  attachEngagementToAuditLite,
  markAuditLiteProcessed,
  getAuditLiteSubmission,
  getAuditLiteLifecycle,
  listAuditLiteQueue,
  getAuditLiteHealthRecord,
  getAuditLiteOperatorSnapshot,
  getAuditLiteMarketplaceSummary,
};
