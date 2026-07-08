const promptInjectionMarketplaceModule = {
  module_id: "msh-prompt-injection-scanner",
  service_slug: "prompt_injection_review",
  name: "Prompt Injection Scanner",
  category: "ai_security",
  public_service_route: "/apps/prompt-injection-scanner",
  operator_route: "/operator/prompt-injection-scans",
  description: "Free prompt injection diagnostic that scores exposure, identifies top risks, and routes leads into a full prompt injection review.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "Full Prompt Injection Review",
  required_inputs: [
    "ai_system_type",
    "deployment_context",
    "prompt_sensitivity",
    "tool_permissions",
    "data_access",
    "existing_controls",
    "main_concern",
  ],
  delivery_outputs: [
    "injection_score",
    "risk_tier",
    "top_3_risks",
    "recommended_controls",
    "intake_route",
  ],
  status: "active",
};

const allowedAiSystemTypes = new Set([
  "customer_chatbot",
  "internal_assistant",
  "ai_agent",
  "rag_assistant",
  "copilot_workflow",
  "automation_bot",
  "multimodal_assistant",
  "not_sure",
]);

const allowedDeploymentContexts = new Set([
  "public_website",
  "customer_portal",
  "internal_only",
  "employee_copilot",
  "connected_to_business_tools",
  "testing_only",
  "not_sure",
]);

const allowedPromptSensitivity = new Set([
  "no_sensitive_info",
  "includes_business_rules",
  "includes_internal_processes",
  "includes_customer_data_rules",
  "includes_tool_instructions",
  "includes_security_or_access_rules",
  "not_sure",
]);

const allowedToolPermissions = new Set([
  "no_tools",
  "web_search",
  "email",
  "calendar",
  "crm",
  "database",
  "file_storage",
  "payments",
  "code_execution",
  "workflow_automation",
  "admin_actions",
  "not_sure",
]);

const allowedDataAccess = new Set([
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

const allowedExistingControls = new Set([
  "input_filtering",
  "output_filtering",
  "retrieval_boundaries",
  "tool_permission_limits",
  "human_approval",
  "logging_monitoring",
  "red_team_testing",
  "prompt_versioning",
  "none",
  "not_sure",
]);

const allowedMainConcern = new Set([
  "prompt_injection",
  "data_leakage",
  "tool_misuse",
  "rag_data_exposure",
  "hallucinations",
  "compliance",
  "not_sure",
]);

const riskCatalog = {
  direct_prompt_injection: {
    title: "Direct prompt injection exposure",
    description: "Untrusted prompt input appears able to compete with or override the assistant's intended instruction hierarchy.",
    recommended_control: "Add strict instruction hierarchy, input filtering, refusal boundaries, and prompt injection red-team testing before production use.",
  },
  indirect_prompt_injection: {
    title: "Indirect prompt injection exposure",
    description: "Connected content or retrieved context may carry hostile instructions into the assistant flow without enough isolation controls.",
    recommended_control: "Add retrieval boundaries, context validation, and content filtering before retrieved or external text reaches the model.",
  },
  tool_permission_abuse: {
    title: "Tool permission abuse risk",
    description: "The assistant appears to have connected tool capabilities that could be triggered too broadly during adversarial or malformed interactions.",
    recommended_control: "Add tool permission boundaries, narrow scopes, and human approval for external or high-impact actions.",
  },
  sensitive_data_exposure: {
    title: "Sensitive data exposure risk",
    description: "The deployment appears to touch sensitive information that could leak through prompts, retrieval context, outputs, or connected tools.",
    recommended_control: "Remove secrets from prompts, add refusal rules for sensitive data, and enforce data minimization across prompts and outputs.",
  },
  rag_context_poisoning: {
    title: "RAG context poisoning risk",
    description: "Retrieved content may be able to influence the assistant in unsafe ways if retrieval scope and instruction separation are weak.",
    recommended_control: "Add retrieval boundaries, source validation, segmentation, and prompt injection tests focused on retrieval flows.",
  },
  missing_human_approval: {
    title: "Missing human approval for high-impact actions",
    description: "The workflow appears to allow external actions or sensitive operations without an explicit human checkpoint.",
    recommended_control: "Add human approval for external actions, privilege changes, payment actions, and sensitive business workflows.",
  },
  weak_output_filtering: {
    title: "Weak output filtering",
    description: "Output safety boundaries appear incomplete, increasing the chance of unsafe content, private data disclosure, or over-compliance with malicious requests.",
    recommended_control: "Add output filtering, refusal rules for sensitive requests, and logging to review unsafe completion attempts.",
  },
  public_chatbot_exposure: {
    title: "Public chatbot exposure",
    description: "The assistant is exposed to untrusted public input while handling business logic, tools, or sensitive context.",
    recommended_control: "Reduce exposed capability, tighten prompts, add input boundaries, and test public-facing paths before wider deployment.",
  },
  autonomous_action_risk: {
    title: "Autonomous action risk",
    description: "Prompt or tool configuration suggests the assistant may act with too much autonomy for the surrounding controls.",
    recommended_control: "Require approval for external actions, limit action scopes, and remove unrestricted execution language from prompts.",
  },
  compliance_exposure: {
    title: "Compliance exposure",
    description: "Prompt, data, or workflow configuration appears to intersect with regulated or sensitive obligations without enough governance evidence.",
    recommended_control: "Add logging and monitoring, data minimization, human approval, and documented prompt version control for regulated use cases.",
  },
};

const promptInjectionSubmissions = [];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText(value)).filter(Boolean) : [];
}

