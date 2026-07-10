import {
  buildAgentNorthstarAlignment,
  type NorthstarAlignmentMetadata,
} from "../../msh-ops/agent/beaconAlignment";

const AI_AGENT_BUILDER_AGENT_ID = "AiAgentBuilderAgent";

export type AiAgentBuildInput = {
  source_type: string;
  source_reference_id?: string;
  package_name?: string;
  recommended_service: string;
  agent_goal: string;
  agent_autonomy_level: string;
  user_interaction_channel: string;
  tools_needed: string[];
  data_types: string[];
  output_modes: string[];
  human_approval_required: string;
  risk_signals: string[];
  memory_requirement: string;
  deployment_environment: string;
  volume_level: string;
  timeline: string;
  budget_band: string;
  diagnostic_context?: Record<string, unknown>;
  source_route?: string;
};

export type AiAgentBuildSubmission = AiAgentBuildInput & {
  ai_agent_build_id: string;
  created_at: string;
  agent_name: string;
  agent_category: string;
  target_user: string;
  business_problem: string;
  agent_mission: string;
  agent_role_definition: {
    role_name: string;
    primary_responsibility: string;
    decision_authority: string;
    allowed_actions: string[];
    prohibited_actions: string[];
    escalation_conditions: string[];
  };
  user_interaction_model: {
    primary_channel: string;
    interaction_style: string;
    user_inputs: string[];
    agent_outputs: string[];
    fallback_behavior: string;
  };
  task_scope: string[];
  out_of_scope_actions: string[];
  tool_boundary_model: {
    tools_allowed: string[];
    tools_prohibited: string[];
    read_only_tools: string[];
    draft_only_tools: string[];
    write_requires_approval: string[];
    no_credential_handling_rule: string;
  };
  permission_model: {
    default_permission_level: string;
    approval_required_for: string[];
    denied_operations: string[];
    operator_override_rules: string;
    audit_requirements: string[];
  };
  memory_policy: {
    memory_type: string;
    retained_fields: string[];
    excluded_fields: string[];
    retention_period: string;
    deletion_policy: string;
    user_visibility: string;
  };
  approval_gates: string[];
  safety_controls: string[];
  prompt_interface_spec: {
    system_instruction_summary: string;
    required_user_inputs: string[];
    response_format: string;
    refusal_conditions: string[];
    escalation_language: string;
    tone_style: string;
    deterministic_fields: string[];
  };
  data_handling_policy: {
    data_allowed: string[];
    data_restricted: string[];
    data_never_requested: string[];
    storage_rules: string;
    redaction_rules: string;
    access_review_note: string;
  };
  logging_telemetry_plan: {
    events_to_log: string[];
    fields_to_redact: string[];
    metrics_to_track: string[];
    alert_conditions: string[];
    operator_dashboard_fields: string[];
  };
  integration_plan: Array<{
    system: string;
    purpose: string;
    data_in: string;
    data_out: string;
    auth_or_access_note: string;
    risk_note: string;
  }>;
  deployment_plan: {
    recommended_environment: string;
    deployment_mode: string;
    required_runtime: string;
    access_control_model: string;
    rollout_steps: string[];
    rollback_plan: string;
  };
  testing_plan: string[];
  red_team_checks: string[];
  client_inputs_needed: string[];
  implementation_checklist: string[];
  maintenance_plan: {
    recommended_retainer: string;
    monitoring_frequency: string;
    update_triggers: string[];
    owner: string;
    monthly_tasks: string[];
  };
  estimated_effort: string;
  delivery_timeline: string;
  complexity_level: "basic" | "intermediate" | "advanced" | "enterprise";
  risk_level: "low" | "medium" | "high" | "critical";
  priority: "low" | "medium" | "high";
  recommended_next_step: string;
  next_route: string;
  engagement_id?: string;
  status: "ai-agent-build-spec-started" | "ai-agent-build-spec-complete" | "intake-received";
  northstar_alignment?: NorthstarAlignmentMetadata;
};

export const aiAgentBuilderMarketplaceModule = {
  module_id: "msh-ai-agent-builder-agent",
  service_slug: "ai_agent_builder_agent",
  name: "AI Agent Builder Agent",
  category: "Fulfillment / Agents",
  public_service_route: "/apps/ai-agent-builder",
  operator_route: "/operator/ai-agent-builds",
  description:
    "Deterministic advisory agent that converts AI agent opportunities into implementation-ready agent specs with roles, tools, permissions, approval gates, and safety controls.",
  revenue_type: "implementation_spec",
  base_price: 0,
  recommended_upsell: "AI Agent Build Sprint / AI Agent Governance Retainer",
  required_inputs: [
    "source_type",
    "agent_goal",
    "agent_autonomy_level",
    "user_interaction_channel",
    "tools_needed",
    "data_types",
    "output_modes",
    "human_approval_required",
    "risk_signals",
    "memory_requirement",
    "deployment_environment",
    "volume_level",
    "timeline",
    "budget_band",
  ],
  delivery_outputs: [
    "agent_role_definition",
    "user_interaction_model",
    "task_scope",
    "tool_boundary_model",
    "permission_model",
    "memory_policy",
    "approval_gates",
    "safety_controls",
    "prompt_interface_spec",
    "data_handling_policy",
    "logging_telemetry_plan",
    "integration_plan",
    "deployment_plan",
    "testing_plan",
    "red_team_checks",
    "implementation_checklist",
    "intake_route",
  ],
  status: "active",
};

const aiAgentBuildSubmissions: AiAgentBuildSubmission[] = [];

const AGENT_CATEGORY_MAP: Record<string, string> = {
  sales_assistant: "Sales Agent",
  intake_assistant: "Intake Agent",
  support_triage_agent: "Support Agent",
  research_assistant: "Research Agent",
  proposal_assistant: "Proposal Agent",
  document_analysis_agent: "Document Intelligence Agent",
  workflow_operator_agent: "Workflow Operator Agent",
  security_triage_agent: "Security Triage Agent",
  compliance_assistant: "Compliance Agent",
  knowledge_assistant: "Knowledge Assistant",
  coding_assistant: "Coding Agent",
  content_assistant: "Content Agent",
  meeting_prep_agent: "Meeting Prep Agent",
  not_sure: "General Purpose Business Agent",
};

