const ragRiskMarketplaceModule = {
  module_id: "msh-rag-risk-analyzer",
  service_slug: "rag_risk_analyzer",
  name: "RAG Risk Analyzer",
  category: "RAG Systems",
  public_service_route: "/apps/rag-risk-analyzer",
  operator_route: "/operator/rag-risk",
  description: "Free advisory analyzer that evaluates retrieval exposure, access controls, governance maturity, and prompt-injection risk in RAG systems.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "RAG Governance Review / Private RAG System Build",
  required_inputs: [
    "rag_system_type",
    "deployment_context",
    "data_sources",
    "retrieval_scope",
    "access_controls",
    "source_governance",
    "retrieval_quality_controls",
    "prompt_injection_controls",
    "logging_monitoring",
    "business_impact",
    "timeline",
  ],
  delivery_outputs: [
    "rag_risk_score",
    "rag_risk_tier",
    "retrieval_exposure_level",
    "access_control_level",
    "governance_maturity",
    "top_rag_risks",
    "top_recommended_controls",
    "recommended_service",
    "intake_route",
  ],
  status: "active",
};

const allowedRagSystemType = new Set([
  "internal_knowledge_assistant",
  "customer_support_rag",
  "sales_enablement_assistant",
  "legal_or_policy_assistant",
  "technical_docs_assistant",
  "research_assistant",
  "employee_copilot",
  "document_qna_tool",
  "agent_with_rag",
  "planning_only",
  "not_sure",
]);

const allowedDeploymentContext = new Set([
  "internal_only",
  "customer_facing",
  "public_website",
  "partner_or_client_portal",
  "employee_copilot",
  "connected_to_business_tools",
  "planning_only",
  "not_sure",
]);

const allowedDataSources = new Set([
  "public_docs",
  "internal_docs",
  "customer_records",
  "sales_materials",
  "support_tickets",
  "legal_docs",
  "financial_docs",
  "health_or_patient_docs",
  "policy_or_hr_docs",
  "source_code",
  "credentials_or_secrets",
  "regulated_data",
  "not_sure",
]);

const allowedRetrievalScope = new Set([
  "public_only",
  "team_specific",
  "department_specific",
  "company_wide",
  "customer_specific",
  "mixed_sensitive_and_public",
  "not_sure",
]);

const allowedAccessControls = new Set([
  "user_role_filtering",
  "document_level_permissions",
  "tenant_isolation",
  "source_based_filtering",
  "approval_required_for_sensitive_docs",
  "no_access_controls",
  "not_sure",
]);

const allowedSourceGovernance = new Set([
  "curated_approved_sources",
  "mostly_curated",
  "mixed_sources",
  "user_uploaded_docs",
  "web_crawled_sources",
  "unknown_or_unmanaged",
  "not_sure",
]);

const allowedRetrievalQualityControls = new Set([
  "citations_required",
  "source_links_shown",
  "confidence_scoring",
  "answer_abstention",
  "retrieval_evaluation",
  "hallucination_testing",
  "no_quality_controls",
  "not_sure",
]);

const allowedPromptInjectionControls = new Set([
  "instruction_hierarchy",
  "retrieved_content_sandboxing",
  "input_filtering",
  "output_filtering",
  "prompt_injection_testing",
  "tool_permission_limits",
  "no_prompt_injection_controls",
  "not_sure",
]);

const allowedLoggingMonitoring = new Set([
  "full_query_and_response_logging",
  "security_event_logging",
  "limited_usage_logging",
  "no_logging",
  "not_sure",
]);

const allowedBusinessImpact = new Set([
  "experimental",
  "internal_productivity",
  "customer_support",
  "revenue_workflow",
  "compliance_or_legal_workflow",
  "mission_critical",
  "not_sure",
]);

const allowedTimeline = new Set(["this_week", "this_month", "this_quarter", "exploring"]);

