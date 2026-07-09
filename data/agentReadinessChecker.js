const agentReadinessMarketplaceModule = {
  module_id: "msh-ai-agent-readiness-checker",
  service_slug: "ai_agent_readiness_checker",
  name: "AI Agent Readiness Checker",
  category: "AI Agents",
  public_service_route: "/apps/ai-agent-readiness-checker",
  operator_route: "/operator/agent-readiness",
  description: "Free advisory diagnostic that scores whether an AI agent idea is ready to build, how complex it is, and what controls are required before deployment.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "AI Agent Build / Agent Security Review",
  required_inputs: [
    "agent_goal",
    "agent_autonomy_level",
    "tool_connections",
    "data_access",
    "human_review",
    "deployment_context",
    "workflow_clarity",
    "success_metric",
    "timeline",
  ],
  delivery_outputs: [
    "readiness_score",
    "readiness_tier",
    "build_complexity",
    "safety_level",
    "top_build_requirements",
    "top_risk_controls",
    "recommended_service",
    "intake_route",
  ],
  status: "active",
};

const allowedAgentGoals = new Set([
  "customer_support_agent",
  "sales_or_lead_agent",
  "research_agent",
  "operations_agent",
  "inbox_triage_agent",
  "meeting_prep_agent",
  "crm_agent",
  "reporting_agent",
  "content_agent",
  "security_or_compliance_agent",
  "custom_agent",
  "not_sure",
]);

const allowedAutonomyLevels = new Set([
  "answers_only",
  "drafts_recommendations",
  "takes_low_risk_actions",
  "takes_external_actions",
  "fully_autonomous",
  "not_sure",
]);

const allowedToolConnections = new Set([
  "no_tools",
  "email",
  "calendar",
  "crm",
  "database",
  "file_storage",
  "project_management",
  "slack_or_teams",
  "payments",
  "web_search",
  "browser_or_scraper",
  "code_execution",
  "workflow_automation",
  "not_sure",
]);

const allowedDataAccess = new Set([
  "public_content",
  "internal_docs",
  "customer_data",
  "sales_data",
  "financial_data",
  "health_data",
  "legal_data",
  "credentials_or_secrets",
  "regulated_data",
  "not_sure",
]);

const allowedHumanReview = new Set([
  "every_action",
  "sensitive_actions_only",
  "periodic_review",
  "no_review",
  "not_sure",
]);

const allowedDeploymentContexts = new Set([
  "internal_only",
  "customer_facing",
  "public_website",
  "employee_copilot",
  "connected_to_business_tools",
  "not_sure",
]);

const allowedWorkflowClarity = new Set([
  "clearly_documented",
  "partially_documented",
  "tribal_knowledge",
  "not_documented",
  "not_sure",
]);

const allowedSuccessMetrics = new Set([
  "time_saved",
  "revenue_generated",
  "response_quality",
  "error_reduction",
  "faster_research",
  "better_follow_up",
  "compliance_or_risk_reduction",
  "not_sure",
]);

const allowedTimeline = new Set([
  "this_week",
  "this_month",
  "this_quarter",
  "exploring",
]);