const AGENT_NAME_MAP: Record<string, string> = {
  sales_assistant: "Sales Qualification Agent Spec",
  intake_assistant: "Client Intake Agent Spec",
  support_triage_agent: "Support Triage Agent Spec",
  research_assistant: "Research Assistant Agent Spec",
  proposal_assistant: "Proposal Assistant Agent Spec",
  document_analysis_agent: "Document Analysis Agent Spec",
  workflow_operator_agent: "Workflow Operator Agent Spec",
  security_triage_agent: "Security Triage Agent Spec",
  compliance_assistant: "Compliance Assistant Agent Spec",
  knowledge_assistant: "Knowledge Assistant Agent Spec",
  coding_assistant: "Coding Assistant Agent Spec",
  content_assistant: "Content Assistant Agent Spec",
  meeting_prep_agent: "Meeting Prep Agent Spec",
  not_sure: "AI Business Agent Build Spec",
};

const TARGET_USER_MAP: Record<string, string> = {
  sales_assistant: "sales operator, founder, or consultant",
  intake_assistant: "service operator or delivery manager",
  support_triage_agent: "support lead or customer success operator",
  research_assistant: "analyst, founder, or strategy operator",
  proposal_assistant: "consultant, agency owner, or sales operator",
  document_analysis_agent: "legal, finance, operations, or compliance user",
  workflow_operator_agent: "operations lead or cockpit admin",
  security_triage_agent: "security operator or technical founder",
  compliance_assistant: "compliance manager or regulated business owner",
  knowledge_assistant: "internal team or client-facing knowledge users",
  coding_assistant: "developer or technical operator",
  content_assistant: "marketing operator or founder",
  meeting_prep_agent: "executive operator or account owner",
  not_sure: "business operator or team lead",
};

const BUSINESS_PROBLEM_MAP: Record<string, string> = {
  sales_assistant:
    "The sales process needs faster lead qualification, consistent follow-up context, and better conversion from diagnostic interest into booked discovery.",
  intake_assistant:
    "The current intake process depends on manual review and inconsistent routing, which creates delay, missing context, and weak handoff quality.",
  support_triage_agent:
    "Support requests need faster triage, consistent categorization, and operator-ready summaries without autonomous customer-facing actions.",
  research_assistant:
    "Research workflows need structured synthesis and citations without uncontrolled data exposure or unmanaged storage.",
  proposal_assistant:
    "Proposal drafting depends on manual assembly and inconsistent structure, slowing delivery and weakening client confidence.",
  document_analysis_agent:
    "The user needs structured analysis of documents without uncontrolled data exposure, weak citations, or unmanaged storage.",
  workflow_operator_agent:
    "Operational workflows need a controlled assistant that recommends actions and drafts updates without autonomous production changes.",
  security_triage_agent:
    "The operator needs a controlled way to review security signals, summarize severity, and route findings without allowing autonomous remediation.",
  compliance_assistant:
    "Compliance review needs structured guidance and evidence tracking without the agent acting as a final legal authority.",
  knowledge_assistant:
    "Knowledge retrieval needs governed answers with clear boundaries, citations, and operator visibility.",
  coding_assistant:
    "Development workflows need assisted drafting and review without autonomous production code execution.",
  content_assistant:
    "Content production needs draft assistance with brand-safe outputs and human approval before publishing.",
  meeting_prep_agent:
    "Meeting preparation depends on manual context gathering and inconsistent briefing quality.",
  not_sure:
    "The team needs a controlled AI assistant specification before any build, tool access, or deployment decisions are made.",
};

const CREDENTIAL_SENSITIVE_TOOLS = new Set([
  "gmail",
  "google_calendar",
  "google_drive",
  "google_sheets",
  "google_docs",
  "slack",
  "teams",
  "hubspot",
  "stripe",
  "github",
  "linear",
  "database",
  "internal_api",
  "browser_search",
  "openai_api",
  "vector_database",
  "local_ai_runtime",
  "custom_api",
]);

const HIGH_RISK_SIGNALS = new Set([
  "regulated_data",
  "credentials_or_secrets",
  "financial_data",
  "autonomous_send",
  "autonomous_write",
  "tool_use",
]);

const BASE_OUT_OF_SCOPE = [
  "Send external emails without approval.",
  "Modify production data without approval.",
  "Access credentials or secret stores.",
  "Make payments or financial transactions.",
  "Delete records without operator approval.",
  "Execute code in production environments.",
  "Provide legal, financial, or medical advice as final authority.",
  "Bypass approval gates or operator review.",
  "Store sensitive data unnecessarily.",
  "Register webhooks or autonomous background jobs without review.",
];

function normalizeText(value: unknown, maxLength = 512): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeStringArray(value: unknown, fallback: string[] = ["not_sure"]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((entry) => normalizeText(entry, 96)).filter(Boolean);
  return items.length ? items : fallback;
}

function clampEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const normalized = normalizeText(value, 96) as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

const SOURCE_TYPES = [
  "microservice_package",
  "service_quote",
  "agent_readiness_result",
  "automation_build_spec",
  "manual_agent_request",
  "existing_client_need",
  "not_sure",
] as const;

const RECOMMENDED_SERVICES = [
  "ai_agent_build",
  "ai_agent_security_review",
  "private_ai_architecture_review",
  "copilot_governance",
  "ai_automation_build",
  "not_sure",
] as const;

const AGENT_GOALS = Object.keys(AGENT_CATEGORY_MAP) as (keyof typeof AGENT_CATEGORY_MAP)[];

const AUTONOMY_LEVELS = [
  "advisory_only",
  "draft_only",
  "operator_approved_actions",
  "limited_autonomous_actions",
  "not_sure",
] as const;

const CHANNELS = [
  "web_app",
  "operator_dashboard",
  "chat_interface",
  "slack_or_teams",
  "email_draft_interface",
  "internal_api",
  "browser_extension",
  "local_desktop",
  "not_sure",
] as const;

const MEMORY_REQUIREMENTS = [
  "no_memory",
  "session_memory_only",
  "user_preference_memory",
  "project_memory",
  "long_term_business_memory",
  "not_sure",
] as const;

const DEPLOYMENT_ENVIRONMENTS = [
  "public_web_app",
  "private_operator_dashboard",
  "internal_workspace",
  "slack_or_teams_workspace",
  "cloudflare_worker",
  "local_ai_runtime",
  "hybrid_cloud_local",
  "not_sure",
] as const;