const ragRiskCatalog = {
  sensitive_data_retrieval: {
    title: "Sensitive data retrieval exposure",
    severity: "high",
    category: "sensitive_data_retrieval",
    description: "Sensitive or regulated documents may be exposed through retrieval paths that are broader than intended.",
    recommended_control: "Enforce document-level permissions, retrieval boundaries, and answer abstention for uncertain access decisions.",
  },
  access_control_gap: {
    title: "Weak retrieval access controls",
    severity: "high",
    category: "access_control_gap",
    description: "The current RAG system does not appear to apply strong access-control checks before returning retrieved content.",
    recommended_control: "Apply role filters, document permissions, source filters, and approval gates for sensitive documents.",
  },
  tenant_isolation_gap: {
    title: "Tenant isolation gap",
    severity: "critical",
    category: "tenant_isolation_gap",
    description: "Cross-tenant or cross-customer retrieval can leak content between organizations when isolation is missing.",
    recommended_control: "Isolate indexes, retrieval filters, and access claims at the tenant boundary.",
  },
  source_governance_gap: {
    title: "Unmanaged source governance",
    severity: "high",
    category: "source_governance_gap",
    description: "Uncurated, user-uploaded, or web-crawled sources increase the chance of unsafe retrieval and stale knowledge.",
    recommended_control: "Move to approved source allowlists with provenance tracking and review workflows.",
  },
  hallucination_or_attribution_risk: {
    title: "Hallucination or attribution gap",
    severity: "medium",
    category: "hallucination_or_attribution_risk",
    description: "Without citations, abstention, or evaluation, answers may overstate confidence or misattribute facts.",
    recommended_control: "Require citations, confidence signals, abstention logic, and regular retrieval evaluation.",
  },
  prompt_injection_via_retrieved_content: {
    title: "Prompt injection through retrieved content",
    severity: "high",
    category: "prompt_injection_via_retrieved_content",
    description: "Retrieved documents can carry malicious instructions that influence the assistant or connected tools.",
    recommended_control: "Sandbox retrieved content, enforce instruction hierarchy, and test prompt-injection controls regularly.",
  },
  unsafe_public_rag_exposure: {
    title: "Unsafe public RAG exposure",
    severity: "critical",
    category: "unsafe_public_rag_exposure",
    description: "Public or customer-facing RAG systems create a larger attack surface when retrieval and monitoring are weak.",
    recommended_control: "Harden public retrieval boundaries, reduce exposed sources, and add security event logging.",
  },
  compliance_exposure: {
    title: "Compliance exposure",
    severity: "high",
    category: "compliance_exposure",
    description: "Regulated, legal, financial, or HR content in retrieval flows introduces audit and policy risk.",
    recommended_control: "Run a formal compliance review with data minimization, scoped access, and human approval for sensitive content.",
  },
  unmanaged_user_uploads: {
    title: "Unmanaged user uploads",
    severity: "high",
    category: "unmanaged_user_uploads",
    description: "User-provided documents can expand retrieval scope and introduce prompt injection or sensitive data issues.",
    recommended_control: "Review uploads before indexing and isolate them from sensitive production knowledge sources.",
  },
  logging_monitoring_gap: {
    title: "Logging and monitoring gap",
    severity: "medium",
    category: "logging_monitoring_gap",
    description: "Without logging, teams cannot investigate suspicious retrieval patterns or unsafe outputs.",
    recommended_control: "Add query, response, and security event logging with operator review paths.",
  },
  agentic_rag_action_risk: {
    title: "Agentic RAG action risk",
    severity: "high",
    category: "agentic_rag_action_risk",
    description: "When RAG is connected to agent actions, unsafe retrieved content can influence real operational behavior.",
    recommended_control: "Add tool permission limits, human approval, and prompt-injection testing before any action execution.",
  },
};