const requirementCatalog = {
  workflow_mapping: {
    title: "Map the workflow before building",
    category: "workflow_mapping",
    description: "Document the exact triggers, steps, decisions, and handoffs the agent should follow.",
    why_it_matters: "Agent builds fail when the operating workflow exists only in tribal knowledge.",
  },
  tool_integration_plan: {
    title: "Define the tool integration plan",
    category: "tool_integration_plan",
    description: "List each system the agent should read from or write to and define the minimum required access.",
    why_it_matters: "Clear integration scope prevents connector sprawl and unsafe downstream behavior.",
  },
  permissions_model: {
    title: "Define the agent action boundary",
    category: "permissions_model",
    description: "Set explicit limits on which records, actions, and state changes the agent can perform.",
    why_it_matters: "Permission boundaries reduce accidental data exposure and unsafe actions.",
  },
  data_access_design: {
    title: "Design the data access layer",
    category: "data_access_design",
    description: "Separate public, internal, customer, and regulated data access before any tool execution path is enabled.",
    why_it_matters: "Data-access design determines whether the build can operate safely in production contexts.",
  },
  human_approval_flow: {
    title: "Add a human approval flow",
    category: "human_approval_flow",
    description: "Insert approval checkpoints for sensitive actions, external messages, or record changes.",
    why_it_matters: "Approval gates are often the difference between a safe copilot and an unsafe agent.",
  },
  evaluation_plan: {
    title: "Define the success evaluation plan",
    category: "evaluation_plan",
    description: "Choose measurable acceptance criteria tied to the stated success metric.",
    why_it_matters: "Without evaluation, the team cannot tell whether the agent actually helps or just creates noise.",
  },
  logging_monitoring: {
    title: "Instrument logging and monitoring",
    category: "logging_monitoring",
    description: "Log prompts, decisions, tool calls, approvals, and failure states for operator review.",
    why_it_matters: "Operational visibility is required for troubleshooting and safe governance.",
  },
  fallback_process: {
    title: "Design the fallback process",
    category: "fallback_process",
    description: "Define what happens when the agent is uncertain, blocked, or should hand work back to a person.",
    why_it_matters: "Fallback design prevents silent failures and brittle automation paths.",
  },
  deployment_plan: {
    title: "Set the deployment plan",
    category: "deployment_plan",
    description: "Choose the rollout sequence, sandbox scope, and initial production boundaries before launch.",
    why_it_matters: "Safe deployment sequencing reduces launch risk for customer-facing or tool-connected agents.",
  },
  maintenance_plan: {
    title: "Plan post-launch maintenance",
    category: "maintenance_plan",
    description: "Define who owns prompt updates, runbook changes, connector drift, and ongoing quality review.",
    why_it_matters: "AI agents degrade over time if nobody owns their operating model after launch.",
  },
};

const riskControlCatalog = {
  human_approval: {
    title: "Human approval for sensitive actions",
    category: "human_approval",
    description: "The agent may perform or recommend actions that affect customers, systems, or business records.",
    recommended_control: "Require human approval before sending messages, modifying records, or triggering external workflow actions.",
  },
  tool_permission_boundaries: {
    title: "Restrict tool permission boundaries",
    category: "tool_permission_boundaries",
    description: "The idea depends on connected tools that could be over-scoped during early delivery.",
    recommended_control: "Use least-privilege credentials and narrow tool permissions to the smallest required action set.",
  },
  data_minimization: {
    title: "Minimize sensitive data exposure",
    category: "data_minimization",
    description: "The build touches internal, customer, or regulated data that should not flow through every prompt or tool path.",
    recommended_control: "Limit prompts and outputs to minimum-necessary data and separate regulated data from general flows.",
  },
  prompt_injection_testing: {
    title: "Test prompt injection paths",
    category: "prompt_injection_testing",
    description: "The deployment context or autonomy model creates exposure to hostile or untrusted instructions.",
    recommended_control: "Run prompt injection testing before launch, especially for public, customer-facing, or tool-connected agents.",
  },
  audit_logging: {
    title: "Add audit logging",
    category: "audit_logging",
    description: "Higher-risk agents need a record of prompts, actions, approvals, and failures for operator review.",
    recommended_control: "Log prompts, tool invocations, approvals, and state transitions in a reviewable audit trail.",
  },
  access_control: {
    title: "Harden access control",
    category: "access_control",
    description: "The workflow appears to involve sensitive systems, privileged records, or internal-only access paths.",
    recommended_control: "Separate operator, reviewer, and runtime access with explicit permission boundaries and credential isolation.",
  },
  output_review: {
    title: "Review outputs before release",
    category: "output_review",
    description: "The agent may produce external-facing or business-critical outputs where silent mistakes are costly.",
    recommended_control: "Require output review for customer-facing, compliance-sensitive, or high-impact responses.",
  },
  rollback_plan: {
    title: "Create a rollback plan",
    category: "rollback_plan",
    description: "The build complexity and deployment context suggest failure modes that need a fast containment path.",
    recommended_control: "Define manual override, rollback, and disable procedures before enabling live workflows.",
  },
  compliance_review: {
    title: "Run compliance review",
    category: "compliance_review",
    description: "The idea intersects with regulated, financial, health, legal, or other policy-sensitive data.",
    recommended_control: "Review data obligations, retention, approval flows, and audit requirements before deployment.",
  },
  credential_isolation: {
    title: "Isolate credentials from the agent",
    category: "credential_isolation",
    description: "The design touches secrets, privileged tokens, or systems where raw credentials should not appear in prompts.",
    recommended_control: "Keep credentials outside prompts, scope secrets per tool, and isolate privileged execution paths.",
  },
};

