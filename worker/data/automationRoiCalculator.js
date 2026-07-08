const automationRoiMarketplaceModule = {
  module_id: "msh-automation-roi-calculator",
  service_slug: "automation_roi_calculator",
  name: "Automation ROI Calculator",
  category: "AI Automation",
  public_service_route: "/apps/automation-roi-calculator",
  operator_route: "/operator/automation-roi",
  description: "Free advisory calculator that estimates time savings, cost savings, automation complexity, and the recommended automation path for repetitive workflows.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "AI Automation Build / Automation Maintenance",
  required_inputs: [
    "workflow_type",
    "current_process",
    "weekly_volume",
    "time_per_item_minutes",
    "team_hourly_cost",
    "error_rate",
    "tools_involved",
    "ai_needed",
    "risk_sensitivity",
    "timeline",
  ],
  delivery_outputs: [
    "roi_score",
    "roi_tier",
    "estimated_monthly_savings",
    "estimated_annual_savings",
    "hours_saved_per_month",
    "automation_complexity",
    "top_automation_opportunities",
    "top_implementation_requirements",
    "recommended_service",
    "intake_route",
  ],
  status: "active",
};

const allowedWorkflowType = new Set([
  "lead_capture_followup",
  "customer_support",
  "reporting_dashboard",
  "document_processing",
  "data_entry",
  "crm_updates",
  "invoice_or_billing",
  "appointment_scheduling",
  "email_triage",
  "social_content_ops",
  "sales_prospecting",
  "security_or_compliance_process",
  "internal_operations",
  "custom_workflow",
  "not_sure",
]);

const allowedCurrentProcess = new Set([
  "fully_manual",
  "spreadsheets_and_email",
  "partially_automated",
  "scattered_tools",
  "legacy_system",
  "not_sure",
]);

const allowedWeeklyVolume = new Set([
  "under_25",
  "25_100",
  "100_500",
  "500_2000",
  "2000_plus",
  "not_sure",
]);

const allowedTimePerItem = new Set([
  "under_5",
  "5_15",
  "15_30",
  "30_60",
  "60_plus",
  "not_sure",
]);

const allowedHourlyCost = new Set([
  "under_25",
  "25_50",
  "50_100",
  "100_200",
  "200_plus",
  "not_sure",
]);

const allowedErrorRate = new Set([
  "low_under_2_percent",
  "moderate_2_5_percent",
  "high_5_10_percent",
  "severe_over_10_percent",
  "not_sure",
]);

const allowedTools = new Set([
  "email",
  "calendar",
  "crm",
  "spreadsheet",
  "database",
  "file_storage",
  "slack_or_teams",
  "project_management",
  "payments_or_invoicing",
  "forms",
  "website",
  "ai_chatbot",
  "n8n_make_zapier",
  "custom_api",
  "not_sure",
]);

const allowedAiNeeded = new Set([
  "no_rules_based_is_enough",
  "maybe",
  "yes_text_or_email_generation",
  "yes_document_understanding",
  "yes_decision_support",
  "yes_agentic_workflow",
  "not_sure",
]);

const allowedRiskSensitivity = new Set([
  "low_internal_only",
  "medium_business_data",
  "high_customer_data",
  "regulated_or_financial_data",
  "credentials_or_admin_actions",
  "not_sure",
]);

const allowedTimeline = new Set([
  "this_week",
  "this_month",
  "this_quarter",
  "exploring",
]);

const weeklyVolumeMap = {
  under_25: 15,
  "25_100": 60,
  "100_500": 250,
  "500_2000": 1000,
  "2000_plus": 2500,
  not_sure: 60,
};

const timePerItemMap = {
  under_5: 3,
  "5_15": 10,
  "15_30": 22,
  "30_60": 45,
  "60_plus": 75,
  not_sure: 15,
};

const hourlyCostMap = {
  under_25: 20,
  "25_50": 40,
  "50_100": 75,
  "100_200": 150,
  "200_plus": 250,
  not_sure: 50,
};

