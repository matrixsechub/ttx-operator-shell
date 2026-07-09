const serviceCatalog = [
  {
    slug: "ai_security_audit",
    name: "AI Security Audit",
    category: "ai_security",
    public_description: "Identify vulnerabilities in your AI stack before they become breaches.",
    operator_description: "AI and LLM risk audit with controls mapping, remediation planning, and operator escalation support.",
    best_for: "Businesses with customer-facing AI or regulated data",
    starting_price: 2500,
    price_range: "$2,500 - $8,500",
    delivery_time: "5-10 business days",
    default_cta: "Start Security Intake",
    active: true,
    icon: "SEC",
  },
  {
    slug: "ai_agent_build",
    name: "AI Agent Build",
    category: "ai_agents",
    public_description: "Custom AI agents that take action across real business workflows.",
    operator_description: "Agent design and build covering tools, permissions, memory, orchestration, and safety gates.",
    best_for: "Teams automating multi-step business processes",
    starting_price: 4000,
    price_range: "$4,000 - $18,000",
    delivery_time: "2-6 weeks",
    default_cta: "Start Agent Intake",
    active: true,
    icon: "AGT",
  },
  {
    slug: "ai_automation_systems",
    name: "AI Automation Systems",
    category: "ai_automation",
    public_description: "Replace manual workflows with intelligent, reliable automation.",
    operator_description: "Workflow automation for n8n, Make, Zapier, CRM, email, intake, and reporting pipelines.",
    best_for: "Ops-heavy teams with repetitive processes",
    starting_price: 3000,
    price_range: "$3,000 - $12,000",
    delivery_time: "2-4 weeks",
    default_cta: "Start Automation Intake",
    active: true,
    icon: "AUT",
  },
  {
    slug: "rag_governance_review",
    name: "RAG Governance Review",
    category: "rag",
    public_description: "Audit and improve your retrieval-augmented generation pipelines.",
    operator_description: "Review vector stores, retrieval boundaries, attribution, hallucination risk, and retention policy.",
    best_for: "Teams with existing RAG or knowledge-base AI",
    starting_price: 3500,
    price_range: "$3,500 - $9,000",
    delivery_time: "1-2 weeks",
    default_cta: "Start RAG Intake",
    active: true,
    icon: "RAG",
  },
  {
    slug: "local_ai_setup",
    name: "Local AI Setup",
    category: "local_ai",
    public_description: "Deploy AI models on your own infrastructure without cloud dependency.",
    operator_description: "Private and local AI setup for Ollama, LM Studio, self-hosted model workflows, and private RAG.",
    best_for: "Privacy-first or air-gapped environments",
    starting_price: 2000,
    price_range: "$2,000 - $7,500",
    delivery_time: "1-3 weeks",
    default_cta: "Start Local AI Intake",
    active: true,
    icon: "LOC",
  },
  {
    slug: "copilot_governance",
    name: "Copilot Governance",
    category: "copilot",
    public_description: "Govern, monitor, and secure Microsoft Copilot in your enterprise.",
    operator_description: "Enterprise Copilot governance review covering access, policy, logging, compliance, and user controls.",
    best_for: "Microsoft 365 and enterprise Copilot deployments",
    starting_price: 3000,
    price_range: "$3,000 - $10,000",
    delivery_time: "1-3 weeks",
    default_cta: "Start Governance Intake",
    active: true,
    icon: "COP",
  },
  {
    slug: "aeo_visibility_setup",
    name: "AEO Visibility Setup",
    category: "aeo",
    public_description: "Optimize your content to appear in AI-generated answers and search summaries.",
    operator_description: "Answer Engine Optimization package for llms.txt, schema, structured content, glossary APIs, and citation-ready pages.",
    best_for: "Brands wanting visibility in AI search and summary products",
    starting_price: 1500,
    price_range: "$1,500 - $5,000",
    delivery_time: "1-2 weeks",
    default_cta: "Start AEO Intake",
    active: true,
    icon: "AEO",
  },
  {
    slug: "multimodal_ai_risk_review",
    name: "Multimodal AI Risk Review",
    category: "multimodal_ai",
    public_description: "Assess risks in AI systems using text, images, audio, video, or documents.",
    operator_description: "Risk review for multimodal inputs, media retention, biometric exposure, moderation, latency, cost, and explainability.",
    best_for: "Teams using document upload, image analysis, voice AI, or video AI",
    starting_price: 3000,
    price_range: "$3,000 - $9,500",
    delivery_time: "1-3 weeks",
    default_cta: "Start Multimodal Intake",
    active: true,
    icon: "MM",
  },
];