const agentReadinessSubmissions = [];

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
  if (filtered.includes("no_tools")) {
    return ["no_tools"];
  }
  if (filtered.includes("not_sure")) {
    return ["not_sure"];
  }
  return [...new Set(filtered)];
}

function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

function normalizeAgentReadinessAnswers(payload = {}) {
  return {
    agent_goal: validateSingle(payload.agent_goal, allowedAgentGoals, "not_sure"),
    agent_autonomy_level: validateSingle(payload.agent_autonomy_level, allowedAutonomyLevels, "not_sure"),
    tool_connections: validateMulti(payload.tool_connections, allowedToolConnections, "not_sure"),
    data_access: validateMulti(payload.data_access, allowedDataAccess, "not_sure"),
    human_review: validateSingle(payload.human_review, allowedHumanReview, "not_sure"),
    deployment_context: validateSingle(payload.deployment_context, allowedDeploymentContexts, "not_sure"),
    workflow_clarity: validateSingle(payload.workflow_clarity, allowedWorkflowClarity, "not_sure"),
    success_metric: validateSingle(payload.success_metric, allowedSuccessMetrics, "not_sure"),
    timeline: validateSingle(payload.timeline, allowedTimeline, "exploring"),
    source_route: normalizeText(payload.source_route) || "/apps/ai-agent-readiness-checker",
  };
}

function computeReadinessScore(answers) {
  let score = 50;

  if (answers.workflow_clarity === "clearly_documented") score += 15;
  if (answers.workflow_clarity === "partially_documented") score += 8;
  if (answers.human_review === "every_action") score += 10;
  if (answers.human_review === "sensitive_actions_only") score += 8;
  if (answers.success_metric !== "not_sure") score += 8;
  if (answers.agent_autonomy_level === "answers_only") score += 8;
  if (answers.agent_autonomy_level === "drafts_recommendations") score += 5;
  if (answers.deployment_context === "internal_only") score += 5;

  if (answers.workflow_clarity === "tribal_knowledge") score -= 10;
  if (answers.workflow_clarity === "not_documented") score -= 20;
  if (answers.workflow_clarity === "not_sure") score -= 10;
  if (answers.human_review === "no_review") score -= 15;
  if (answers.human_review === "not_sure") score -= 10;
  if (answers.agent_autonomy_level === "takes_external_actions") score -= 10;
  if (answers.agent_autonomy_level === "fully_autonomous") score -= 20;
  if (answers.deployment_context === "customer_facing") score -= 10;
  if (answers.deployment_context === "public_website") score -= 15;
  if (answers.tool_connections.includes("payments")) score -= 10;
  if (answers.tool_connections.includes("code_execution")) score -= 10;
  if (answers.tool_connections.includes("browser_or_scraper")) score -= 10;
  if (answers.data_access.includes("credentials_or_secrets")) score -= 10;
  if (answers.data_access.includes("regulated_data")) score -= 10;
  if (answers.data_access.includes("financial_data")) score -= 8;
  if (answers.data_access.includes("health_data")) score -= 8;
  if (answers.data_access.includes("legal_data")) score -= 8;

  return clampScore(score);
}

function deriveReadinessTier(score) {
  if (score <= 34) return "not_ready";
  if (score <= 64) return "needs_design";
  if (score <= 84) return "build_ready_with_controls";
  return "build_ready";
}