const VOLUME_LEVELS = ["low", "medium", "high", "bursty", "unknown"] as const;
const TIMELINES = ["this_week", "this_month", "this_quarter", "flexible", "exploring"] as const;
const BUDGET_BANDS = [
  "under_1000",
  "1000_2500",
  "2500_7500",
  "7500_15000",
  "15000_30000",
  "30000_plus",
  "not_sure",
] as const;

export function normalizeAiAgentBuildInput(payload: Record<string, unknown> = {}): AiAgentBuildInput {
  const diagnostic =
    payload.diagnostic_context && typeof payload.diagnostic_context === "object" && !Array.isArray(payload.diagnostic_context)
      ? (payload.diagnostic_context as Record<string, unknown>)
      : undefined;

  return {
    source_type: clampEnum(payload.source_type, SOURCE_TYPES, "not_sure"),
    source_reference_id: normalizeText(payload.source_reference_id, 128) || undefined,
    package_name: normalizeText(payload.package_name, 256) || undefined,
    recommended_service: clampEnum(payload.recommended_service, RECOMMENDED_SERVICES, "ai_agent_build"),
    agent_goal: clampEnum(payload.agent_goal, AGENT_GOALS, "not_sure"),
    agent_autonomy_level: clampEnum(payload.agent_autonomy_level, AUTONOMY_LEVELS, "not_sure"),
    user_interaction_channel: clampEnum(payload.user_interaction_channel, CHANNELS, "not_sure"),
    tools_needed: normalizeStringArray(payload.tools_needed),
    data_types: normalizeStringArray(payload.data_types),
    output_modes: normalizeStringArray(payload.output_modes),
    human_approval_required: normalizeText(payload.human_approval_required, 64) || "not_sure",
    risk_signals: normalizeStringArray(payload.risk_signals),
    memory_requirement: clampEnum(payload.memory_requirement, MEMORY_REQUIREMENTS, "not_sure"),
    deployment_environment: clampEnum(payload.deployment_environment, DEPLOYMENT_ENVIRONMENTS, "not_sure"),
    volume_level: clampEnum(payload.volume_level, VOLUME_LEVELS, "unknown"),
    timeline: clampEnum(payload.timeline, TIMELINES, "exploring"),
    budget_band: clampEnum(payload.budget_band, BUDGET_BANDS, "not_sure"),
    diagnostic_context: diagnostic,
    source_route: normalizeText(payload.source_route, 256) || "/apps/ai-agent-builder",
  };
}

function generateAiAgentBuildId(): string {
  return `agent-build-${1001 + aiAgentBuildSubmissions.length}`;
}

function buildAgentMission(input: AiAgentBuildInput): string {
  const category = AGENT_CATEGORY_MAP[input.agent_goal] || AGENT_CATEGORY_MAP.not_sure;
  const autonomy =
    input.agent_autonomy_level === "advisory_only"
      ? "advisory recommendations only"
      : input.agent_autonomy_level === "draft_only"
        ? "draft outputs with human approval"
        : input.agent_autonomy_level === "operator_approved_actions"
          ? "operator-approved scoped actions"
          : "controlled assistance with strict approval gates";
  return `Create a ${category.toLowerCase()} that supports ${TARGET_USER_MAP[input.agent_goal] || "the operator"} through ${autonomy}, preserving safety boundaries, audit visibility, and explicit human review before any external write or send.`;
}

function buildTaskScope(input: AiAgentBuildInput): string[] {
  const base: Record<string, string[]> = {
    intake_assistant: [
      "Summarize client intake submissions.",
      "Extract service interest and urgency.",
      "Draft operator-approved follow-up messages.",
      "Recommend queue priority.",
      "Flag sensitive data or high-risk requests.",
      "Normalize project requirements into structured fields.",
    ],
    sales_assistant: [
      "Qualify inbound leads against service fit.",
      "Summarize discovery context for operators.",
      "Draft follow-up messaging for review.",
      "Recommend next sales stage.",
      "Flag high-value or high-risk opportunities.",
    ],
    security_triage_agent: [
      "Summarize security signals and severity.",
      "Recommend containment posture for operator review.",
      "Draft incident packet sections.",
      "Flag prompt-injection or credential exposure indicators.",
      "Route findings to operator queue.",
    ],
  };
  const scoped = base[input.agent_goal] || [
    "Collect and normalize user context.",
    "Produce structured operator-ready outputs.",
    "Recommend next actions within approved boundaries.",
    "Flag missing required fields.",
    "Escalate high-risk requests to operator review.",
    "Maintain audit-friendly summaries.",
  ];
  return scoped.slice(0, 10);
}

function buildToolBoundaryModel(input: AiAgentBuildInput) {
  const tools = input.tools_needed.filter((tool) => tool !== "not_sure" && tool !== "none");
  const draftOnly = tools.filter((tool) =>
    ["gmail", "slack", "teams", "hubspot", "google_docs", "google_sheets"].includes(tool),
  );
  const readOnly = tools.filter((tool) => ["operator_queue", "database", "vector_database", "internal_api"].includes(tool));
  const writeApproval = tools.filter((tool) =>
    ["google_sheets", "hubspot", "database", "stripe", "github", "linear", "custom_api"].includes(tool),
  );
  const prohibited = ["payment execution", "credential access", "production deletion", "autonomous webhook registration"];
  const allowed = tools.length
    ? tools.map((tool) =>
        draftOnly.includes(tool) ? `${tool} (draft-only pending approval)` : `${tool} (scoped access pending review)`,
      )
    : ["No external tools — specification and operator summaries only"];

  const credentialNote = tools.some((tool) => CREDENTIAL_SENSITIVE_TOOLS.has(tool))
    ? "Requires explicit credential review and scoped permissions before implementation."
    : "No credential handling in spec phase.";

  return {
    tools_allowed: allowed,
    tools_prohibited: prohibited,
    read_only_tools: readOnly.length ? readOnly : ["operator_queue"],
    draft_only_tools: draftOnly.length ? draftOnly : ["gmail"],
    write_requires_approval: writeApproval.length ? writeApproval : ["any third-party write"],
    no_credential_handling_rule:
      "The agent must never request, display, store, or log credentials. " + credentialNote,
  };
}