const controlCatalog = {
  document_level_permissions: {
    title: "Document-level permission enforcement",
    priority: "high",
    category: "document_level_permissions",
    description: "Restrict retrieval results to documents the current user is explicitly authorized to access.",
    implementation_note: "Apply permission filters before retrieval and verify enforcement in retrieval evaluation tests.",
  },
  tenant_isolation: {
    title: "Tenant isolation for retrieval",
    priority: "high",
    category: "tenant_isolation",
    description: "Separate customer or organization retrieval paths so one tenant cannot access another tenant's content.",
    implementation_note: "Isolate indexes, claims, and filters at query time and validate with cross-tenant tests.",
  },
  source_allowlisting: {
    title: "Approved source allowlisting",
    priority: "high",
    category: "source_allowlisting",
    description: "Limit retrieval to reviewed sources with clear provenance and lifecycle ownership.",
    implementation_note: "Tag approved collections and exclude unmanaged sources from production retrieval.",
  },
  retrieval_boundaries: {
    title: "Scoped retrieval boundaries",
    priority: "high",
    category: "retrieval_boundaries",
    description: "Constrain which documents and contexts are eligible for retrieval in each user or workflow path.",
    implementation_note: "Use metadata filters, user scopes, and sensitivity tags before scoring results.",
  },
  citation_requirements: {
    title: "Citations and source links",
    priority: "medium",
    category: "citation_requirements",
    description: "Require answers to reference the source material they relied on.",
    implementation_note: "Return source links and suppress unsupported claims when citations are unavailable.",
  },
  answer_abstention: {
    title: "Answer abstention for uncertain cases",
    priority: "medium",
    category: "answer_abstention",
    description: "Avoid confident answers when retrieval quality is weak, access is uncertain, or citations are missing.",
    implementation_note: "Define thresholds that trigger fallback, escalation, or human review.",
  },
  prompt_injection_testing: {
    title: "Prompt-injection testing",
    priority: "high",
    category: "prompt_injection_testing",
    description: "Test retrieved content and query flows for instruction override and tool misuse behaviors.",
    implementation_note: "Run adversarial tests against retrieved documents, user prompts, and action-connected flows.",
  },
  retrieved_content_sandboxing: {
    title: "Retrieved content sandboxing",
    priority: "high",
    category: "retrieved_content_sandboxing",
    description: "Treat retrieved text as untrusted input rather than executable instruction content.",
    implementation_note: "Separate system instructions from retrieved content and enforce instruction hierarchy.",
  },
  logging_monitoring: {
    title: "Security logging and monitoring",
    priority: "medium",
    category: "logging_monitoring",
    description: "Track query patterns, risky retrievals, and suspicious outputs for operator review.",
    implementation_note: "Capture both usage telemetry and security-specific events with retention and review ownership.",
  },
  human_review: {
    title: "Human review for sensitive outputs",
    priority: "medium",
    category: "human_review",
    description: "Add a human approval path for sensitive, compliance-heavy, or high-blast-radius answers.",
    implementation_note: "Use approval gates for legal, regulated, or customer-impacting content.",
  },
  compliance_review: {
    title: "Compliance and legal review",
    priority: "high",
    category: "compliance_review",
    description: "Review regulated data handling and content access rules before broader rollout.",
    implementation_note: "Validate retention, access, user rights, and policy requirements against actual retrieval scope.",
  },
  data_minimization: {
    title: "Data minimization for RAG sources",
    priority: "medium",
    category: "data_minimization",
    description: "Reduce indexed sensitive content to the minimum necessary for the use case.",
    implementation_note: "Split highly sensitive documents from general retrieval and remove unnecessary fields from indexing.",
  },
};

const ragRiskSubmissions = [];

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
  if (filtered.includes("not_sure")) {
    return ["not_sure"];
  }
  return [...new Set(filtered)];
}

function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

function normalizeRagRiskAnswers(payload = {}) {
  return {
    rag_system_type: validateSingle(payload.rag_system_type, allowedRagSystemType, "not_sure"),
    deployment_context: validateSingle(payload.deployment_context, allowedDeploymentContext, "not_sure"),
    data_sources: validateMulti(payload.data_sources, allowedDataSources, "not_sure"),
    retrieval_scope: validateSingle(payload.retrieval_scope, allowedRetrievalScope, "not_sure"),
    access_controls: validateMulti(payload.access_controls, allowedAccessControls, "not_sure"),
    source_governance: validateSingle(payload.source_governance, allowedSourceGovernance, "not_sure"),
    retrieval_quality_controls: validateMulti(payload.retrieval_quality_controls, allowedRetrievalQualityControls, "not_sure"),
    prompt_injection_controls: validateMulti(payload.prompt_injection_controls, allowedPromptInjectionControls, "not_sure"),
    logging_monitoring: validateSingle(payload.logging_monitoring, allowedLoggingMonitoring, "not_sure"),
    business_impact: validateSingle(payload.business_impact, allowedBusinessImpact, "not_sure"),
    timeline: validateSingle(payload.timeline, allowedTimeline, "exploring"),
    source_route: normalizeText(payload.source_route) || "/apps/rag-risk-analyzer",
  };
}

function scoreIncludes(values, target, amount) {
  return values.includes(target) ? amount : 0;
}