function computeComplexityScore(answers) {
  let score = 0;
  const realTools = answers.tool_connections.filter((value) => value !== "no_tools" && value !== "not_sure");

  if (answers.agent_autonomy_level === "fully_autonomous") score += 20;
  if (answers.agent_autonomy_level === "takes_external_actions") score += 15;
  if (answers.agent_autonomy_level === "takes_low_risk_actions") score += 10;
  if (realTools.length >= 4) score += 10;
  if (answers.tool_connections.includes("payments")) score += 15;
  if (answers.tool_connections.includes("code_execution")) score += 15;
  if (answers.tool_connections.includes("database")) score += 10;
  if (answers.tool_connections.includes("workflow_automation")) score += 10;
  if (answers.data_access.includes("regulated_data")) score += 10;
  if (answers.data_access.includes("credentials_or_secrets")) score += 10;
  if (answers.deployment_context === "customer_facing") score += 10;
  if (answers.deployment_context === "public_website") score += 15;

  return score;
}

function deriveBuildComplexity(score) {
  if (score <= 24) return "simple";
  if (score <= 49) return "moderate";
  if (score <= 74) return "advanced";
  return "high_risk_complex";
}

function computeSafetyScore(answers) {
  let score = 0;

  if (answers.agent_autonomy_level === "fully_autonomous") score += 20;
  if (answers.agent_autonomy_level === "takes_external_actions") score += 15;
  if (answers.deployment_context === "public_website") score += 15;
  if (answers.deployment_context === "customer_facing") score += 10;
  if (answers.tool_connections.includes("payments")) score += 20;
  if (answers.tool_connections.includes("code_execution")) score += 20;
  if (answers.tool_connections.includes("email")) score += 15;
  if (answers.tool_connections.includes("database")) score += 15;
  if (answers.tool_connections.includes("file_storage")) score += 15;
  if (answers.data_access.includes("credentials_or_secrets")) score += 20;
  if (answers.data_access.includes("regulated_data")) score += 20;
  if (answers.data_access.includes("financial_data")) score += 15;
  if (answers.data_access.includes("health_data")) score += 15;
  if (answers.data_access.includes("legal_data")) score += 15;
  if (answers.human_review === "no_review") score += 15;
  if (answers.human_review === "not_sure") score += 10;

  return score;
}

function deriveSafetyLevel(score) {
  if (score <= 24) return "low";
  if (score <= 49) return "medium";
  if (score <= 74) return "high";
  return "critical";
}

function derivePriority(answers, readinessTier, buildComplexity, safetyLevel) {
  if (answers.timeline === "this_week") return "high";
  if (safetyLevel === "high" || safetyLevel === "critical") return "high";
  if (buildComplexity === "advanced" || buildComplexity === "high_risk_complex") return "high";
  if (readinessTier === "build_ready" || readinessTier === "build_ready_with_controls") return "medium";
  return "low";
}

function deriveRecommendedService(answers, readinessTier, buildComplexity, safetyLevel) {
  if (safetyLevel === "critical") return "ai_agent_security_review";
  if (buildComplexity === "high_risk_complex") return "ai_agent_security_review";
  if (
    answers.agent_goal === "operations_agent" ||
    answers.agent_goal === "reporting_agent" ||
    answers.tool_connections.includes("workflow_automation")
  ) {
    return "ai_automation_build";
  }
  if (readinessTier === "build_ready" || readinessTier === "build_ready_with_controls") {
    return "ai_agent_build";
  }
  return "ai_agent_blueprint_session";
}

function deriveSecondaryService(answers, recommendedService) {
  if (
    answers.data_access.some((entry) =>
      ["regulated_data", "credentials_or_secrets", "financial_data", "health_data", "legal_data"].includes(entry),
    ) ||
    answers.deployment_context === "public_website"
  ) {
    return "ai_security_audit";
  }
  if (
    answers.deployment_context === "public_website" ||
    answers.agent_autonomy_level === "takes_external_actions" ||
    answers.agent_autonomy_level === "fully_autonomous"
  ) {
    return "prompt_injection_review";
  }
  if (answers.tool_connections.includes("workflow_automation")) {
    return "ai_automation_build";
  }
  if (recommendedService !== "ai_agent_build") {
    return "ai_agent_build";
  }
  return null;
}