function buildApprovalGates(input: AiAgentBuildInput): string[] {
  const gates: string[] = [];
  if (input.agent_autonomy_level === "advisory_only" || input.agent_autonomy_level === "draft_only") {
    gates.push("No external write or send without operator approval.");
  }
  if (input.human_approval_required === "always") {
    gates.push("Require approval before every external write, send, or tool action.");
  } else if (input.human_approval_required === "before_external_send") {
    gates.push("Require approval before any external email or message is sent.");
  } else if (input.human_approval_required === "before_data_write") {
    gates.push("Require approval before writing to third-party systems.");
  } else if (input.human_approval_required === "before_tool_action") {
    gates.push("Require approval before any tool action executes.");
  }

  const risky = input.risk_signals.filter((signal) => signal !== "not_sure");
  if (
    risky.some((signal) =>
      [
        "financial_data",
        "regulated_data",
        "credentials_or_secrets",
        "autonomous_send",
        "autonomous_write",
        "ai_generated_decisions",
        "tool_use",
        "prompt_injection_exposure",
        "rag_data_exposure",
      ].includes(signal),
    )
  ) {
    gates.push("Escalate to operator review when sensitive, regulated, or high-risk data appears.");
  }
  if (input.output_modes.some((mode) => ["draft_message", "calendar_event_draft", "crm_update_draft"].includes(mode))) {
    gates.push("Keep outbound communications and CRM updates draft-only until approved.");
  }
  if (!gates.length) {
    gates.push("Default to operator review for any action outside read-only summarization.");
  }
  return [...new Set(gates)];
}

function buildMemoryPolicy(input: AiAgentBuildInput) {
  const type = input.memory_requirement;
  const policies: Record<string, Omit<AiAgentBuildSubmission["memory_policy"], "memory_type">> = {
    no_memory: {
      retained_fields: [],
      excluded_fields: ["all persistent user data"],
      retention_period: "none",
      deletion_policy: "no retention",
      user_visibility: "no stored memory",
    },
    session_memory_only: {
      retained_fields: ["active session context"],
      excluded_fields: ["credentials", "tokens", "long-term PII"],
      retention_period: "active session only",
      deletion_policy: "purge at session end",
      user_visibility: "session-only context",
    },
    user_preference_memory: {
      retained_fields: ["low-risk preferences", "display settings"],
      excluded_fields: ["credentials", "regulated data", "financial data"],
      retention_period: "operator-defined preference window",
      deletion_policy: "user or operator deletion on request",
      user_visibility: "preference settings visible to operator",
    },
    project_memory: {
      retained_fields: ["project goal", "service interest", "operator decisions"],
      excluded_fields: ["credentials", "tokens", "unnecessary sensitive customer data"],
      retention_period: "project duration or operator-defined retention window",
      deletion_policy: "operator-visible deletion request pathway required",
      user_visibility: "operator can review retained project state",
    },
    long_term_business_memory: {
      retained_fields: ["approved business context", "project decisions", "routing metadata"],
      excluded_fields: ["credentials", "secrets", "unnecessary PII"],
      retention_period: "explicit retention policy required",
      deletion_policy: "documented deletion and access review pathway",
      user_visibility: "operator-governed retention with audit trail",
    },
  };
  const selected = policies[type] || policies.session_memory_only;
  return { memory_type: type, ...selected };
}

function scoreComplexity(input: AiAgentBuildInput): AiAgentBuildSubmission["complexity_level"] {
  let score = 0;
  const tools = input.tools_needed.filter((t) => t !== "not_sure" && t !== "none");
  const risks = input.risk_signals.filter((t) => t !== "not_sure");
  const outputs = input.output_modes.filter((t) => t !== "not_sure");
  score += tools.length >= 4 ? 3 : tools.length >= 2 ? 2 : tools.length >= 1 ? 1 : 0;
  score += risks.length >= 4 ? 3 : risks.length >= 2 ? 2 : risks.length >= 1 ? 1 : 0;
  score += outputs.length >= 4 ? 2 : outputs.length >= 2 ? 1 : 0;
  if (["project_memory", "long_term_business_memory"].includes(input.memory_requirement)) score += 2;
  if (["public_web_app", "hybrid_cloud_local", "local_ai_runtime"].includes(input.deployment_environment)) score += 2;
  if (["high", "bursty"].includes(input.volume_level)) score += 1;
  if (input.data_types.includes("regulated_data")) score += 2;
  if (input.agent_autonomy_level === "limited_autonomous_actions") score += 2;
  if (score >= 9) return "enterprise";
  if (score >= 6) return "advanced";
  if (score >= 3) return "intermediate";
  return "basic";
}

function scoreRisk(input: AiAgentBuildInput, complexity: AiAgentBuildSubmission["complexity_level"]): AiAgentBuildSubmission["risk_level"] {
  const risks = new Set(input.risk_signals.filter((r) => r !== "not_sure"));
  let highCount = 0;
  for (const signal of risks) {
    if (HIGH_RISK_SIGNALS.has(signal)) highCount += 1;
  }
  if (risks.has("prompt_injection_exposure") && risks.has("tool_use")) return "critical";
  if (highCount >= 3 || (highCount >= 2 && complexity === "enterprise")) return "critical";
  if (highCount >= 1 || risks.has("customer_data") || risks.has("no_logging")) {
    return complexity === "advanced" || complexity === "enterprise" ? "high" : "medium";
  }
  return complexity === "basic" ? "low" : "medium";
}

function derivePriority(input: AiAgentBuildInput, risk: AiAgentBuildSubmission["risk_level"]): AiAgentBuildSubmission["priority"] {
  if (input.timeline === "this_week") return "high";
  if (input.budget_band === "7500_15000" || input.budget_band === "15000_30000" || input.budget_band === "30000_plus") {
    return "high";
  }
  if (risk === "high" || risk === "critical") return "high";
  if (
    ["sales_assistant", "intake_assistant", "proposal_assistant", "workflow_operator_agent", "security_triage_agent"].includes(
      input.agent_goal,
    )
  ) {
    return "high";
  }
  if (input.timeline === "this_month") return "medium";
  return "low";
}