function computeRagRiskScore(answers) {
  let score = 25;
  if (answers.deployment_context === "public_website") score += 20;
  if (answers.deployment_context === "customer_facing") score += 15;
  if (answers.deployment_context === "partner_or_client_portal") score += 15;
  if (answers.deployment_context === "connected_to_business_tools") score += 10;
  if (answers.rag_system_type === "customer_support_rag") score += 15;
  if (answers.rag_system_type === "agent_with_rag") score += 15;
  if (answers.rag_system_type === "legal_or_policy_assistant") score += 10;
  if (answers.rag_system_type === "employee_copilot") score += 10;
  score += scoreIncludes(answers.data_sources, "credentials_or_secrets", 20);
  score += scoreIncludes(answers.data_sources, "regulated_data", 20);
  score += scoreIncludes(answers.data_sources, "customer_records", 15);
  score += scoreIncludes(answers.data_sources, "financial_docs", 15);
  score += scoreIncludes(answers.data_sources, "health_or_patient_docs", 15);
  score += scoreIncludes(answers.data_sources, "legal_docs", 15);
  score += scoreIncludes(answers.data_sources, "policy_or_hr_docs", 10);
  score += scoreIncludes(answers.data_sources, "source_code", 10);
  if (answers.retrieval_scope === "mixed_sensitive_and_public") score += 15;
  if (answers.retrieval_scope === "company_wide") score += 10;
  if (answers.retrieval_scope === "customer_specific") score += 10;
  score += scoreIncludes(answers.access_controls, "no_access_controls", 20);
  score += scoreIncludes(answers.access_controls, "not_sure", 10);
  if (answers.source_governance === "unknown_or_unmanaged") score += 15;
  if (answers.source_governance === "user_uploaded_docs") score += 10;
  if (answers.source_governance === "web_crawled_sources") score += 10;
  score += scoreIncludes(answers.retrieval_quality_controls, "no_quality_controls", 15);
  score += scoreIncludes(answers.retrieval_quality_controls, "not_sure", 10);
  score += scoreIncludes(answers.prompt_injection_controls, "no_prompt_injection_controls", 15);
  score += scoreIncludes(answers.prompt_injection_controls, "not_sure", 10);
  if (answers.logging_monitoring === "no_logging") score += 15;
  if (answers.logging_monitoring === "not_sure") score += 10;
  if (answers.business_impact === "mission_critical") score += 15;
  if (answers.business_impact === "compliance_or_legal_workflow") score += 10;
  if (answers.business_impact === "revenue_workflow") score += 10;

  score -= scoreIncludes(answers.access_controls, "user_role_filtering", 10);
  score -= scoreIncludes(answers.access_controls, "document_level_permissions", 10);
  score -= scoreIncludes(answers.access_controls, "tenant_isolation", 10);
  score -= scoreIncludes(answers.access_controls, "source_based_filtering", 8);
  score -= scoreIncludes(answers.access_controls, "approval_required_for_sensitive_docs", 8);
  if (answers.source_governance === "curated_approved_sources") score -= 10;
  if (answers.source_governance === "mostly_curated") score -= 5;
  score -= scoreIncludes(answers.retrieval_quality_controls, "citations_required", 8);
  score -= scoreIncludes(answers.retrieval_quality_controls, "source_links_shown", 8);
  score -= scoreIncludes(answers.retrieval_quality_controls, "confidence_scoring", 8);
  score -= scoreIncludes(answers.retrieval_quality_controls, "answer_abstention", 8);
  score -= scoreIncludes(answers.retrieval_quality_controls, "retrieval_evaluation", 8);
  score -= scoreIncludes(answers.retrieval_quality_controls, "hallucination_testing", 8);
  score -= scoreIncludes(answers.prompt_injection_controls, "instruction_hierarchy", 10);
  score -= scoreIncludes(answers.prompt_injection_controls, "retrieved_content_sandboxing", 10);
  score -= scoreIncludes(answers.prompt_injection_controls, "input_filtering", 8);
  score -= scoreIncludes(answers.prompt_injection_controls, "output_filtering", 8);
  score -= scoreIncludes(answers.prompt_injection_controls, "prompt_injection_testing", 8);
  score -= scoreIncludes(answers.prompt_injection_controls, "tool_permission_limits", 8);
  if (answers.logging_monitoring === "full_query_and_response_logging") score -= 8;
  if (answers.logging_monitoring === "security_event_logging") score -= 8;
  return clampScore(score);
}

function deriveRagRiskTier(score) {
  if (score <= 34) return "low";
  if (score <= 64) return "medium";
  if (score <= 84) return "high";
  return "critical";
}

function computeExposureLevel(answers) {
  let score = 0;
  if (answers.deployment_context === "public_website") score += 20;
  if (answers.deployment_context === "customer_facing") score += 15;
  if (answers.deployment_context === "partner_or_client_portal") score += 15;
  if (answers.retrieval_scope === "mixed_sensitive_and_public") score += 15;
  if (answers.retrieval_scope === "company_wide") score += 10;
  if (answers.retrieval_scope === "customer_specific") score += 10;
  score += scoreIncludes(answers.data_sources, "regulated_data", 15);
  score += scoreIncludes(answers.data_sources, "credentials_or_secrets", 15);
  score += scoreIncludes(answers.data_sources, "customer_records", 10);
  score += scoreIncludes(answers.data_sources, "financial_docs", 10);
  score += scoreIncludes(answers.data_sources, "health_or_patient_docs", 10);
  if (answers.source_governance === "user_uploaded_docs") score += 10;
  if (answers.source_governance === "web_crawled_sources") score += 10;
  if (score <= 24) return "low";
  if (score <= 49) return "medium";
  if (score <= 74) return "high";
  return "critical";
}