const serviceMarketplaceModules = [
  {
    module_id: "msh-ai-security-audit",
    service_slug: "ai_security_audit",
    name: "AI Security Audit",
    category: "ai_security",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=ai_security_audit",
    description: "AI and LLM security risk audit with remediation roadmap.",
    revenue_type: "consulting",
    base_price: 2500,
    recommended_upsell: "Monthly AI Governance Retainer",
    required_inputs: ["AI tools", "data sensitivity", "current AI usage", "compliance requirements"],
    delivery_outputs: ["Risk score", "Findings", "Controls matrix", "30-day remediation roadmap"],
    status: "active",
  },
  {
    module_id: "msh-ai-agent-build",
    service_slug: "ai_agent_build",
    name: "AI Agent Build",
    category: "ai_agents",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=ai_agent_build",
    description: "Custom AI agent build for business workflows.",
    revenue_type: "consulting",
    base_price: 4000,
    recommended_upsell: "Agent Ops Retainer",
    required_inputs: ["Agent goal", "tools", "permissions", "data access", "approval gates"],
    delivery_outputs: ["Agent blueprint", "Implementation", "Safety controls", "Handoff documentation"],
    status: "active",
  },
  {
    module_id: "msh-ai-automation-systems",
    service_slug: "ai_automation_systems",
    name: "AI Automation Systems",
    category: "ai_automation",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=ai_automation_systems",
    description: "Automated business workflows using AI and workflow orchestration tools.",
    revenue_type: "consulting",
    base_price: 3000,
    recommended_upsell: "Automation Maintenance Retainer",
    required_inputs: ["Workflow description", "current tools", "volume", "failure points"],
    delivery_outputs: ["Workflow map", "Automation build", "Testing plan", "Runbook"],
    status: "active",
  },
  {
    module_id: "msh-rag-governance-review",
    service_slug: "rag_governance_review",
    name: "RAG Governance Review",
    category: "rag",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=rag_governance_review",
    description: "Governance and security review for RAG and knowledge assistant systems.",
    revenue_type: "consulting",
    base_price: 3500,
    recommended_upsell: "Private RAG Build",
    required_inputs: ["Data sources", "vector database", "user roles", "sensitive documents"],
    delivery_outputs: ["Retrieval risk score", "Access-control recommendations", "Governance plan"],
    status: "active",
  },
  {
    module_id: "msh-local-ai-setup",
    service_slug: "local_ai_setup",
    name: "Local AI Setup",
    category: "local_ai",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=local_ai_setup",
    description: "Private local and self-hosted AI setup for sensitive workflows.",
    revenue_type: "consulting",
    base_price: 2000,
    recommended_upsell: "Local AI Support Retainer",
    required_inputs: ["Hardware", "privacy needs", "model requirements", "workflow goals"],
    delivery_outputs: ["Local AI setup", "Model recommendations", "Security controls", "Operator guide"],
    status: "active",
  },
  {
    module_id: "msh-aeo-visibility-setup",
    service_slug: "aeo_visibility_setup",
    name: "AEO Visibility Setup",
    category: "aeo",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=aeo_visibility_setup",
    description: "Answer Engine Optimization for AI search discoverability.",
    revenue_type: "consulting",
    base_price: 1500,
    recommended_upsell: "Monthly AEO Content Retainer",
    required_inputs: ["Website", "target topics", "existing content", "schema status"],
    delivery_outputs: ["AEO audit", "llms.txt", "schema plan", "citation-ready content map"],
    status: "active",
  },
  {
    module_id: "msh-multimodal-ai-risk-review",
    service_slug: "multimodal_ai_risk_review",
    name: "Multimodal AI Risk Review",
    category: "multimodal_ai",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=multimodal_ai_risk_review",
    description: "Risk review for AI systems using images, audio, video, documents, or biometric-adjacent data.",
    revenue_type: "consulting",
    base_price: 3000,
    recommended_upsell: "AI Security Audit",
    required_inputs: ["Modalities", "media retention", "privacy needs", "moderation controls"],
    delivery_outputs: ["Multimodal risk profile", "Privacy controls", "Moderation recommendations", "Roadmap"],
    status: "active",
  },
  {
    module_id: "msh-copilot-governance",
    service_slug: "copilot_governance",
    name: "Copilot Governance",
    category: "copilot",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=copilot_governance",
    description: "Governance package for Microsoft Copilot and enterprise AI adoption.",
    revenue_type: "consulting",
    base_price: 3000,
    recommended_upsell: "Enterprise AI Governance Sprint",
    required_inputs: ["Microsoft 365 tenant context", "user groups", "data access", "policy requirements"],
    delivery_outputs: ["Governance map", "Risk controls", "Policy recommendations", "Rollout checklist"],
    status: "active",
  },
];

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