function deriveEffort(
  input: AiAgentBuildInput,
  complexity: AiAgentBuildSubmission["complexity_level"],
  risk: AiAgentBuildSubmission["risk_level"],
): { estimated_effort: string; delivery_timeline: string } {
  const tools = input.tools_needed.filter((t) => t !== "not_sure" && t !== "none");
  const regulated = input.data_types.includes("regulated_data") || input.risk_signals.includes("regulated_data");
  const externalFacing = input.deployment_environment === "public_web_app" || input.risk_signals.includes("external_customer_facing");
  const autonomous =
    input.agent_autonomy_level === "limited_autonomous_actions" ||
    input.risk_signals.includes("autonomous_send") ||
    input.risk_signals.includes("autonomous_write");

  if ((regulated && tools.length > 0 && (externalFacing || autonomous)) || complexity === "enterprise" || risk === "critical") {
    return { estimated_effort: "Enterprise: phased delivery required", delivery_timeline: "phased 4–8+ weeks" };
  }
  if (tools.length > 0 || input.memory_requirement === "project_memory" || complexity === "advanced") {
    return { estimated_effort: "Large: 2–6 implementation weeks", delivery_timeline: "2–6 weeks" };
  }
  if (input.agent_autonomy_level === "draft_only" || tools.length <= 2) {
    return { estimated_effort: "Medium: 1–2 implementation weeks", delivery_timeline: "1–2 weeks" };
  }
  if (input.agent_autonomy_level === "advisory_only" && tools.length <= 1 && input.data_types.length <= 3) {
    return { estimated_effort: "Small: 1–3 implementation days", delivery_timeline: "3–7 business days" };
  }
  return { estimated_effort: "Medium: 1–2 implementation weeks", delivery_timeline: "1–2 weeks" };
}

function deriveRetainer(complexity: AiAgentBuildSubmission["complexity_level"], risk: AiAgentBuildSubmission["risk_level"]): string {
  if (complexity === "enterprise" || risk === "critical") return "$5,000/mo operator systems retainer";
  if (complexity === "advanced" || risk === "high") return "$2,500/mo AI agent governance and monitoring retainer";
  if (complexity === "intermediate") return "$1,500/mo agent operations maintenance retainer";
  return "$500/mo advisory and prompt maintenance retainer";
}

function buildSafetyControls(input: AiAgentBuildInput): string[] {
  const controls = [
    "Use least-privilege tool scopes.",
    "Keep outbound communications draft-only.",
    "Do not log secrets, tokens, or access keys.",
    "Apply prompt injection filtering on user-provided content.",
    "Isolate retrieved content from system instructions.",
    "Maintain audit log of approval decisions.",
    "Validate outputs before queue or API writes.",
    "Minimize PII in stored fields.",
  ];
  if (input.risk_signals.includes("rag_data_exposure")) controls.push("Apply retrieval boundary controls and source citation requirements.");
  if (input.risk_signals.includes("tool_use")) controls.push("Block unauthorized tool requests at the policy layer.");
  if (input.deployment_environment === "public_web_app") controls.push("Apply rate limiting on public-facing agent endpoints.");
  return controls.slice(0, 10);
}

function buildIntegrationPlan(input: AiAgentBuildInput) {
  const items = [
    {
      system: "Operator queue",
      purpose: "Track intake and follow-up state",
      data_in: "Agent output summary",
      data_out: "Queue record",
      auth_or_access_note: "Internal operator-only access",
      risk_note: "Avoid storing unnecessary sensitive details",
    },
  ];
  for (const tool of input.tools_needed.filter((t) => t !== "not_sure" && t !== "none").slice(0, 5)) {
    items.push({
      system: tool.replace(/_/g, " "),
      purpose: `Support ${AGENT_CATEGORY_MAP[input.agent_goal] || "agent"} workflow`,
      data_in: "Scoped operator-approved payload",
      data_out: "Draft or read-only result",
      auth_or_access_note: CREDENTIAL_SENSITIVE_TOOLS.has(tool)
        ? "Requires explicit credential review and scoped permissions before implementation."
        : "Access scope must be reviewed before implementation.",
      risk_note: "No autonomous write/send without approval gate.",
    });
  }
  return items.slice(0, 8);
}

function buildNextRoute(result: {
  ai_agent_build_id: string;
  priority: string;
  agent_name?: string;
  agent_category?: string;
  estimated_effort?: string;
  delivery_timeline?: string;
  complexity_level?: string;
  risk_level?: string;
  source_reference_id?: string;
}): string {
  const params = new URLSearchParams({
    service: "ai_agent_build",
    priority: result.priority,
    source: "ai-agent-builder",
    ai_agent_build_id: result.ai_agent_build_id,
  });
  if (result.agent_name) params.set("agent_name", result.agent_name);
  if (result.agent_category) params.set("agent_category", result.agent_category);
  if (result.estimated_effort) params.set("estimated_effort", result.estimated_effort);
  if (result.delivery_timeline) params.set("delivery_timeline", result.delivery_timeline);
  if (result.complexity_level) params.set("complexity_level", result.complexity_level);
  if (result.risk_level) params.set("risk_level", result.risk_level);
  if (result.source_reference_id) params.set("source_reference_id", result.source_reference_id);
  return `/enter?${params.toString()}`;
}