function computeAccessControlLevel(answers) {
  let score = 0;
  score += scoreIncludes(answers.access_controls, "user_role_filtering", 20);
  score += scoreIncludes(answers.access_controls, "document_level_permissions", 20);
  score += scoreIncludes(answers.access_controls, "tenant_isolation", 20);
  score += scoreIncludes(answers.access_controls, "source_based_filtering", 15);
  score += scoreIncludes(answers.access_controls, "approval_required_for_sensitive_docs", 15);
  score -= scoreIncludes(answers.access_controls, "no_access_controls", 25);
  score -= scoreIncludes(answers.access_controls, "not_sure", 15);
  if (score <= 0) return "absent";
  if (score <= 29) return "weak";
  if (score <= 59) return "partial";
  return "strong";
}

function computeGovernanceMaturity(answers) {
  let score = 0;
  if (answers.source_governance === "curated_approved_sources") score += 20;
  if (answers.source_governance === "mostly_curated") score += 10;
  score += scoreIncludes(answers.retrieval_quality_controls, "citations_required", 15);
  score += scoreIncludes(answers.retrieval_quality_controls, "source_links_shown", 15);
  score += scoreIncludes(answers.retrieval_quality_controls, "confidence_scoring", 15);
  score += scoreIncludes(answers.retrieval_quality_controls, "answer_abstention", 15);
  score += scoreIncludes(answers.retrieval_quality_controls, "retrieval_evaluation", 15);
  score += scoreIncludes(answers.prompt_injection_controls, "instruction_hierarchy", 15);
  score += scoreIncludes(answers.prompt_injection_controls, "retrieved_content_sandboxing", 15);
  score += scoreIncludes(answers.prompt_injection_controls, "prompt_injection_testing", 10);
  if (answers.logging_monitoring === "full_query_and_response_logging") score += 10;
  if (answers.logging_monitoring === "security_event_logging") score += 10;
  if (answers.source_governance === "unknown_or_unmanaged") score -= 20;
  score -= scoreIncludes(answers.retrieval_quality_controls, "no_quality_controls", 15);
  score -= scoreIncludes(answers.prompt_injection_controls, "no_prompt_injection_controls", 15);
  if (answers.logging_monitoring === "no_logging") score -= 15;
  if (score <= 0) return "absent";
  if (score <= 29) return "weak";
  if (score <= 59) return "developing";
  return "mature";
}

function derivePriority(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel, governanceMaturity) {
  if (answers.timeline === "this_week") return "high";
  if (ragRiskTier === "high" || ragRiskTier === "critical") return "high";
  if (retrievalExposureLevel === "high" || retrievalExposureLevel === "critical") return "high";
  if (accessControlLevel === "absent" || accessControlLevel === "weak") return "high";
  if (governanceMaturity === "absent" || governanceMaturity === "weak") return "medium";
  if (answers.business_impact === "mission_critical" || answers.business_impact === "compliance_or_legal_workflow") return "medium";
  return "low";
}

function deriveRecommendedService(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel) {
  if (ragRiskTier === "critical") return "rag_governance_review";
  if (retrievalExposureLevel === "critical") return "rag_governance_review";
  if (accessControlLevel === "absent" || accessControlLevel === "weak") return "rag_governance_review";
  if (answers.deployment_context === "public_website" || answers.deployment_context === "customer_facing") return "ai_security_audit";
  if (answers.rag_system_type === "planning_only") return "private_rag_system_blueprint";
  return "rag_governance_review";
}

function deriveSecondaryService(answers) {
  if (
    answers.data_sources.includes("regulated_data") ||
    answers.data_sources.includes("credentials_or_secrets") ||
    answers.data_sources.includes("financial_docs") ||
    answers.data_sources.includes("health_or_patient_docs") ||
    answers.data_sources.includes("legal_docs") ||
    answers.deployment_context === "public_website"
  ) {
    return "ai_security_audit";
  }
  if (
    answers.prompt_injection_controls.includes("no_prompt_injection_controls") ||
    answers.prompt_injection_controls.includes("not_sure")
  ) {
    return "prompt_injection_review";
  }
  if (answers.rag_system_type === "agent_with_rag") {
    return "ai_agent_security_review";
  }
  if (
    answers.source_governance === "unknown_or_unmanaged" ||
    answers.retrieval_scope === "mixed_sensitive_and_public"
  ) {
    return "private_rag_system_build";
  }
  return null;
}