function pickUnique(items, limit = 3) {
  const seen = new Set();
  const results = [];
  for (const item of items) {
    if (!item || seen.has(item.category)) continue;
    seen.add(item.category);
    results.push(item);
    if (results.length >= limit) break;
  }
  return results;
}

function buildTopBuildRequirements(answers, readinessTier, buildComplexity) {
  const picks = [];

  if (answers.workflow_clarity !== "clearly_documented") {
    picks.push(requirementCatalog.workflow_mapping);
  }
  if (answers.tool_connections.some((entry) => !["no_tools", "not_sure"].includes(entry))) {
    picks.push(requirementCatalog.tool_integration_plan);
    picks.push(requirementCatalog.permissions_model);
  }
  if (
    answers.data_access.some((entry) =>
      ["customer_data", "sales_data", "financial_data", "health_data", "legal_data", "credentials_or_secrets", "regulated_data"].includes(entry),
    )
  ) {
    picks.push(requirementCatalog.data_access_design);
  }
  if (
    answers.human_review === "no_review" ||
    answers.human_review === "not_sure" ||
    ["takes_external_actions", "fully_autonomous"].includes(answers.agent_autonomy_level)
  ) {
    picks.push(requirementCatalog.human_approval_flow);
  }
  if (answers.success_metric === "not_sure") {
    picks.push(requirementCatalog.evaluation_plan);
  }
  if (buildComplexity === "advanced" || buildComplexity === "high_risk_complex") {
    picks.push(requirementCatalog.logging_monitoring);
    picks.push(requirementCatalog.fallback_process);
  }
  if (answers.deployment_context === "customer_facing" || answers.deployment_context === "public_website") {
    picks.push(requirementCatalog.deployment_plan);
  }
  if (readinessTier === "build_ready" || readinessTier === "build_ready_with_controls") {
    picks.push(requirementCatalog.maintenance_plan);
  }

  return pickUnique(
    picks.length
      ? picks
      : [requirementCatalog.workflow_mapping, requirementCatalog.evaluation_plan, requirementCatalog.deployment_plan],
  );
}

function buildTopRiskControls(answers, safetyLevel, buildComplexity) {
  const severity = safetyLevel;
  const picks = [];

  if (
    answers.human_review === "no_review" ||
    answers.human_review === "not_sure" ||
    ["takes_external_actions", "fully_autonomous"].includes(answers.agent_autonomy_level)
  ) {
    picks.push({ ...riskControlCatalog.human_approval, severity });
  }
  if (
    answers.tool_connections.some((entry) =>
      ["email", "calendar", "crm", "database", "file_storage", "payments", "browser_or_scraper", "code_execution", "workflow_automation"].includes(entry),
    )
  ) {
    picks.push({ ...riskControlCatalog.tool_permission_boundaries, severity });
  }
  if (
    answers.data_access.some((entry) =>
      ["customer_data", "sales_data", "financial_data", "health_data", "legal_data", "regulated_data"].includes(entry),
    )
  ) {
    picks.push({ ...riskControlCatalog.data_minimization, severity });
  }
  if (
    answers.deployment_context === "public_website" ||
    answers.agent_autonomy_level === "takes_external_actions" ||
    answers.agent_autonomy_level === "fully_autonomous"
  ) {
    picks.push({ ...riskControlCatalog.prompt_injection_testing, severity });
  }
  if (buildComplexity === "advanced" || buildComplexity === "high_risk_complex" || safetyLevel === "high" || safetyLevel === "critical") {
    picks.push({ ...riskControlCatalog.audit_logging, severity });
    picks.push({ ...riskControlCatalog.rollback_plan, severity });
  }
  if (
    answers.data_access.includes("credentials_or_secrets") ||
    answers.tool_connections.includes("payments") ||
    answers.tool_connections.includes("database")
  ) {
    picks.push({ ...riskControlCatalog.access_control, severity });
  }
  if (answers.deployment_context === "customer_facing" || answers.deployment_context === "public_website") {
    picks.push({ ...riskControlCatalog.output_review, severity });
  }
  if (
    answers.data_access.some((entry) =>
      ["regulated_data", "financial_data", "health_data", "legal_data"].includes(entry),
    )
  ) {
    picks.push({ ...riskControlCatalog.compliance_review, severity });
  }
  if (answers.data_access.includes("credentials_or_secrets")) {
    picks.push({ ...riskControlCatalog.credential_isolation, severity });
  }

  return pickUnique(
    picks.length
      ? picks
      : [
          { ...riskControlCatalog.human_approval, severity: "medium" },
          { ...riskControlCatalog.audit_logging, severity: "medium" },
          { ...riskControlCatalog.rollback_plan, severity: "medium" },
        ],
  );
}