export function generateAiAgentBuildSpec(input: AiAgentBuildInput, id?: string): AiAgentBuildSubmission {
  const ai_agent_build_id = id || generateAiAgentBuildId();
  const agent_category = AGENT_CATEGORY_MAP[input.agent_goal] || AGENT_CATEGORY_MAP.not_sure;
  const agent_name = AGENT_NAME_MAP[input.agent_goal] || AGENT_NAME_MAP.not_sure;
  const target_user = TARGET_USER_MAP[input.agent_goal] || TARGET_USER_MAP.not_sure;
  const business_problem = BUSINESS_PROBLEM_MAP[input.agent_goal] || BUSINESS_PROBLEM_MAP.not_sure;
  const complexity_level = scoreComplexity(input);
  const risk_level = scoreRisk(input, complexity_level);
  const priority = derivePriority(input, risk_level);
  const { estimated_effort, delivery_timeline } = deriveEffort(input, complexity_level, risk_level);
  const tool_boundary_model = buildToolBoundaryModel(input);
  const approval_gates = buildApprovalGates(input);
  const memory_policy = buildMemoryPolicy(input);
  const roleName = agent_name.replace(" Spec", "");

  const result: AiAgentBuildSubmission = {
    ...input,
    ai_agent_build_id,
    created_at: new Date().toISOString(),
    agent_name,
    agent_category,
    target_user,
    business_problem,
    agent_mission: buildAgentMission(input),
    agent_role_definition: {
      role_name: roleName,
      primary_responsibility: `Support ${target_user} with structured ${agent_category.toLowerCase()} outputs.`,
      decision_authority:
        input.agent_autonomy_level === "advisory_only"
          ? "May recommend actions only; may not execute writes or sends."
          : "May draft outputs and recommend routing, but may not send messages or modify external systems without approval.",
      allowed_actions: ["summarize context", "draft responses", "recommend routing", "flag risk signals"],
      prohibited_actions: ["send email", "delete records", "access credentials", "make payments", "autonomous tool execution"],
      escalation_conditions: ["missing critical context", "sensitive data detected", "tool action requested", "approval gate triggered"],
    },
    user_interaction_model: {
      primary_channel: input.user_interaction_channel,
      interaction_style: "structured assistant with concise operator-ready outputs",
      user_inputs: ["business context", "goal", "constraints", "desired next step"],
      agent_outputs: input.output_modes.filter((m) => m !== "not_sure").slice(0, 6).length
        ? input.output_modes.filter((m) => m !== "not_sure").slice(0, 6)
        : ["summary", "task list", "routing recommendation"],
      fallback_behavior: "Escalate to manual operator review when required fields are missing or risk is high.",
    },
    task_scope: buildTaskScope(input),
    out_of_scope_actions: BASE_OUT_OF_SCOPE,
    tool_boundary_model,
    permission_model: {
      default_permission_level: input.agent_autonomy_level === "advisory_only" ? "read-only advisory" : "draft-only",
      approval_required_for: approval_gates,
      denied_operations: ["credential access", "payment execution", "record deletion", "autonomous webhook registration"],
      operator_override_rules: "Operator may approve scoped writes after reviewing payload and destination.",
      audit_requirements: ["log approval decision", "log destination", "redact sensitive data"],
    },
    memory_policy,
    approval_gates,
    safety_controls: buildSafetyControls(input),
    prompt_interface_spec: {
      system_instruction_summary: `Assist the operator by producing ${agent_category.toLowerCase()} outputs while enforcing approval gates and safety boundaries.`,
      required_user_inputs: ["business context", "agent goal", "desired next step"],
      response_format: "structured JSON plus operator-readable summary",
      refusal_conditions: ["credential request", "unsafe external action", "legal/financial/medical final advice"],
      escalation_language: "This request requires operator approval before action.",
      tone_style: "clear, concise, operator-grade",
      deterministic_fields: ["priority", "risk_level", "recommended_next_step"],
    },
    data_handling_policy: {
      data_allowed: input.data_types.filter((d) => !["credentials_or_secrets", "regulated_data", "not_sure"].includes(d)),
      data_restricted: input.data_types.filter((d) => ["customer_data", "financial_data", "regulated_data"].includes(d)),
      data_never_requested: ["passwords", "API keys", "secret tokens", "private keys"],
      storage_rules: "Store only fields needed for routing and delivery.",
      redaction_rules: "Redact credentials, tokens, sensitive IDs, and unnecessary PII.",
      access_review_note: "Access scope must be reviewed before implementation.",
    },
    logging_telemetry_plan: {
      events_to_log: ["agent_spec_generated", "approval_gate_triggered", "operator_review_required"],
      fields_to_redact: ["credentials", "tokens", "api_keys", "sensitive_customer_details"],
      metrics_to_track: ["spec_count", "approval_required_count", "risk_level_distribution"],
      alert_conditions: ["attempted credential submission", "blocked external action", "prompt injection attempt"],
      operator_dashboard_fields: ["ai_agent_build_id", "priority", "risk_level", "status", "created_at"],
    },
    integration_plan: buildIntegrationPlan(input),
    deployment_plan: {
      recommended_environment: input.deployment_environment,
      deployment_mode: input.agent_autonomy_level === "advisory_only" ? "advisory operator assistant" : "draft-only operator assistant",
      required_runtime: "existing Worker/static app pattern",
      access_control_model: input.deployment_environment === "private_operator_dashboard" ? "operator-only route" : "scoped authenticated access",
      rollout_steps: ["build spec UI", "validate route", "test safety gates", "operator QA"],
      rollback_plan: "Disable route and remove dashboard card if validation fails",
    },
    testing_plan: [
      "Happy-path agent spec generation",
      "Missing required field handling",
      "Prompt injection attempt",
      "Unauthorized tool request",
      "Approval gate enforcement",
      "Sensitive data redaction",
      "Logging redaction validation",
      "Output schema validation",
      "Rollback/escalation behavior",
    ],
    red_team_checks: [
      "Prompt injection",
      "Tool misuse",
      "Data exfiltration",
      "Unauthorized send/write",
      "Hallucinated policy",
      "Unsafe recommendation",
      "Sensitive data leakage",
      "Memory over-retention",
      "Role confusion",
      "Escalation bypass",
    ],
    client_inputs_needed: [
      "Agent goal",
      "Target users",
      "Current workflow",
      "Data sources",
      "Tool list",
      "Permission boundaries",
      "Approval rules",
      "Retention requirements",
      "Success criteria",
      "Test cases",
    ],
    implementation_checklist: [
      "Confirm agent goal and target users",
      "Define tool boundaries and prohibited actions",
      "Define approval gates and escalation rules",
      "Define memory policy and retention",
      "Define logging fields and redaction rules",
      "Review integration access scope",
      "Validate deployment environment",
      "Run red-team prompt tests",
      "Operator QA on draft outputs",
      "Document rollback and maintenance plan",
    ],
    maintenance_plan: {
      recommended_retainer: deriveRetainer(complexity_level, risk_level),
      monitoring_frequency: risk_level === "high" || risk_level === "critical" ? "weekly" : "monthly",
      update_triggers: ["new tool added", "workflow change", "policy update", "risk event"],
      owner: "Operator",
      monthly_tasks: ["Review logs", "Update prompt interface", "Audit approvals", "Review memory retention"],
    },
    estimated_effort,
    delivery_timeline,
    complexity_level,
    risk_level,
    priority,
    recommended_next_step:
      "Start AI agent build intake and confirm role, tool boundaries, memory policy, approval gates, and success criteria.",
    next_route: "",
    status: "ai-agent-build-spec-complete",
    northstar_alignment: buildAgentNorthstarAlignment(AI_AGENT_BUILDER_AGENT_ID, "TRUST"),
  };

  result.next_route = buildNextRoute(result);
  return result;
}