const captureRateMap = {
  fully_manual: 0.65,
  spreadsheets_and_email: 0.55,
  partially_automated: 0.35,
  scattered_tools: 0.5,
  legacy_system: 0.4,
  not_sure: 0.4,
};

const errorAdjustmentMap = {
  low_under_2_percent: 0,
  moderate_2_5_percent: 0.1,
  high_5_10_percent: 0.2,
  severe_over_10_percent: 0.35,
  not_sure: 0.1,
};

const opportunityCatalog = {
  intake_and_routing: {
    title: "Automate intake and routing",
    category: "intake_and_routing",
    description: "Forms, websites, and internal handoffs can route work automatically instead of waiting for manual triage.",
    estimated_impact: "Reduce intake lag and remove repetitive assignment work.",
  },
  follow_up_automation: {
    title: "Automate follow-up workflows",
    category: "follow_up_automation",
    description: "Email and CRM follow-up patterns are strong candidates for templated automation with timing logic.",
    estimated_impact: "Save response time and improve follow-up consistency.",
  },
  reporting_automation: {
    title: "Automate recurring reporting",
    category: "reporting_automation",
    description: "Dashboard and report preparation can be triggered on schedule instead of built manually every cycle.",
    estimated_impact: "Reduce recurring reporting effort and improve visibility cadence.",
  },
  document_processing: {
    title: "Automate document processing",
    category: "document_processing",
    description: "Document intake, extraction, and routing can be standardized into repeatable workflows.",
    estimated_impact: "Lower manual review time and reduce processing backlog.",
  },
  crm_sync: {
    title: "Automate CRM synchronization",
    category: "crm_sync",
    description: "CRM updates are often spread across forms, email, and spreadsheets and can be synchronized automatically.",
    estimated_impact: "Reduce duplicate entry and improve data freshness.",
  },
  email_triage: {
    title: "Automate email triage",
    category: "email_triage",
    description: "Routine inbox sorting, tagging, and routing can be handled faster by workflow logic or light AI support.",
    estimated_impact: "Reduce manual inbox overhead and shorten routing time.",
  },
  scheduling: {
    title: "Automate scheduling workflows",
    category: "scheduling",
    description: "Appointment coordination and follow-up reminders can run without manual back-and-forth.",
    estimated_impact: "Save coordination time and reduce missed scheduling steps.",
  },
  billing_or_invoicing: {
    title: "Automate billing handoffs",
    category: "billing_or_invoicing",
    description: "Invoice, payment, and approval handoffs can be standardized with safer routing logic and validation.",
    estimated_impact: "Reduce billing overhead and improve cycle consistency.",
  },
  data_cleanup: {
    title: "Automate data cleanup",
    category: "data_cleanup",
    description: "Spreadsheets and scattered records can be normalized before they create downstream reporting errors.",
    estimated_impact: "Cut cleanup time and improve operational data quality.",
  },
  workflow_orchestration: {
    title: "Orchestrate multi-step workflows",
    category: "workflow_orchestration",
    description: "Connected tools and multi-step handoffs can be coordinated through a single workflow layer.",
    estimated_impact: "Reduce manual context-switching across systems.",
  },
  ai_assisted_decisioning: {
    title: "Add AI-assisted decisioning",
    category: "ai_assisted_decisioning",
    description: "Document understanding, classification, or recommendation support can shorten manual judgment tasks.",
    estimated_impact: "Reduce review effort and improve decision support speed.",
  },
  agentic_task_execution: {
    title: "Evaluate agentic task execution",
    category: "agentic_task_execution",
    description: "Higher-autonomy workflows may justify an agent build rather than simple workflow automation.",
    estimated_impact: "Expand automation scope when the process is well defined and controls are strong.",
  },
};