function uniqueByCategory(items, limit = 3) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    if (!item || seen.has(item.category)) continue;
    seen.add(item.category);
    output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}

function buildTopRagRisks(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel, governanceMaturity) {
  const picks = [];
  if (
    answers.data_sources.some((entry) =>
      ["customer_records", "financial_docs", "health_or_patient_docs", "legal_docs", "regulated_data", "credentials_or_secrets"].includes(entry),
    )
  ) {
    picks.push(ragRiskCatalog.sensitive_data_retrieval, ragRiskCatalog.compliance_exposure);
  }
  if (accessControlLevel === "absent" || accessControlLevel === "weak") {
    picks.push(ragRiskCatalog.access_control_gap);
  }
  if (!answers.access_controls.includes("tenant_isolation") && answers.retrieval_scope === "customer_specific") {
    picks.push(ragRiskCatalog.tenant_isolation_gap);
  }
  if (answers.source_governance === "unknown_or_unmanaged" || answers.source_governance === "web_crawled_sources") {
    picks.push(ragRiskCatalog.source_governance_gap);
  }
  if (
    answers.retrieval_quality_controls.includes("no_quality_controls") ||
    !answers.retrieval_quality_controls.some((entry) =>
      ["citations_required", "source_links_shown", "confidence_scoring", "answer_abstention", "retrieval_evaluation"].includes(entry),
    )
  ) {
    picks.push(ragRiskCatalog.hallucination_or_attribution_risk);
  }
  if (
    answers.prompt_injection_controls.includes("no_prompt_injection_controls") ||
    answers.prompt_injection_controls.includes("not_sure")
  ) {
    picks.push(ragRiskCatalog.prompt_injection_via_retrieved_content);
  }
  if (
    retrievalExposureLevel === "critical" ||
    answers.deployment_context === "public_website" ||
    answers.deployment_context === "customer_facing"
  ) {
    picks.push(ragRiskCatalog.unsafe_public_rag_exposure);
  }
  if (answers.source_governance === "user_uploaded_docs") {
    picks.push(ragRiskCatalog.unmanaged_user_uploads);
  }
  if (answers.logging_monitoring === "no_logging" || answers.logging_monitoring === "not_sure") {
    picks.push(ragRiskCatalog.logging_monitoring_gap);
  }
  if (answers.rag_system_type === "agent_with_rag") {
    picks.push(ragRiskCatalog.agentic_rag_action_risk);
  }
  if (ragRiskTier === "critical" && governanceMaturity === "absent") {
    picks.push(ragRiskCatalog.source_governance_gap, ragRiskCatalog.access_control_gap);
  }
  return uniqueByCategory(
    picks.length ? picks : [ragRiskCatalog.access_control_gap, ragRiskCatalog.hallucination_or_attribution_risk, ragRiskCatalog.logging_monitoring_gap],
  );
}

function buildTopRecommendedControls(answers, retrievalExposureLevel, accessControlLevel, governanceMaturity) {
  const picks = [];
  if (!answers.access_controls.includes("document_level_permissions")) {
    picks.push(controlCatalog.document_level_permissions);
  }
  if (
    answers.retrieval_scope === "customer_specific" &&
    !answers.access_controls.includes("tenant_isolation")
  ) {
    picks.push(controlCatalog.tenant_isolation);
  }
  if (
    answers.source_governance === "unknown_or_unmanaged" ||
    answers.source_governance === "web_crawled_sources" ||
    answers.source_governance === "user_uploaded_docs"
  ) {
    picks.push(controlCatalog.source_allowlisting);
  }
  if (retrievalExposureLevel === "high" || retrievalExposureLevel === "critical") {
    picks.push(controlCatalog.retrieval_boundaries, controlCatalog.data_minimization);
  }
  if (!answers.retrieval_quality_controls.includes("citations_required")) {
    picks.push(controlCatalog.citation_requirements);
  }
  if (!answers.retrieval_quality_controls.includes("answer_abstention")) {
    picks.push(controlCatalog.answer_abstention);
  }
  if (!answers.prompt_injection_controls.includes("prompt_injection_testing")) {
    picks.push(controlCatalog.prompt_injection_testing);
  }
  if (!answers.prompt_injection_controls.includes("retrieved_content_sandboxing")) {
    picks.push(controlCatalog.retrieved_content_sandboxing);
  }
  if (answers.logging_monitoring === "no_logging" || answers.logging_monitoring === "limited_usage_logging" || answers.logging_monitoring === "not_sure") {
    picks.push(controlCatalog.logging_monitoring);
  }
  if (answers.business_impact === "mission_critical" || answers.business_impact === "compliance_or_legal_workflow") {
    picks.push(controlCatalog.human_review);
  }
  if (
    answers.data_sources.some((entry) =>
      ["regulated_data", "financial_docs", "health_or_patient_docs", "legal_docs", "policy_or_hr_docs"].includes(entry),
    )
  ) {
    picks.push(controlCatalog.compliance_review);
  }
  if (accessControlLevel === "absent" || governanceMaturity === "absent") {
    picks.push(controlCatalog.document_level_permissions, controlCatalog.logging_monitoring);
  }
  return uniqueByCategory(
    picks.length ? picks : [controlCatalog.retrieval_boundaries, controlCatalog.citation_requirements, controlCatalog.logging_monitoring],
  );
}