function generateAgentCheckId() {
  return `agent-${1001 + agentReadinessSubmissions.length}`;
}

function computeAgentReadinessResult(answers, agentCheckId = generateAgentCheckId()) {
  const readinessScore = computeReadinessScore(answers);
  const readinessTier = deriveReadinessTier(readinessScore);
  const buildComplexity = deriveBuildComplexity(computeComplexityScore(answers));
  const safetyLevel = deriveSafetyLevel(computeSafetyScore(answers));
  const priority = derivePriority(answers, readinessTier, buildComplexity, safetyLevel);
  const recommendedService = deriveRecommendedService(answers, readinessTier, buildComplexity, safetyLevel);
  const secondaryService = deriveSecondaryService(answers, recommendedService);
  const topBuildRequirements = buildTopBuildRequirements(answers, readinessTier, buildComplexity);
  const topRiskControls = buildTopRiskControls(answers, safetyLevel, buildComplexity);

  const params = new URLSearchParams({
    service: recommendedService,
    priority,
    source: "agent-readiness-checker",
    agent_check_id: agentCheckId,
    readiness_score: String(readinessScore),
    readiness_tier: readinessTier,
    build_complexity: buildComplexity,
    safety_level: safetyLevel,
  });

  return {
    status: "agent-readiness-complete",
    agent_check_id: agentCheckId,
    readiness_score: readinessScore,
    readiness_tier: readinessTier,
    build_complexity: buildComplexity,
    safety_level: safetyLevel,
    priority,
    recommended_service: recommendedService,
    secondary_service: secondaryService || undefined,
    top_build_requirements: topBuildRequirements.map((entry) => ({ ...entry })),
    top_risk_controls: topRiskControls.map((entry) => ({ ...entry })),
    next_route: `/enter?${params.toString()}`,
  };
}

function upsertAgentReadinessSubmission(submission) {
  const index = agentReadinessSubmissions.findIndex((entry) => entry.agent_check_id === submission.agent_check_id);
  if (index >= 0) {
    agentReadinessSubmissions[index] = { ...agentReadinessSubmissions[index], ...submission };
    return agentReadinessSubmissions[index];
  }
  agentReadinessSubmissions.unshift(submission);
  return submission;
}

function recordAgentReadinessSubmission(answers, result) {
  return upsertAgentReadinessSubmission({
    agent_check_id: result.agent_check_id,
    created_at: new Date().toISOString(),
    source_route: answers.source_route,
    agent_goal: answers.agent_goal,
    agent_autonomy_level: answers.agent_autonomy_level,
    tool_connections: [...answers.tool_connections],
    data_access: [...answers.data_access],
    human_review: answers.human_review,
    deployment_context: answers.deployment_context,
    workflow_clarity: answers.workflow_clarity,
    success_metric: answers.success_metric,
    timeline: answers.timeline,
    readiness_score: result.readiness_score,
    readiness_tier: result.readiness_tier,
    build_complexity: result.build_complexity,
    safety_level: result.safety_level,
    priority: result.priority,
    recommended_service: result.recommended_service,
    secondary_service: result.secondary_service || null,
    top_build_requirements: result.top_build_requirements.map((entry) => ({ ...entry })),
    top_risk_controls: result.top_risk_controls.map((entry) => ({ ...entry })),
    next_route: result.next_route,
    engagement_id: null,
    status: "agent-readiness-complete",
  });
}