const requirementCatalog = {
  workflow_mapping: {
    title: "Map the current workflow",
    category: "workflow_mapping",
    description: "Document each step, handoff, exception, and approval in the current process.",
    why_it_matters: "Clear process mapping prevents automation gaps and duplicate work paths.",
  },
  integration_design: {
    title: "Design the integration layer",
    category: "integration_design",
    description: "Define how the workflow should move data between tools before any build starts.",
    why_it_matters: "Integration design is what determines whether the automation is reliable in production.",
  },
  data_validation: {
    title: "Add data validation rules",
    category: "data_validation",
    description: "Validate inputs, routing fields, and update conditions before records move across systems.",
    why_it_matters: "Validation reduces downstream cleanup and broken automations.",
  },
  error_handling: {
    title: "Define error handling",
    category: "error_handling",
    description: "Plan what should happen when an automation cannot complete, receives bad data, or hits a system exception.",
    why_it_matters: "Operational reliability depends on predictable failure behavior.",
  },
  human_approval: {
    title: "Insert human approval checkpoints",
    category: "human_approval",
    description: "Higher-risk updates, external messages, or financial steps should require human signoff.",
    why_it_matters: "Approval steps reduce the blast radius of incorrect automation behavior.",
  },
  access_control: {
    title: "Set access control boundaries",
    category: "access_control",
    description: "Constrain which tools, fields, and records the workflow can touch.",
    why_it_matters: "Access boundaries prevent accidental exposure or unsafe actions.",
  },
  logging_monitoring: {
    title: "Instrument logging and monitoring",
    category: "logging_monitoring",
    description: "Track run status, failures, approvals, and changed records for operator visibility.",
    why_it_matters: "Without visibility, teams cannot trust or improve production automation.",
  },
  testing_plan: {
    title: "Create a testing plan",
    category: "testing_plan",
    description: "Validate edge cases, bad inputs, duplicate triggers, and fallback paths before launch.",
    why_it_matters: "Testing reduces rework and fragile automation launches.",
  },
  fallback_process: {
    title: "Define the fallback process",
    category: "fallback_process",
    description: "Specify how work returns to humans when the automation is blocked or uncertain.",
    why_it_matters: "Fallback design prevents silent failures and stranded work items.",
  },
  maintenance_plan: {
    title: "Plan ongoing maintenance",
    category: "maintenance_plan",
    description: "Assign ownership for workflow updates, connector drift, rule changes, and operational review.",
    why_it_matters: "Automations degrade without clear ownership after launch.",
  },
  security_review: {
    title: "Run a security review",
    category: "security_review",
    description: "Review data sensitivity, approval boundaries, and privileged tool access before deployment.",
    why_it_matters: "Security review is required when automations handle customer, financial, or privileged data.",
  },
  roi_tracking: {
    title: "Track ROI after launch",
    category: "roi_tracking",
    description: "Measure time saved, volume processed, and error reduction against the baseline estimate.",
    why_it_matters: "ROI tracking proves whether the automation delivered the expected business value.",
  },
};

const automationRoiSubmissions = [];

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

function roundMoney(value) {
  return Math.round(Number(value) || 0);
}