function validateSingle(value, allowedSet, fallback) {
  const normalized = normalizeText(value);
  return allowedSet.has(normalized) ? normalized : fallback;
}

function validateMulti(values, allowedSet, fallbackValue) {
  const filtered = normalizeArray(values).filter((value) => allowedSet.has(value));
  if (!filtered.length) {
    return [fallbackValue];
  }
  if (filtered.includes(fallbackValue)) {
    return [fallbackValue];
  }
  return [...new Set(filtered)];
}

function sanitizePromptPreview(value) {
  return normalizeText(value).replace(/\s+/g, " ").replace(/[<>{}]/g, "").slice(0, 120) || null;
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

function derivePriority(riskTier) {
  if (riskTier === "low") return "low";
  if (riskTier === "medium") return "medium";
  return "high";
}

function normalizePromptInjectionAnswers(payload = {}) {
  const allowPromptText = Boolean(payload.allow_prompt_text);
  const normalizedPromptText = allowPromptText ? normalizeText(payload.prompt_text).slice(0, 4000) : "";

  return {
    ai_system_type: validateSingle(payload.ai_system_type, allowedAiSystemTypes, "not_sure"),
    deployment_context: validateSingle(payload.deployment_context, allowedDeploymentContexts, "not_sure"),
    prompt_text: normalizedPromptText,
    allow_prompt_text: allowPromptText,
    prompt_sensitivity: validateSingle(payload.prompt_sensitivity, allowedPromptSensitivity, "not_sure"),
    tool_permissions: validateMulti(payload.tool_permissions, allowedToolPermissions, "not_sure"),
    data_access: validateMulti(payload.data_access, allowedDataAccess, "not_sure"),
    existing_controls: validateMulti(payload.existing_controls, allowedExistingControls, "not_sure"),
    main_concern: validateSingle(payload.main_concern, allowedMainConcern, "not_sure"),
    source_route: normalizeText(payload.source_route) || "/apps/prompt-injection-scanner",
  };
}

function computePromptInjectionScore(answers) {
  let score = 20;

  if (answers.deployment_context === "public_website") score += 20;
  if (answers.deployment_context === "customer_portal") score += 15;
  if (answers.deployment_context === "connected_to_business_tools") score += 15;

  if (answers.ai_system_type === "ai_agent") score += 15;
  if (answers.ai_system_type === "rag_assistant") score += 10;
  if (answers.ai_system_type === "customer_chatbot") score += 10;
  if (answers.ai_system_type === "automation_bot") score += 10;
  if (answers.ai_system_type === "multimodal_assistant") score += 10;

  if (answers.prompt_sensitivity === "includes_tool_instructions") score += 15;
  if (answers.prompt_sensitivity === "includes_security_or_access_rules") score += 15;
  if (answers.prompt_sensitivity === "includes_customer_data_rules") score += 10;
  if (answers.prompt_sensitivity === "includes_internal_processes") score += 10;

  if (answers.tool_permissions.includes("admin_actions")) score += 20;
  if (answers.tool_permissions.includes("payments")) score += 20;
  if (answers.tool_permissions.includes("database")) score += 15;
  if (answers.tool_permissions.includes("file_storage")) score += 15;
  if (answers.tool_permissions.includes("email")) score += 15;
  if (answers.tool_permissions.includes("code_execution")) score += 15;
  if (answers.tool_permissions.includes("workflow_automation")) score += 15;

  if (answers.data_access.includes("credentials_or_secrets")) score += 20;
  if (answers.data_access.includes("regulated_data")) score += 20;
  if (answers.data_access.includes("customer_data")) score += 15;
  if (answers.data_access.includes("financial_data")) score += 15;
  if (answers.data_access.includes("health_data")) score += 15;
  if (answers.data_access.includes("legal_data")) score += 15;

  if (answers.existing_controls.includes("none")) score += 15;
  if (answers.existing_controls.includes("not_sure")) score += 10;

  if (answers.existing_controls.includes("input_filtering")) score -= 10;
  if (answers.existing_controls.includes("output_filtering")) score -= 10;
  if (answers.existing_controls.includes("retrieval_boundaries")) score -= 10;
  if (answers.existing_controls.includes("tool_permission_limits")) score -= 10;
  if (answers.existing_controls.includes("human_approval")) score -= 10;
  if (answers.existing_controls.includes("logging_monitoring")) score -= 10;
  if (answers.existing_controls.includes("red_team_testing")) score -= 10;
  if (answers.existing_controls.includes("prompt_versioning")) score -= 5;

  const promptText = answers.prompt_text.toLowerCase();
  if (/(api[_ -]?key|secret|password|token|credential|private[_ -]?key|bearer\s+[a-z0-9._-]+)/i.test(promptText)) score += 15;
  if (/(ignore previous instructions|developer mode|bypass|override|do anything now)/i.test(promptText)) score += 10;
  if (/(you may take any action|no approval needed|autonomously execute)/i.test(promptText)) score += 10;
  if (
    /(customer data|private data|internal data|sensitive data|confidential)/i.test(promptText) &&
    !/(refuse|do not disclose|never reveal|must not share|only summarize)/i.test(promptText)
  ) {
    score += 10;
  }
  if (/(refuse|do not comply|never reveal secrets|must not disclose|decline requests)/i.test(promptText)) score -= 5;
  if (/(human approval required|requires approval|await approval)/i.test(promptText)) score -= 5;
  if (/(data minimization|minimum necessary|no secrets in prompts|never store secrets)/i.test(promptText)) score -= 5;

  return clampScore(score);
}

function addRisk(risks, category, severity) {
  if (risks.some((risk) => risk.category === category)) {
    return;
  }
  const meta = riskCatalog[category];
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

function buildTopRisks(answers, riskTier) {
  const risks = [];
  const severity = riskTier === "critical" ? "critical" : riskTier === "high" ? "high" : riskTier === "medium" ? "medium" : "low";
  const promptText = answers.prompt_text.toLowerCase();

  if (answers.deployment_context === "public_website" || answers.ai_system_type === "customer_chatbot") {
    addRisk(risks, "public_chatbot_exposure", severity);
    addRisk(risks, "direct_prompt_injection", severity);
  }

  if (
    answers.ai_system_type === "rag_assistant" ||
    answers.data_access.includes("internal_docs") ||
    answers.main_concern === "rag_data_exposure"
  ) {
    addRisk(risks, "rag_context_poisoning", severity);
    addRisk(risks, "indirect_prompt_injection", severity);
  }

  if (
    answers.tool_permissions.some((entry) =>
      ["email", "calendar", "crm", "database", "file_storage", "payments", "code_execution", "workflow_automation", "admin_actions"].includes(entry),
    )
  ) {
    addRisk(risks, "tool_permission_abuse", severity);
  }

  if (answers.tool_permissions.includes("payments") || answers.tool_permissions.includes("admin_actions") || /(autonomously execute|no approval needed)/i.test(promptText)) {
    addRisk(risks, "autonomous_action_risk", severity);
  }

  if (
    answers.data_access.some((entry) =>
      ["customer_data", "financial_data", "health_data", "legal_data", "credentials_or_secrets", "regulated_data"].includes(entry),
    ) ||
    answers.prompt_sensitivity === "includes_customer_data_rules" ||
    answers.prompt_sensitivity === "includes_security_or_access_rules"
  ) {
    addRisk(risks, "sensitive_data_exposure", severity);
  }

  if (!answers.existing_controls.includes("human_approval") && (answers.tool_permissions.includes("payments") || answers.tool_permissions.includes("admin_actions") || answers.tool_permissions.includes("workflow_automation"))) {
    addRisk(risks, "missing_human_approval", severity);
  }

  if (!answers.existing_controls.includes("output_filtering")) {
    addRisk(risks, "weak_output_filtering", riskTier === "low" ? "medium" : severity);
  }

  if (
    answers.main_concern === "compliance" ||
    answers.data_access.includes("regulated_data") ||
    answers.data_access.includes("health_data") ||
    answers.data_access.includes("legal_data")
  ) {
    addRisk(risks, "compliance_exposure", severity);
  }

  if (answers.main_concern === "prompt_injection") {
    addRisk(risks, "direct_prompt_injection", severity);
  }

  if (answers.main_concern === "tool_misuse") {
    addRisk(risks, "tool_permission_abuse", severity);
  }

  if (answers.main_concern === "data_leakage") {
    addRisk(risks, "sensitive_data_exposure", severity);
  }

  if (!risks.length) {
    addRisk(risks, "direct_prompt_injection", riskTier === "low" ? "low" : "medium");
  }

  const fillOrder = [
    "direct_prompt_injection",
    "tool_permission_abuse",
    "sensitive_data_exposure",
    "rag_context_poisoning",
    "missing_human_approval",
    "weak_output_filtering",
    "compliance_exposure",
  ];
  for (const category of fillOrder) {
    if (risks.length >= 3) {
      break;
    }
    addRisk(risks, category, riskTier === "low" ? "low" : "medium");
  }

  return risks.slice(0, 3);
}

function generatePromptInjectionScanId() {
  return `pinj-${1001 + promptInjectionSubmissions.length}`;
}

function computePromptInjectionResult(answers, scanId = generatePromptInjectionScanId()) {
  const injectionScore = computePromptInjectionScore(answers);
  const riskTier = deriveRiskTier(injectionScore);
  const priority = derivePriority(riskTier);
  const topRisks = buildTopRisks(answers, riskTier);
  const params = new URLSearchParams({
    service: "prompt_injection_review",
    priority,
    source: "prompt-injection-scanner",
    scan_id: scanId,
  });
  const nextRoute = `/enter?${params.toString()}`;

  return {
    status: "prompt-injection-scan-complete",
    scan_id: scanId,
    injection_score: injectionScore,
    risk_tier: riskTier,
    priority,
    top_risks: topRisks,
    recommended_service: "prompt_injection_review",
    secondary_service: "ai_security_audit",
    recommended_controls: [...new Set(topRisks.map((risk) => risk.recommended_control))].slice(0, 3),
    recommended_next_step: "Request a full Prompt Injection Review to validate boundaries, approvals, retrieval safety, and prompt governance.",
    next_route: nextRoute,
  };
}

function upsertPromptInjectionSubmission(submission) {
  const index = promptInjectionSubmissions.findIndex((entry) => entry.scan_id === submission.scan_id);
  if (index >= 0) {
    promptInjectionSubmissions[index] = { ...promptInjectionSubmissions[index], ...submission };
    return promptInjectionSubmissions[index];
  }

  promptInjectionSubmissions.unshift(submission);
  return submission;
}

function recordPromptInjectionSubmission(answers, result) {
  return upsertPromptInjectionSubmission({
    scan_id: result.scan_id,
    created_at: new Date().toISOString(),
    source_route: answers.source_route,
    ai_system_type: answers.ai_system_type,
    deployment_context: answers.deployment_context,
    prompt_text_present: Boolean(answers.prompt_text),
    prompt_text_preview: sanitizePromptPreview(answers.prompt_text),
    prompt_sensitivity: answers.prompt_sensitivity,
    tool_permissions: [...answers.tool_permissions],
    data_access: [...answers.data_access],
    existing_controls: [...answers.existing_controls],
    main_concern: answers.main_concern,
    injection_score: result.injection_score,
    risk_tier: result.risk_tier,
    priority: result.priority,
    top_risks: result.top_risks.map((risk) => ({ ...risk })),
    recommended_service: "prompt_injection_review",
    secondary_service: "ai_security_audit",
    next_route: result.next_route,
    engagement_id: null,
    status: "prompt-injection-scan-complete",
  });
}

function attachEngagementToPromptInjectionScan(details = {}) {
  const scanId = normalizeText(details.scan_id || details.scanId);
  if (!scanId) {
    return null;
  }

  const existing = promptInjectionSubmissions.find((entry) => entry.scan_id === scanId);
  const base =
    existing ||
    {
      scan_id: scanId,
      created_at: details.created_at || new Date().toISOString(),
      source_route: details.source || "prompt-injection-scanner",
      ai_system_type: "",
      deployment_context: "",
      prompt_text_present: false,
      prompt_text_preview: null,
      prompt_sensitivity: "",
      tool_permissions: [],
      data_access: [],
      existing_controls: [],
      main_concern: "",
      injection_score: Number.isFinite(Number(details.injection_score)) ? Number(details.injection_score) : 0,
      risk_tier: normalizeText(details.risk_tier) || "low",
      priority: normalizeText(details.priority) || "low",
      top_risks: Array.isArray(details.top_risks) ? details.top_risks : [],
      recommended_service: "prompt_injection_review",
      secondary_service: "ai_security_audit",
      next_route: "",
      status: "prompt-injection-scan-complete",
    };

  base.engagement_id = normalizeText(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.injection_score = Number.isFinite(Number(details.injection_score)) ? Number(details.injection_score) : base.injection_score || 0;
  base.risk_tier = normalizeText(details.risk_tier) || base.risk_tier || "low";
  base.priority = normalizeText(details.priority) || base.priority || "low";
  base.status = normalizeText(details.status) || "intake-received";
  base.recommended_service = normalizeText(details.recommended_service || details.recommendedService) || "prompt_injection_review";
  base.secondary_service = normalizeText(details.secondary_service || details.secondaryService) || base.secondary_service || "ai_security_audit";
  if (Array.isArray(details.top_risks) && details.top_risks.length) {
    base.top_risks = details.top_risks;
  }

  return upsertPromptInjectionSubmission(base);
}

function listPromptInjectionScanQueue(engagements = []) {
  const queue = [];

  for (const submission of promptInjectionSubmissions) {
    const linkedEngagement = engagements.find((entry) => entry.scanId && entry.scanId === submission.scan_id);
    queue.push({
      scan_id: submission.scan_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      injection_score: submission.injection_score,
      risk_tier: submission.risk_tier,
      priority: submission.priority,
      top_risk_category: submission.top_risks?.[0]?.category || null,
      recommended_service: submission.recommended_service,
      secondary_service: submission.secondary_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at,
    });
  }

  for (const engagement of engagements) {
    if (!engagement.scanId) {
      continue;
    }
    if (queue.some((entry) => entry.engagement_id === engagement.id)) {
      continue;
    }
    queue.push({
      scan_id: engagement.scanId,
      engagement_id: engagement.id,
      injection_score: engagement.injectionScore || 0,
      risk_tier: engagement.riskTier || "low",
      priority: engagement.priority || "low",
      top_risk_category: engagement.topRiskCategory || null,
      recommended_service: engagement.recommendedService || "prompt_injection_review",
      secondary_service: engagement.secondaryService || "ai_security_audit",
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null,
    });
  }

  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}

export default {
  promptInjectionMarketplaceModule,
  promptInjectionSubmissions,
  normalizePromptInjectionAnswers,
  computePromptInjectionResult,
  recordPromptInjectionSubmission,
  attachEngagementToPromptInjectionScan,
  listPromptInjectionScanQueue,
};