export function recordAiAgentBuildSubmission(input: AiAgentBuildInput, result: AiAgentBuildSubmission): AiAgentBuildSubmission {
  const submission: AiAgentBuildSubmission = {
    ...result,
    ...input,
    ai_agent_build_id: result.ai_agent_build_id,
    status: "ai-agent-build-spec-complete",
  };
  const index = aiAgentBuildSubmissions.findIndex((entry) => entry.ai_agent_build_id === submission.ai_agent_build_id);
  if (index >= 0) {
    aiAgentBuildSubmissions[index] = { ...aiAgentBuildSubmissions[index], ...submission };
    return aiAgentBuildSubmissions[index];
  }
  aiAgentBuildSubmissions.unshift(submission);
  return submission;
}

export function attachEngagementToAiAgentBuild(details: {
  ai_agent_build_id?: string;
  aiAgentBuildId?: string;
  engagement_id?: string;
  engagementId?: string;
  status?: string;
  created_at?: string;
  source?: string;
  agent_name?: string;
  agent_category?: string;
  estimated_effort?: string;
  delivery_timeline?: string;
  complexity_level?: string;
  risk_level?: string;
  source_reference_id?: string;
  recommended_service?: string;
  priority?: string;
}): AiAgentBuildSubmission | null {
  const buildId = normalizeText(details.ai_agent_build_id || details.aiAgentBuildId, 128);
  const engagementId = normalizeText(details.engagement_id || details.engagementId, 128);
  if (!buildId) return null;

  const existing = aiAgentBuildSubmissions.find((entry) => entry.ai_agent_build_id === buildId);
  const base =
    existing ||
    ({
      ai_agent_build_id: buildId,
      created_at: details.created_at || new Date().toISOString(),
      source_route: details.source || "/apps/ai-agent-builder",
      source_type: "not_sure",
      recommended_service: "ai_agent_build",
      agent_goal: "not_sure",
      agent_autonomy_level: "not_sure",
      user_interaction_channel: "not_sure",
      tools_needed: ["not_sure"],
      data_types: ["not_sure"],
      output_modes: ["not_sure"],
      human_approval_required: "not_sure",
      risk_signals: ["not_sure"],
      memory_requirement: "not_sure",
      deployment_environment: "not_sure",
      volume_level: "unknown",
      timeline: "exploring",
      budget_band: "not_sure",
      agent_name: normalizeText(details.agent_name, 256) || "AI Agent Build Spec",
      agent_category: normalizeText(details.agent_category, 128) || "General Purpose Business Agent",
      target_user: "operator",
      business_problem: "",
      agent_mission: "",
      agent_role_definition: {
        role_name: "Agent",
        primary_responsibility: "",
        decision_authority: "",
        allowed_actions: [],
        prohibited_actions: [],
        escalation_conditions: [],
      },
      user_interaction_model: {
        primary_channel: "operator_dashboard",
        interaction_style: "",
        user_inputs: [],
        agent_outputs: [],
        fallback_behavior: "",
      },
      task_scope: [],
      out_of_scope_actions: [],
      tool_boundary_model: {
        tools_allowed: [],
        tools_prohibited: [],
        read_only_tools: [],
        draft_only_tools: [],
        write_requires_approval: [],
        no_credential_handling_rule: "",
      },
      permission_model: {
        default_permission_level: "draft-only",
        approval_required_for: [],
        denied_operations: [],
        operator_override_rules: "",
        audit_requirements: [],
      },
      memory_policy: {
        memory_type: "session_memory_only",
        retained_fields: [],
        excluded_fields: [],
        retention_period: "",
        deletion_policy: "",
        user_visibility: "",
      },
      approval_gates: [],
      safety_controls: [],
      prompt_interface_spec: {
        system_instruction_summary: "",
        required_user_inputs: [],
        response_format: "",
        refusal_conditions: [],
        escalation_language: "",
        tone_style: "",
        deterministic_fields: [],
      },
      data_handling_policy: {
        data_allowed: [],
        data_restricted: [],
        data_never_requested: [],
        storage_rules: "",
        redaction_rules: "",
        access_review_note: "",
      },
      logging_telemetry_plan: {
        events_to_log: [],
        fields_to_redact: [],
        metrics_to_track: [],
        alert_conditions: [],
        operator_dashboard_fields: [],
      },
      integration_plan: [],
      deployment_plan: {
        recommended_environment: "private_operator_dashboard",
        deployment_mode: "",
        required_runtime: "",
        access_control_model: "",
        rollout_steps: [],
        rollback_plan: "",
      },
      testing_plan: [],
      red_team_checks: [],
      client_inputs_needed: [],
      implementation_checklist: [],
      maintenance_plan: {
        recommended_retainer: "",
        monitoring_frequency: "",
        update_triggers: [],
        owner: "Operator",
        monthly_tasks: [],
      },
      estimated_effort: normalizeText(details.estimated_effort, 128) || "",
      delivery_timeline: normalizeText(details.delivery_timeline, 64) || "",
      complexity_level: (normalizeText(details.complexity_level, 32) as AiAgentBuildSubmission["complexity_level"]) || "basic",
      risk_level: (normalizeText(details.risk_level, 32) as AiAgentBuildSubmission["risk_level"]) || "low",
      priority: (normalizeText(details.priority, 16) as AiAgentBuildSubmission["priority"]) || "low",
      recommended_next_step: "",
      next_route: buildNextRoute({ ai_agent_build_id: buildId, priority: (details.priority as AiAgentBuildSubmission["priority"]) || "low" }),
      status: "ai-agent-build-spec-complete",
    } satisfies AiAgentBuildSubmission);

  const updated: AiAgentBuildSubmission = {
    ...base,
    engagement_id: engagementId || base.engagement_id,
    status: engagementId ? "intake-received" : base.status,
    agent_name: normalizeText(details.agent_name, 256) || base.agent_name,
    agent_category: normalizeText(details.agent_category, 128) || base.agent_category,
    estimated_effort: normalizeText(details.estimated_effort, 128) || base.estimated_effort,
    delivery_timeline: normalizeText(details.delivery_timeline, 64) || base.delivery_timeline,
    complexity_level: (normalizeText(details.complexity_level, 32) as AiAgentBuildSubmission["complexity_level"]) || base.complexity_level,
    risk_level: (normalizeText(details.risk_level, 32) as AiAgentBuildSubmission["risk_level"]) || base.risk_level,
    source_reference_id: normalizeText(details.source_reference_id, 128) || base.source_reference_id,
    recommended_service: normalizeText(details.recommended_service, 128) || base.recommended_service,
    priority: (normalizeText(details.priority, 16) as AiAgentBuildSubmission["priority"]) || base.priority,
  };

  updated.next_route = buildNextRoute(updated);
  return recordAiAgentBuildSubmission(updated, updated);
}