const selectorIdPattern = /^sel-[a-z0-9]{6,}$/;
const serviceSelectorSubmissions = [];
const allowedBusinessTypes = new Set([
  "solo_freelancer",
  "small_business",
  "agency",
  "saas_company",
  "enterprise_team",
  "nonprofit",
  "regulated_business",
]);
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

function generateSelectorId() {
  return `sel-${Date.now().toString(36)}${Math.floor(Math.random() * 1679616)
    .toString(36)
    .padStart(4, "0")}`;
}

function derivePriority(score) {
  if (score >= 75) {
    return "high";
  }
  if (score >= 40) {
    return "medium";
  }
  return "low";
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

function computeUrgencyScore(answers) {
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

function normalizeSelectorAnswers(payload = {}) {
  const usage = clampCatalogUsage(payload.current_ai_usage);
  const primaryGoal = normalizeText(payload.primary_goal) || "not_sure";
  const businessType = normalizeText(payload.business_type);
  const riskLevel = normalizeText(payload.risk_level) || "unknown";
  const budgetRange = normalizeText(payload.budget_range) || "not_sure";
  const urgency = normalizeText(payload.urgency) || "research_only";

  return {
    primary_goal: Object.prototype.hasOwnProperty.call(serviceMap, primaryGoal) ? primaryGoal : "not_sure",
    business_type: allowedBusinessTypes.has(businessType) ? businessType : null,
    current_ai_usage: usage,
    risk_level: allowedRiskLevels.has(riskLevel) ? riskLevel : "unknown",
    budget_range: allowedBudgetRanges.has(budgetRange) ? budgetRange : "not_sure",
    urgency: allowedUrgency.has(urgency) ? urgency : "research_only",
    source_route: normalizeText(payload.source_route) || "/services",
  };
}

function computeServiceSelectorResult(answers, selectorId = generateSelectorId()) {
  const usage = answers.current_ai_usage || [];
  const primaryGoal = answers.primary_goal || "not_sure";
  const match = serviceMap[primaryGoal] || serviceMap.not_sure;

  let recommendedService = match.primary;
  let secondaryService = match.secondary;

  if (usage.includes("customer_chatbot") && recommendedService !== "ai_security_audit") {
    secondaryService = "ai_security_audit";
  } else if (usage.includes("rag_system") && recommendedService !== "rag_governance_review") {
    secondaryService = "rag_governance_review";
  } else if (usage.includes("n8n_make_zapier") && recommendedService !== "ai_automation_systems") {
    secondaryService = "ai_automation_systems";
  } else if (usage.includes("local_models_ollama") && recommendedService !== "local_ai_setup") {
    secondaryService = "local_ai_setup";
  } else if (usage.includes("microsoft_copilot") && recommendedService !== "copilot_governance") {
    secondaryService = "copilot_governance";
  } else if (usage.includes("multimodal_ai") && recommendedService !== "multimodal_ai_risk_review") {
    secondaryService = "multimodal_ai_risk_review";
  }

  const urgencyScore = computeUrgencyScore(answers);
  const revenuePotential = deriveRevenuePotential(answers.budget_range);
  const priority = derivePriority(urgencyScore);
  const params = new URLSearchParams({
    service: recommendedService,
    priority,
    source: "service-selector",
    selector_id: selectorId,
  });
  const primary = getServiceBySlug(recommendedService);

  return {
    status: "service-match-ready",
    recommended_service: recommendedService,
    secondary_service: secondaryService,
    urgency_score: urgencyScore,
    revenue_potential: revenuePotential,
    priority,
    next_route: `/enter?${params.toString()}`,
    selector_id: selectorId,
    explanation: primary
      ? `${primary.name} is the strongest fit based on your stated goal, AI usage, urgency, and risk profile.`
      : "AI Security Audit is the default recommended starting point.",
  };
}

function getServiceBySlug(slug) {
  return serviceCatalog.find((service) => service.slug === slug);
}

function upsertServiceSelectorSubmission(submission) {
  const index = serviceSelectorSubmissions.findIndex((entry) => entry.selector_id === submission.selector_id);
  if (index >= 0) {
    serviceSelectorSubmissions[index] = { ...serviceSelectorSubmissions[index], ...submission };
    return serviceSelectorSubmissions[index];
  }

  serviceSelectorSubmissions.unshift(submission);
  return submission;
}

function recordServiceSelectorSubmission(answers, result) {
  return upsertServiceSelectorSubmission({
    selector_id: result.selector_id,
    created_at: new Date().toISOString(),
    primary_goal: answers.primary_goal,
    business_type: answers.business_type || null,
    current_ai_usage: [...(answers.current_ai_usage || [])],
    risk_level: answers.risk_level || null,
    budget_range: answers.budget_range || null,
    urgency: answers.urgency || null,
    source_route: answers.source_route || "/services",
    recommended_service: result.recommended_service,
    secondary_service: result.secondary_service || null,
    urgency_score: result.urgency_score,
    revenue_potential: result.revenue_potential,
    priority: result.priority,
    next_route: result.next_route,
    engagement_id: null,
    status: "service-match-ready",
  });
}

function attachEngagementToSelector(details = {}) {
  const selectorId = normalizeText(details.selector_id || details.selectorId);
  if (!selectorId) {
    return null;
  }

  const existing = serviceSelectorSubmissions.find((entry) => entry.selector_id === selectorId);
  const base =
    existing ||
    {
      selector_id: selectorId,
      created_at: details.created_at || new Date().toISOString(),
      source_route: details.source || "service-selector",
      recommended_service: normalizeText(details.recommended_service || details.moduleInterest || details.service) || "ai_security_audit",
      secondary_service: normalizeNullable(details.secondary_service),
      urgency_score: Number.isFinite(Number(details.urgency_score)) ? Number(details.urgency_score) : 0,
      revenue_potential: normalizeText(details.revenue_potential) || "medium",
      priority: normalizeText(details.priority) || "medium",
      next_route: "",
      status: "service-match-ready",
    };

  base.engagement_id = normalizeText(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.status = normalizeText(details.status) || "intake-received";
  base.recommended_service = normalizeText(details.recommended_service || details.moduleInterest || details.service) || base.recommended_service;
  base.secondary_service = normalizeNullable(details.secondary_service) || base.secondary_service || null;
  base.priority = normalizeText(details.priority) || base.priority || "medium";
  base.revenue_potential = normalizeText(details.revenue_potential) || base.revenue_potential || "medium";
  base.urgency_score = Number.isFinite(Number(details.urgency_score)) ? Number(details.urgency_score) : base.urgency_score || 0;
  base.created_at = details.created_at || base.created_at || new Date().toISOString();

  return upsertServiceSelectorSubmission(base);
}

function getServiceSelectorSubmission(selectorId) {
  const normalizedId = normalizeText(selectorId);
  if (!normalizedId) {
    return null;
  }
  return serviceSelectorSubmissions.find((entry) => entry.selector_id === normalizedId) || null;
}

function getServiceIntakeSubmissionByEngagementId(engagementId) {
  const normalizedId = normalizeText(engagementId);
  if (!normalizedId) {
    return null;
  }
  return serviceSelectorSubmissions.find((entry) => entry.engagement_id === normalizedId) || null;
}

function getEngagementById(engagements = [], engagementId) {
  const normalizedId = normalizeText(engagementId);
  if (!normalizedId) {
    return null;
  }
  return engagements.find((entry) => entry.id === normalizedId) || null;
}

function buildSelectorRaw(submission = {}) {
  return {
    primary_goal: submission.primary_goal || null,
    business_type: submission.business_type || null,
    current_ai_usage: [...(submission.current_ai_usage || [])],
    risk_level: submission.risk_level || null,
    budget_range: submission.budget_range || null,
    urgency: submission.urgency || null,
    source_route: submission.source_route || null,
  };
}

function buildEngagementDetails(engagement = {}) {
  if (!engagement || !engagement.id) {
    return null;
  }
  return {
    operatorHandle: engagement.operatorHandle || null,
    organization: engagement.organization || null,
    contactEmail: engagement.contactEmail || null,
    transmission: engagement.transmission || null,
    source: engagement.source || null,
  };
}

function buildIntakeQueueRow(submission = {}, engagementEntry = null, engagementRecord = null) {
  const engagement = engagementRecord || null;
  return {
    selector_id: submission.selector_id || engagement?.selectorId || null,
    engagement_id: submission.engagement_id || engagementEntry?.engagement_id || engagement?.id || null,
    audit_id: engagement?.auditId || null,
    recommended_service: submission.recommended_service || engagementEntry?.recommended_service || engagement?.recommendedService || engagement?.moduleInterest || null,
    secondary_service: submission.secondary_service || engagementEntry?.secondary_service || engagement?.secondaryService || null,
    urgency_score: submission.urgency_score ?? engagementEntry?.urgency_score ?? engagement?.urgencyScore ?? 0,
    revenue_potential: submission.revenue_potential || engagementEntry?.revenue_potential || engagement?.revenuePotential || "medium",
    priority: submission.priority || engagementEntry?.priority || engagement?.priority || engagement?.urgency || "medium",
    risk_score: engagement?.riskScore ?? null,
    risk_tier: engagement?.riskTier || null,
    status: submission.status || engagementEntry?.status || engagement?.status || "service-match-ready",
    agent_summary: submission.agent_summary || null,
    agent_notes: submission.agent_notes || null,
    processed_at: submission.processed_at || null,
    created_at: engagementEntry?.created_at || submission.created_at || engagement?.createdAt || null,
    security_audit_status: submission.security_audit_status || "not_started",
    security_audit_summary: submission.security_audit_summary || null,
    security_risk_score: submission.security_risk_score ?? null,
    security_exposure_level: submission.security_exposure_level || null,
    security_summary: submission.security_summary || null,
    recommended_security_service: submission.recommended_security_service || null,
    agent_type: submission.agent_type || null,
    selector_raw: buildSelectorRaw(submission),
    engagement_details: buildEngagementDetails(engagement),
  };
}

function persistIntakeAgentRecord(record = {}, engagements = []) {
  const selectorId = normalizeText(record.selector_id);
  const engagementId = normalizeText(record.engagement_id);
  if (!selectorId || !engagementId) {
    throw new Error("selector_id and engagement_id are required");
  }

  upsertServiceSelectorSubmission({
    selector_id: selectorId,
    engagement_id: engagementId,
    recommended_service: record.recommended_service,
    secondary_service: record.secondary_service || null,
    urgency_score: record.urgency_score ?? 0,
    revenue_potential: record.revenue_potential || "medium",
    priority: record.priority || "normal",
    agent_summary: record.agent_summary || null,
    agent_notes: record.agent_notes || null,
    status: record.status || "intake-received",
    processed_at: record.processed_at || new Date().toISOString(),
    created_at: record.created_at || new Date().toISOString(),
  });

  const engagement = getEngagementById(engagements, engagementId);
  if (engagement) {
    engagement.selectorId = selectorId;
    engagement.recommendedService = record.recommended_service || engagement.recommendedService;
    engagement.secondaryService = record.secondary_service || engagement.secondaryService;
    engagement.urgencyScore = record.urgency_score ?? engagement.urgencyScore;
    engagement.revenuePotential = record.revenue_potential || engagement.revenuePotential;
    engagement.priority = record.priority || engagement.priority;
    engagement.status = record.status || "intake-received";
  }

  return getServiceSelectorSubmission(selectorId);
}

function persistSecurityIntakeRecord(record = {}, engagements = []) {
  const selectorId = normalizeText(record.selector_id);
  const engagementId = normalizeText(record.engagement_id);
  if (!selectorId || !engagementId) {
    throw new Error("selector_id and engagement_id are required");
  }

  upsertServiceSelectorSubmission({
    selector_id: selectorId,
    engagement_id: engagementId,
    security_risk_score: record.security_risk_score ?? 0,
    security_exposure_level: record.security_exposure_level || "low",
    security_summary: record.security_summary || null,
    recommended_security_service: record.recommended_security_service || "ai_security_audit",
    agent_type: record.agent_type || "security-intake",
    status: record.status || "ready-for-review",
    processed_at: record.processed_at || new Date().toISOString(),
    created_at: record.created_at || new Date().toISOString(),
  });

  const engagement = getEngagementById(engagements, engagementId);
  if (engagement) {
    engagement.selectorId = selectorId;
    engagement.status = record.status || "ready-for-review";
  }

  return getServiceSelectorSubmission(selectorId);
}

const ALLOWED_INTAKE_STATUSES = new Set(["intake-received", "ready-for-review", "closed"]);

function updateServiceIntakeStatus(selectorId, status, engagements = []) {
  const normalizedId = normalizeText(selectorId);
  const normalizedStatus = normalizeText(status);
  if (!normalizedId) {
    throw new Error("selector_id is required");
  }
  if (!ALLOWED_INTAKE_STATUSES.has(normalizedStatus)) {
    throw new Error("Invalid intake status");
  }

  const submission = getServiceSelectorSubmission(normalizedId);
  if (!submission) {
    throw new Error("Selector submission not found");
  }

  submission.status = normalizedStatus;
  upsertServiceSelectorSubmission(submission);

  const engagementId = submission.engagement_id;
  if (engagementId) {
    const engagement = getEngagementById(engagements, engagementId);
    if (engagement) {
      engagement.status = normalizedStatus;
    }
  }

  return submission;
}

function listServiceIntakeQueue(engagements = []) {
  const engagementBySelector = new Map();
  const engagementById = new Map();

  for (const entry of engagements) {
    engagementById.set(entry.id, entry);
    if (entry.selectorId) {
      engagementBySelector.set(entry.selectorId, entry);
    }
  }

  const engagementMap = new Map(
    engagements
      .filter((entry) => entry.selectorId || entry.recommendedService)
      .map((entry) => [
        entry.selectorId || entry.id,
        {
          selector_id: entry.selectorId || null,
          engagement_id: entry.id,
          recommended_service: entry.recommendedService || entry.moduleInterest || null,
          secondary_service: entry.secondaryService || null,
          urgency_score: entry.urgencyScore || 0,
          revenue_potential: entry.revenuePotential || "medium",
          priority: entry.priority || entry.urgency || "medium",
          status: entry.status || "intake-received",
          created_at: entry.createdAt || null,
        },
      ]),
  );

  const queue = [];
  for (const submission of serviceSelectorSubmissions) {
    const engagementEntry = submission.selector_id ? engagementMap.get(submission.selector_id) : null;
    const engagementRecord =
      (submission.engagement_id && engagementById.get(submission.engagement_id)) ||
      (submission.selector_id && engagementBySelector.get(submission.selector_id)) ||
      null;
    queue.push(buildIntakeQueueRow(submission, engagementEntry, engagementRecord));
  }

  for (const engagement of engagements) {
    if (!engagement.selectorId && !engagement.recommendedService) {
      continue;
    }
    if (queue.some((entry) => entry.engagement_id === engagement.id)) {
      continue;
    }
    const engagementEntry = engagementMap.get(engagement.selectorId || engagement.id);
    queue.push(buildIntakeQueueRow({}, engagementEntry, engagement));
  }

  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}

export default {
  selectorIdPattern,
  serviceCatalog,
  serviceMarketplaceModules,
  serviceSelectorSubmissions,
  normalizeSelectorAnswers,
  computeServiceSelectorResult,
  recordServiceSelectorSubmission,
  attachEngagementToSelector,
  listServiceIntakeQueue,
  getServiceSelectorSubmission,
  getServiceIntakeSubmissionByEngagementId,
  getEngagementById,
  persistIntakeAgentRecord,
  persistSecurityIntakeRecord,
  updateServiceIntakeStatus,
  upsertServiceSelectorSubmission,
  getServiceBySlug,
  generateSelectorId,
};