function generateRagRiskId() {
  return `rag-${1001 + ragRiskSubmissions.length}`;
}

function computeRagRiskResult(answers, ragRiskId = generateRagRiskId()) {
  const ragRiskScore = computeRagRiskScore(answers);
  const ragRiskTier = deriveRagRiskTier(ragRiskScore);
  const retrievalExposureLevel = computeExposureLevel(answers);
  const accessControlLevel = computeAccessControlLevel(answers);
  const governanceMaturity = computeGovernanceMaturity(answers);
  const priority = derivePriority(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel, governanceMaturity);
  const recommendedService = deriveRecommendedService(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel);
  const secondaryService = deriveSecondaryService(answers);
  const topRagRisks = buildTopRagRisks(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel, governanceMaturity);
  const topRecommendedControls = buildTopRecommendedControls(answers, retrievalExposureLevel, accessControlLevel, governanceMaturity);
  const params = new URLSearchParams({
    service: recommendedService,
    priority,
    source: "rag-risk-analyzer",
    rag_risk_id: ragRiskId,
    rag_risk_score: String(ragRiskScore),
    rag_risk_tier: ragRiskTier,
    retrieval_exposure_level: retrievalExposureLevel,
    access_control_level: accessControlLevel,
    governance_maturity: governanceMaturity,
  });
  return {
    status: "rag-risk-complete",
    rag_risk_id: ragRiskId,
    rag_risk_score: ragRiskScore,
    rag_risk_tier: ragRiskTier,
    retrieval_exposure_level: retrievalExposureLevel,
    access_control_level: accessControlLevel,
    governance_maturity: governanceMaturity,
    priority,
    recommended_service: recommendedService,
    secondary_service: secondaryService || undefined,
    top_rag_risks: topRagRisks.map((entry) => ({ ...entry })),
    top_recommended_controls: topRecommendedControls.map((entry) => ({ ...entry })),
    next_route: `/enter?${params.toString()}`,
  };
}

function upsertRagRiskSubmission(submission) {
  const index = ragRiskSubmissions.findIndex((entry) => entry.rag_risk_id === submission.rag_risk_id);
  if (index >= 0) {
    ragRiskSubmissions[index] = { ...ragRiskSubmissions[index], ...submission };
    return ragRiskSubmissions[index];
  }
  ragRiskSubmissions.unshift(submission);
  return submission;
}

function recordRagRiskSubmission(answers, result) {
  return upsertRagRiskSubmission({
    rag_risk_id: result.rag_risk_id,
    created_at: new Date().toISOString(),
    source_route: answers.source_route,
    rag_system_type: answers.rag_system_type,
    deployment_context: answers.deployment_context,
    data_sources: [...answers.data_sources],
    retrieval_scope: answers.retrieval_scope,
    access_controls: [...answers.access_controls],
    source_governance: answers.source_governance,
    retrieval_quality_controls: [...answers.retrieval_quality_controls],
    prompt_injection_controls: [...answers.prompt_injection_controls],
    logging_monitoring: answers.logging_monitoring,
    business_impact: answers.business_impact,
    timeline: answers.timeline,
    rag_risk_score: result.rag_risk_score,
    rag_risk_tier: result.rag_risk_tier,
    retrieval_exposure_level: result.retrieval_exposure_level,
    access_control_level: result.access_control_level,
    governance_maturity: result.governance_maturity,
    priority: result.priority,
    recommended_service: result.recommended_service,
    secondary_service: result.secondary_service || null,
    top_rag_risks: result.top_rag_risks.map((entry) => ({ ...entry })),
    top_recommended_controls: result.top_recommended_controls.map((entry) => ({ ...entry })),
    next_route: result.next_route,
    engagement_id: null,
    status: "rag-risk-complete",
  });
}