type EngagementLike = {
  id?: string;
  engagement_id?: string;
  aiAgentBuildId?: string | null;
  ai_agent_build_id?: string | null;
  status?: string;
  createdAt?: string;
  created_at?: string;
};

export function listAiAgentBuildQueue(engagements: EngagementLike[] = []) {
  const queue = aiAgentBuildSubmissions.map((submission) => {
    const linked = engagements.find(
      (entry) =>
        (entry.aiAgentBuildId && entry.aiAgentBuildId === submission.ai_agent_build_id) ||
        (entry.ai_agent_build_id && entry.ai_agent_build_id === submission.ai_agent_build_id),
    );
    return {
      ...submission,
      engagement_id: submission.engagement_id || linked?.id || linked?.engagement_id || null,
      status: linked?.status || submission.status,
      created_at: linked?.createdAt || linked?.created_at || submission.created_at,
    };
  });

  for (const engagement of engagements) {
    const buildId = engagement.aiAgentBuildId || engagement.ai_agent_build_id;
    if (!buildId) continue;
    if (queue.some((row) => row.ai_agent_build_id === buildId)) continue;
    queue.push({
      ai_agent_build_id: buildId,
      created_at: engagement.createdAt || engagement.created_at || new Date().toISOString(),
      source_route: "/apps/ai-agent-builder",
      source_type: "not_sure",
      recommended_service: "ai_agent_build",
      agent_goal: "not_sure",
      agent_autonomy_level: "not_sure",
      user_interaction_channel: "not_sure",
      tools_needed: [],
      data_types: [],
      output_modes: [],
      human_approval_required: "not_sure",
      risk_signals: [],
      memory_requirement: "not_sure",
      deployment_environment: "not_sure",
      volume_level: "unknown",
      timeline: "exploring",
      budget_band: "not_sure",
      agent_name: "AI Agent Build (intake only)",
      agent_category: "General Purpose Business Agent",
      target_user: "operator",
      business_problem: "",
      agent_mission: "",
      agent_role_definition: {
        role_name: "",
        primary_responsibility: "",
        decision_authority: "",
        allowed_actions: [],
        prohibited_actions: [],
        escalation_conditions: [],
      },
      user_interaction_model: {
        primary_channel: "",
        interaction_style: "",
        user_inputs: [],
        agent_outputs: [],
        fallback_behavior: "",
      },
      task_scope: [],
      out_of_scope_actions: [],
      tool_boundary_model: {
        tools_allowed: [],
        tools_prohibited: [],
        read_only_tools: [],
        draft_only_tools: [],
        write_requires_approval: [],
        no_credential_handling_rule: "",
      },
      permission_model: {
        default_permission_level: "",
        approval_required_for: [],
        denied_operations: [],
        operator_override_rules: "",
        audit_requirements: [],
      },
      memory_policy: {
        memory_type: "",
        retained_fields: [],
        excluded_fields: [],
        retention_period: "",
        deletion_policy: "",
        user_visibility: "",
      },
      approval_gates: [],
      safety_controls: [],
      prompt_interface_spec: {
        system_instruction_summary: "",
        required_user_inputs: [],
        response_format: "",
        refusal_conditions: [],
        escalation_language: "",
        tone_style: "",
        deterministic_fields: [],
      },
      data_handling_policy: {
        data_allowed: [],
        data_restricted: [],
        data_never_requested: [],
        storage_rules: "",
        redaction_rules: "",
        access_review_note: "",
      },
      logging_telemetry_plan: {
        events_to_log: [],
        fields_to_redact: [],
        metrics_to_track: [],
        alert_conditions: [],
        operator_dashboard_fields: [],
      },
      integration_plan: [],
      deployment_plan: {
        recommended_environment: "",
        deployment_mode: "",
        required_runtime: "",
        access_control_model: "",
        rollout_steps: [],
        rollback_plan: "",
      },
      testing_plan: [],
      red_team_checks: [],
      client_inputs_needed: [],
      implementation_checklist: [],
      maintenance_plan: {
        recommended_retainer: "",
        monitoring_frequency: "",
        update_triggers: [],
        owner: "Operator",
        monthly_tasks: [],
      },
      estimated_effort: "",
      delivery_timeline: "",
      complexity_level: "basic",
      risk_level: "low",
      priority: "low",
      recommended_next_step: "",
      next_route: buildNextRoute({ ai_agent_build_id: buildId, priority: "low" }),
      engagement_id: engagement.id || engagement.engagement_id || null,
      status: engagement.status || "intake-received",
    });
  }

  return queue;
}

export function resolveAiAgentBuildId(payload: Record<string, unknown>): string | null {
  const candidate = normalizeText(payload.ai_agent_build_id || payload.aiAgentBuildId, 128);
  if (!candidate) return null;
  return /^agent-build-\d+$/.test(candidate) ? candidate : null;
}

export function getAiAgentBuildSubmissions(): AiAgentBuildSubmission[] {
  return aiAgentBuildSubmissions;
}

const aiAgentBuilderAgent = {
  aiAgentBuilderMarketplaceModule,
  getAiAgentBuildSubmissions,
  normalizeAiAgentBuildInput,
  generateAiAgentBuildSpec,
  recordAiAgentBuildSubmission,
  attachEngagementToAiAgentBuild,
  listAiAgentBuildQueue,
  resolveAiAgentBuildId,
};

export default aiAgentBuilderAgent;