function roundHours(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function normalizeAutomationRoiAnswers(payload = {}) {
  return {
    workflow_type: validateSingle(payload.workflow_type, allowedWorkflowType, "not_sure"),
    current_process: validateSingle(payload.current_process, allowedCurrentProcess, "not_sure"),
    weekly_volume: validateSingle(payload.weekly_volume, allowedWeeklyVolume, "not_sure"),
    time_per_item_minutes: validateSingle(payload.time_per_item_minutes, allowedTimePerItem, "not_sure"),
    team_hourly_cost: validateSingle(payload.team_hourly_cost, allowedHourlyCost, "not_sure"),
    error_rate: validateSingle(payload.error_rate, allowedErrorRate, "not_sure"),
    tools_involved: validateMulti(payload.tools_involved, allowedTools, "not_sure"),
    ai_needed: validateSingle(payload.ai_needed, allowedAiNeeded, "not_sure"),
    risk_sensitivity: validateSingle(payload.risk_sensitivity, allowedRiskSensitivity, "not_sure"),
    timeline: validateSingle(payload.timeline, allowedTimeline, "exploring"),
    source_route: normalizeText(payload.source_route) || "/apps/automation-roi-calculator",
  };
}

function computeSavings(answers) {
  const weeklyVolume = weeklyVolumeMap[answers.weekly_volume];
  const timePerItem = timePerItemMap[answers.time_per_item_minutes];
  const hourlyCost = hourlyCostMap[answers.team_hourly_cost];
  const captureRate = captureRateMap[answers.current_process];
  const weeklyHours = (weeklyVolume * timePerItem) / 60;
  const monthlyHours = weeklyHours * 4.33;
  const hoursSavedPerMonth = monthlyHours * captureRate;
  const baseMonthlySavings = hoursSavedPerMonth * hourlyCost;
  const adjustedMonthlySavings = baseMonthlySavings + baseMonthlySavings * errorAdjustmentMap[answers.error_rate];
  return {
    weekly_hours: weeklyHours,
    monthly_hours: monthlyHours,
    hours_saved_per_month: roundHours(hoursSavedPerMonth),
    estimated_monthly_savings: roundMoney(adjustedMonthlySavings),
    estimated_annual_savings: roundMoney(adjustedMonthlySavings * 12),
  };
}

function deriveRoiTier(score) {
  if (score <= 34) return "low";
  if (score <= 64) return "moderate";
  if (score <= 84) return "strong";
  return "exceptional";
}

function computeRoiScore(answers, estimatedMonthlySavings) {
  let score = 20;
  if (estimatedMonthlySavings >= 10000) score += 25;
  else if (estimatedMonthlySavings >= 5000) score += 20;
  else if (estimatedMonthlySavings >= 2500) score += 15;
  else if (estimatedMonthlySavings >= 1000) score += 10;
  else if (estimatedMonthlySavings >= 500) score += 5;
  if (answers.current_process === "fully_manual") score += 15;
  if (answers.current_process === "spreadsheets_and_email") score += 10;
  if (answers.current_process === "scattered_tools") score += 10;
  if (answers.weekly_volume === "500_2000" || answers.weekly_volume === "2000_plus") score += 10;
  if (answers.error_rate === "high_5_10_percent" || answers.error_rate === "severe_over_10_percent") score += 10;
  if (answers.tools_involved.includes("n8n_make_zapier")) score += 8;
  if (answers.tools_involved.includes("crm")) score += 8;
  if (answers.tools_involved.includes("forms")) score += 8;
  if (answers.tools_involved.includes("spreadsheet")) score += 8;
  if (answers.ai_needed === "yes_text_or_email_generation") score += 8;
  if (answers.ai_needed === "yes_document_understanding") score += 8;
  if (answers.ai_needed === "yes_decision_support") score += 8;
  if (answers.ai_needed === "yes_agentic_workflow") score += 10;
  if (answers.risk_sensitivity === "credentials_or_admin_actions") score -= 10;
  if (answers.risk_sensitivity === "regulated_or_financial_data") score -= 8;
  if (answers.timeline === "exploring") score -= 5;
  return clampScore(score);
}

function computeComplexityScore(answers) {
  let score = 0;
  const realTools = answers.tools_involved.filter((entry) => entry !== "not_sure");
  if (realTools.length >= 4) score += 10;
  if (answers.tools_involved.includes("custom_api")) score += 10;
  if (answers.tools_involved.includes("database")) score += 10;
  if (answers.tools_involved.includes("payments_or_invoicing")) score += 10;
  if (answers.tools_involved.includes("ai_chatbot")) score += 10;
  if (answers.ai_needed === "yes_document_understanding") score += 10;
  if (answers.ai_needed === "yes_decision_support") score += 10;
  if (answers.ai_needed === "yes_agentic_workflow") score += 15;
  if (answers.risk_sensitivity === "high_customer_data") score += 10;
  if (answers.risk_sensitivity === "regulated_or_financial_data") score += 15;
  if (answers.risk_sensitivity === "credentials_or_admin_actions") score += 20;
  if (answers.current_process === "legacy_system") score += 10;
  return score;
}

function deriveAutomationComplexity(score) {
  if (score <= 24) return "simple";
  if (score <= 49) return "moderate";
  if (score <= 74) return "advanced";
  return "high_risk_complex";
}

function derivePriority(answers, estimatedMonthlySavings, roiTier, automationComplexity) {
  if (answers.timeline === "this_week") return "high";
  if (estimatedMonthlySavings >= 5000) return "high";
  if (roiTier === "strong" || roiTier === "exceptional") return "high";
  if (automationComplexity === "advanced" || automationComplexity === "high_risk_complex") return "high";
  if (estimatedMonthlySavings >= 1000) return "medium";
  return "low";
}

function deriveRecommendedService(answers, roiTier, automationComplexity) {
  if (automationComplexity === "high_risk_complex") return "automation_blueprint_session";
  if (answers.risk_sensitivity === "credentials_or_admin_actions") return "automation_blueprint_session";
  if (answers.ai_needed === "yes_agentic_workflow") return "ai_agent_build";
  if (answers.ai_needed === "yes_decision_support") return "ai_automation_build";
  if (roiTier === "strong" || roiTier === "exceptional") return "ai_automation_build";
  if (roiTier === "moderate") return "automation_blueprint_session";
  return "workflow_optimization_review";
}

function deriveSecondaryService(answers, recommendedService) {
  if (
    answers.risk_sensitivity === "regulated_or_financial_data" ||
    answers.risk_sensitivity === "credentials_or_admin_actions"
  ) {
    return "ai_security_audit";
  }
  if (answers.ai_needed === "yes_agentic_workflow") {
    return "ai_agent_readiness_checker";
  }
  if (answers.tools_involved.includes("ai_chatbot")) {
    return "prompt_injection_review";
  }
  if (
    recommendedService !== "ai_agent_build" &&
    ["yes_text_or_email_generation", "yes_document_understanding", "yes_decision_support", "yes_agentic_workflow"].includes(answers.ai_needed)
  ) {
    return "ai_agent_build";
  }
  return null;
}

function pickUnique(items, limit = 3) {
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

function buildTopAutomationOpportunities(answers) {
  const picks = [];
  if (answers.workflow_type === "lead_capture_followup") {
    picks.push(opportunityCatalog.follow_up_automation, opportunityCatalog.intake_and_routing, opportunityCatalog.crm_sync);
  }
  if (answers.workflow_type === "customer_support") {
    picks.push(opportunityCatalog.email_triage, opportunityCatalog.follow_up_automation);
  }
  if (answers.workflow_type === "reporting_dashboard") {
    picks.push(opportunityCatalog.reporting_automation, opportunityCatalog.data_cleanup);
  }
  if (answers.workflow_type === "document_processing") {
    picks.push(opportunityCatalog.document_processing);
  }
  if (answers.workflow_type === "crm_updates") {
    picks.push(opportunityCatalog.crm_sync);
  }
  if (answers.workflow_type === "invoice_or_billing") {
    picks.push(opportunityCatalog.billing_or_invoicing);
  }
  if (answers.workflow_type === "appointment_scheduling") {
    picks.push(opportunityCatalog.scheduling);
  }
  if (answers.workflow_type === "email_triage") {
    picks.push(opportunityCatalog.email_triage);
  }
  if (answers.workflow_type === "security_or_compliance_process") {
    picks.push(opportunityCatalog.workflow_orchestration, opportunityCatalog.reporting_automation);
  }
  if (answers.workflow_type === "internal_operations") {
    picks.push(opportunityCatalog.workflow_orchestration, opportunityCatalog.data_cleanup);
  }
  if (answers.tools_involved.includes("forms") || answers.tools_involved.includes("website")) {
    picks.push(opportunityCatalog.intake_and_routing);
  }
  if (answers.tools_involved.includes("crm")) {
    picks.push(opportunityCatalog.crm_sync);
  }
  if (answers.tools_involved.includes("email")) {
    picks.push(opportunityCatalog.follow_up_automation, opportunityCatalog.email_triage);
  }
  if (answers.tools_involved.includes("spreadsheet")) {
    picks.push(opportunityCatalog.data_cleanup, opportunityCatalog.reporting_automation);
  }
  if (answers.tools_involved.includes("payments_or_invoicing")) {
    picks.push(opportunityCatalog.billing_or_invoicing);
  }
  if (answers.ai_needed === "yes_decision_support" || answers.ai_needed === "yes_document_understanding") {
    picks.push(opportunityCatalog.ai_assisted_decisioning);
  }
  if (answers.ai_needed === "yes_agentic_workflow") {
    picks.push(opportunityCatalog.agentic_task_execution);
  }
  return pickUnique(
    picks.length ? picks : [opportunityCatalog.workflow_orchestration, opportunityCatalog.follow_up_automation, opportunityCatalog.reporting_automation],
  );
}

function buildTopImplementationRequirements(answers, automationComplexity) {
  const picks = [];
  picks.push(requirementCatalog.workflow_mapping);
  if (answers.tools_involved.some((entry) => !["not_sure"].includes(entry))) {
    picks.push(requirementCatalog.integration_design, requirementCatalog.data_validation);
  }
  if (automationComplexity === "advanced" || automationComplexity === "high_risk_complex") {
    picks.push(requirementCatalog.error_handling, requirementCatalog.logging_monitoring, requirementCatalog.testing_plan);
  }
  if (
    answers.risk_sensitivity === "high_customer_data" ||
    answers.risk_sensitivity === "regulated_or_financial_data" ||
    answers.risk_sensitivity === "credentials_or_admin_actions"
  ) {
    picks.push(requirementCatalog.access_control, requirementCatalog.security_review);
  }
  if (answers.risk_sensitivity === "credentials_or_admin_actions" || answers.tools_involved.includes("payments_or_invoicing")) {
    picks.push(requirementCatalog.human_approval);
  }
  if (answers.current_process === "legacy_system" || answers.current_process === "scattered_tools") {
    picks.push(requirementCatalog.fallback_process);
  }
  if (answers.timeline !== "exploring") {
    picks.push(requirementCatalog.roi_tracking);
  }
  picks.push(requirementCatalog.maintenance_plan);
  return pickUnique(
    picks.length ? picks : [requirementCatalog.workflow_mapping, requirementCatalog.integration_design, requirementCatalog.roi_tracking],
  );
}

function generateAutomationRoiId() {
  return `auto-roi-${1001 + automationRoiSubmissions.length}`;
}

function computeAutomationRoiResult(answers, automationRoiId = generateAutomationRoiId()) {
  const savings = computeSavings(answers);
  const roiScore = computeRoiScore(answers, savings.estimated_monthly_savings);
  const roiTier = deriveRoiTier(roiScore);
  const automationComplexity = deriveAutomationComplexity(computeComplexityScore(answers));
  const priority = derivePriority(answers, savings.estimated_monthly_savings, roiTier, automationComplexity);
  const recommendedService = deriveRecommendedService(answers, roiTier, automationComplexity);
  const secondaryService = deriveSecondaryService(answers, recommendedService);
  const topAutomationOpportunities = buildTopAutomationOpportunities(answers);
  const topImplementationRequirements = buildTopImplementationRequirements(answers, automationComplexity);
  const params = new URLSearchParams({
    service: recommendedService,
    priority,
    source: "automation-roi-calculator",
    automation_roi_id: automationRoiId,
    roi_score: String(roiScore),
    roi_tier: roiTier,
    estimated_monthly_savings: String(savings.estimated_monthly_savings),
    estimated_annual_savings: String(savings.estimated_annual_savings),
    hours_saved_per_month: String(savings.hours_saved_per_month),
    automation_complexity: automationComplexity,
  });
  return {
    status: "automation-roi-complete",
    automation_roi_id: automationRoiId,
    roi_score: roiScore,
    roi_tier: roiTier,
    estimated_monthly_savings: savings.estimated_monthly_savings,
    estimated_annual_savings: savings.estimated_annual_savings,
    hours_saved_per_month: savings.hours_saved_per_month,
    automation_complexity: automationComplexity,
    priority,
    recommended_service: recommendedService,
    secondary_service: secondaryService || undefined,
    top_automation_opportunities: topAutomationOpportunities.map((entry) => ({ ...entry })),
    top_implementation_requirements: topImplementationRequirements.map((entry) => ({ ...entry })),
    next_route: `/enter?${params.toString()}`,
  };
}

function upsertAutomationRoiSubmission(submission) {
  const index = automationRoiSubmissions.findIndex((entry) => entry.automation_roi_id === submission.automation_roi_id);
  if (index >= 0) {
    automationRoiSubmissions[index] = { ...automationRoiSubmissions[index], ...submission };
    return automationRoiSubmissions[index];
  }
  automationRoiSubmissions.unshift(submission);
  return submission;
}

function recordAutomationRoiSubmission(answers, result) {
  return upsertAutomationRoiSubmission({
    automation_roi_id: result.automation_roi_id,
    created_at: new Date().toISOString(),
    source_route: answers.source_route,
    workflow_type: answers.workflow_type,
    current_process: answers.current_process,
    weekly_volume: answers.weekly_volume,
    time_per_item_minutes: answers.time_per_item_minutes,
    team_hourly_cost: answers.team_hourly_cost,
    error_rate: answers.error_rate,
    tools_involved: [...answers.tools_involved],
    ai_needed: answers.ai_needed,
    risk_sensitivity: answers.risk_sensitivity,
    timeline: answers.timeline,
    roi_score: result.roi_score,
    roi_tier: result.roi_tier,
    estimated_monthly_savings: result.estimated_monthly_savings,
    estimated_annual_savings: result.estimated_annual_savings,
    hours_saved_per_month: result.hours_saved_per_month,
    automation_complexity: result.automation_complexity,
    priority: result.priority,
    recommended_service: result.recommended_service,
    secondary_service: result.secondary_service || null,
    top_automation_opportunities: result.top_automation_opportunities.map((entry) => ({ ...entry })),
    top_implementation_requirements: result.top_implementation_requirements.map((entry) => ({ ...entry })),
    next_route: result.next_route,
    engagement_id: null,
    status: "automation-roi-complete",
  });
}

function attachEngagementToAutomationRoi(details = {}) {
  const automationRoiId = normalizeText(details.automation_roi_id || details.automationRoiId);
  if (!automationRoiId) {
    return null;
  }
  const existing = automationRoiSubmissions.find((entry) => entry.automation_roi_id === automationRoiId);
  const base =
    existing ||
    {
      automation_roi_id: automationRoiId,
      created_at: details.created_at || new Date().toISOString(),
      source_route: details.source || "automation-roi-calculator",
      workflow_type: "",
      current_process: "",
      weekly_volume: "",
      time_per_item_minutes: "",
      team_hourly_cost: "",
      error_rate: "",
      tools_involved: [],
      ai_needed: "",
      risk_sensitivity: "",
      timeline: "",
      roi_score: Number.isFinite(Number(details.roi_score)) ? Number(details.roi_score) : 0,
      roi_tier: normalizeText(details.roi_tier) || "moderate",
      estimated_monthly_savings: Number.isFinite(Number(details.estimated_monthly_savings)) ? Number(details.estimated_monthly_savings) : 0,
      estimated_annual_savings: Number.isFinite(Number(details.estimated_annual_savings)) ? Number(details.estimated_annual_savings) : 0,
      hours_saved_per_month: Number.isFinite(Number(details.hours_saved_per_month)) ? Number(details.hours_saved_per_month) : 0,
      automation_complexity: normalizeText(details.automation_complexity) || "moderate",
      priority: normalizeText(details.priority) || "low",
      recommended_service: normalizeText(details.recommended_service || details.recommendedService) || "workflow_optimization_review",
      secondary_service: normalizeText(details.secondary_service || details.secondaryService) || null,
      top_automation_opportunities: Array.isArray(details.top_automation_opportunities) ? details.top_automation_opportunities : [],
      top_implementation_requirements: Array.isArray(details.top_implementation_requirements) ? details.top_implementation_requirements : [],
      next_route: "",
      status: "automation-roi-complete",
    };
  base.engagement_id = normalizeText(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.roi_score = Number.isFinite(Number(details.roi_score)) ? Number(details.roi_score) : base.roi_score || 0;
  base.roi_tier = normalizeText(details.roi_tier) || base.roi_tier || "moderate";
  base.estimated_monthly_savings = Number.isFinite(Number(details.estimated_monthly_savings))
    ? Number(details.estimated_monthly_savings)
    : base.estimated_monthly_savings || 0;
  base.estimated_annual_savings = Number.isFinite(Number(details.estimated_annual_savings))
    ? Number(details.estimated_annual_savings)
    : base.estimated_annual_savings || 0;
  base.hours_saved_per_month = Number.isFinite(Number(details.hours_saved_per_month))
    ? Number(details.hours_saved_per_month)
    : base.hours_saved_per_month || 0;
  base.automation_complexity = normalizeText(details.automation_complexity) || base.automation_complexity || "moderate";
  base.priority = normalizeText(details.priority) || base.priority || "low";
  base.recommended_service = normalizeText(details.recommended_service || details.recommendedService) || base.recommended_service || "workflow_optimization_review";
  base.secondary_service = normalizeText(details.secondary_service || details.secondaryService) || base.secondary_service || null;
  base.status = normalizeText(details.status) || "intake-received";
  if (Array.isArray(details.top_automation_opportunities) && details.top_automation_opportunities.length) {
    base.top_automation_opportunities = details.top_automation_opportunities;
  }
  if (Array.isArray(details.top_implementation_requirements) && details.top_implementation_requirements.length) {
    base.top_implementation_requirements = details.top_implementation_requirements;
  }
  return upsertAutomationRoiSubmission(base);
}

function listAutomationRoiQueue(engagements = []) {
  const queue = [];
  for (const submission of automationRoiSubmissions) {
    const linkedEngagement = engagements.find((entry) => entry.automationRoiId && entry.automationRoiId === submission.automation_roi_id);
    queue.push({
      automation_roi_id: submission.automation_roi_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      roi_score: submission.roi_score,
      roi_tier: submission.roi_tier,
      estimated_monthly_savings: submission.estimated_monthly_savings,
      estimated_annual_savings: submission.estimated_annual_savings,
      hours_saved_per_month: submission.hours_saved_per_month,
      automation_complexity: submission.automation_complexity,
      priority: submission.priority,
      recommended_service: submission.recommended_service,
      secondary_service: submission.secondary_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at,
    });
  }
  for (const engagement of engagements) {
    if (!engagement.automationRoiId) continue;
    if (queue.some((entry) => entry.engagement_id === engagement.id)) continue;
    queue.push({
      automation_roi_id: engagement.automationRoiId,
      engagement_id: engagement.id,
      roi_score: engagement.roiScore || 0,
      roi_tier: engagement.roiTier || "moderate",
      estimated_monthly_savings: engagement.estimatedMonthlySavings || 0,
      estimated_annual_savings: engagement.estimatedAnnualSavings || 0,
      hours_saved_per_month: engagement.hoursSavedPerMonth || 0,
      automation_complexity: engagement.automationComplexity || "moderate",
      priority: engagement.priority || "low",
      recommended_service: engagement.recommendedService || "workflow_optimization_review",
      secondary_service: engagement.secondaryService || null,
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null,
    });
  }
  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}

export default {
  automationRoiMarketplaceModule,
  automationRoiSubmissions,
  normalizeAutomationRoiAnswers,
  computeAutomationRoiResult,
  recordAutomationRoiSubmission,
  attachEngagementToAutomationRoi,
  listAutomationRoiQueue,
};