function attachEngagementToRagRisk(details = {}) {
  const ragRiskId = normalizeText(details.rag_risk_id || details.ragRiskId);
  if (!ragRiskId) {
    return null;
  }
  const existing = ragRiskSubmissions.find((entry) => entry.rag_risk_id === ragRiskId);
  const base =
    existing ||
    {
      rag_risk_id: ragRiskId,
      created_at: details.created_at || new Date().toISOString(),
      source_route: details.source || "rag-risk-analyzer",
      rag_system_type: "",
      deployment_context: "",
      data_sources: [],
      retrieval_scope: "",
      access_controls: [],
      source_governance: "",
      retrieval_quality_controls: [],
      prompt_injection_controls: [],
      logging_monitoring: "",
      business_impact: "",
      timeline: "",
      rag_risk_score: Number.isFinite(Number(details.rag_risk_score)) ? Number(details.rag_risk_score) : 0,
      rag_risk_tier: normalizeText(details.rag_risk_tier) || "medium",
      retrieval_exposure_level: normalizeText(details.retrieval_exposure_level) || "medium",
      access_control_level: normalizeText(details.access_control_level) || "weak",
      governance_maturity: normalizeText(details.governance_maturity) || "weak",
      priority: normalizeText(details.priority) || "low",
      recommended_service: normalizeText(details.recommended_service || details.recommendedService) || "rag_governance_review",
      secondary_service: normalizeText(details.secondary_service || details.secondaryService) || null,
      top_rag_risks: Array.isArray(details.top_rag_risks) ? details.top_rag_risks : [],
      top_recommended_controls: Array.isArray(details.top_recommended_controls) ? details.top_recommended_controls : [],
      next_route: "",
      status: "rag-risk-complete",
    };
  base.engagement_id = normalizeText(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.rag_risk_score = Number.isFinite(Number(details.rag_risk_score)) ? Number(details.rag_risk_score) : base.rag_risk_score || 0;
  base.rag_risk_tier = normalizeText(details.rag_risk_tier) || base.rag_risk_tier || "medium";
  base.retrieval_exposure_level = normalizeText(details.retrieval_exposure_level) || base.retrieval_exposure_level || "medium";
  base.access_control_level = normalizeText(details.access_control_level) || base.access_control_level || "weak";
  base.governance_maturity = normalizeText(details.governance_maturity) || base.governance_maturity || "weak";
  base.priority = normalizeText(details.priority) || base.priority || "low";
  base.recommended_service = normalizeText(details.recommended_service || details.recommendedService) || base.recommended_service || "rag_governance_review";
  base.secondary_service = normalizeText(details.secondary_service || details.secondaryService) || base.secondary_service || null;
  base.status = normalizeText(details.status) || "intake-received";
  if (Array.isArray(details.top_rag_risks) && details.top_rag_risks.length) {
    base.top_rag_risks = details.top_rag_risks;
  }
  if (Array.isArray(details.top_recommended_controls) && details.top_recommended_controls.length) {
    base.top_recommended_controls = details.top_recommended_controls;
  }
  return upsertRagRiskSubmission(base);
}

function listRagRiskQueue(engagements = []) {
  const queue = [];
  for (const submission of ragRiskSubmissions) {
    const linkedEngagement = engagements.find((entry) => entry.ragRiskId && entry.ragRiskId === submission.rag_risk_id);
    queue.push({
      rag_risk_id: submission.rag_risk_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      rag_risk_score: submission.rag_risk_score,
      rag_risk_tier: submission.rag_risk_tier,
      retrieval_exposure_level: submission.retrieval_exposure_level,
      access_control_level: submission.access_control_level,
      governance_maturity: submission.governance_maturity,
      priority: submission.priority,
      recommended_service: submission.recommended_service,
      secondary_service: submission.secondary_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at,
    });
  }
  for (const engagement of engagements) {
    if (!engagement.ragRiskId) continue;
    if (queue.some((entry) => entry.engagement_id === engagement.id)) continue;
    queue.push({
      rag_risk_id: engagement.ragRiskId,
      engagement_id: engagement.id,
      rag_risk_score: engagement.ragRiskScore || 0,
      rag_risk_tier: engagement.ragRiskTier || "medium",
      retrieval_exposure_level: engagement.retrievalExposureLevel || "medium",
      access_control_level: engagement.accessControlLevel || "weak",
      governance_maturity: engagement.governanceMaturity || "weak",
      priority: engagement.priority || "low",
      recommended_service: engagement.recommendedService || "rag_governance_review",
      secondary_service: engagement.secondaryService || null,
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null,
    });
  }
  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}

module.exports = {
  ragRiskMarketplaceModule,
  ragRiskSubmissions,
  normalizeRagRiskAnswers,
  computeRagRiskResult,
  recordRagRiskSubmission,
  attachEngagementToRagRisk,
  listRagRiskQueue,
};