function attachEngagementToAgentReadiness(details = {}) {
  const agentCheckId = normalizeText(details.agent_check_id || details.agentCheckId);
  if (!agentCheckId) {
    return null;
  }

  const existing = agentReadinessSubmissions.find((entry) => entry.agent_check_id === agentCheckId);
  const base =
    existing ||
    {
      agent_check_id: agentCheckId,
      created_at: details.created_at || new Date().toISOString(),
      source_route: details.source || "agent-readiness-checker",
      agent_goal: "",
      agent_autonomy_level: "",
      tool_connections: [],
      data_access: [],
      human_review: "",
      deployment_context: "",
      workflow_clarity: "",
      success_metric: "",
      timeline: "",
      readiness_score: Number.isFinite(Number(details.readiness_score)) ? Number(details.readiness_score) : 0,
      readiness_tier: normalizeText(details.readiness_tier) || "needs_design",
      build_complexity: normalizeText(details.build_complexity) || "moderate",
      safety_level: normalizeText(details.safety_level) || "medium",
      priority: normalizeText(details.priority) || "low",
      recommended_service: normalizeText(details.recommended_service || details.recommendedService) || "ai_agent_blueprint_session",
      secondary_service: normalizeText(details.secondary_service || details.secondaryService) || null,
      top_build_requirements: Array.isArray(details.top_build_requirements) ? details.top_build_requirements : [],
      top_risk_controls: Array.isArray(details.top_risk_controls) ? details.top_risk_controls : [],
      next_route: "",
      status: "agent-readiness-complete",
    };

  base.engagement_id = normalizeText(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.readiness_score = Number.isFinite(Number(details.readiness_score)) ? Number(details.readiness_score) : base.readiness_score || 0;
  base.readiness_tier = normalizeText(details.readiness_tier) || base.readiness_tier || "needs_design";
  base.build_complexity = normalizeText(details.build_complexity) || base.build_complexity || "moderate";
  base.safety_level = normalizeText(details.safety_level) || base.safety_level || "medium";
  base.priority = normalizeText(details.priority) || base.priority || "low";
  base.recommended_service =
    normalizeText(details.recommended_service || details.recommendedService) || base.recommended_service || "ai_agent_blueprint_session";
  base.secondary_service =
    normalizeText(details.secondary_service || details.secondaryService) || base.secondary_service || null;
  base.status = normalizeText(details.status) || "intake-received";
  if (Array.isArray(details.top_build_requirements) && details.top_build_requirements.length) {
    base.top_build_requirements = details.top_build_requirements;
  }
  if (Array.isArray(details.top_risk_controls) && details.top_risk_controls.length) {
    base.top_risk_controls = details.top_risk_controls;
  }

  return upsertAgentReadinessSubmission(base);
}

function listAgentReadinessQueue(engagements = []) {
  const queue = [];

  for (const submission of agentReadinessSubmissions) {
    const linkedEngagement = engagements.find((entry) => entry.agentCheckId && entry.agentCheckId === submission.agent_check_id);
    queue.push({
      agent_check_id: submission.agent_check_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      readiness_score: submission.readiness_score,
      readiness_tier: submission.readiness_tier,
      build_complexity: submission.build_complexity,
      safety_level: submission.safety_level,
      priority: submission.priority,
      recommended_service: submission.recommended_service,
      secondary_service: submission.secondary_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at,
    });
  }

  for (const engagement of engagements) {
    if (!engagement.agentCheckId) continue;
    if (queue.some((entry) => entry.engagement_id === engagement.id)) continue;
    queue.push({
      agent_check_id: engagement.agentCheckId,
      engagement_id: engagement.id,
      readiness_score: engagement.readinessScore || 0,
      readiness_tier: engagement.readinessTier || "needs_design",
      build_complexity: engagement.buildComplexity || "moderate",
      safety_level: engagement.safetyLevel || "medium",
      priority: engagement.priority || "low",
      recommended_service: engagement.recommendedService || "ai_agent_blueprint_session",
      secondary_service: engagement.secondaryService || null,
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null,
    });
  }

  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}

module.exports = {
  agentReadinessMarketplaceModule,
  agentReadinessSubmissions,
  normalizeAgentReadinessAnswers,
  computeAgentReadinessResult,
  recordAgentReadinessSubmission,
  attachEngagementToAgentReadiness,
  listAgentReadinessQueue,
};
