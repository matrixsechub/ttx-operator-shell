import {
  buildAgentNorthstarAlignment,
  type NorthstarAlignmentMetadata,
} from "../../msh-ops/agent/beaconAlignment";

const SECURITY_REMEDIATION_AGENT_ID = "SecurityRemediationAgent";

export type SecurityRemediationInput = {
  source_type: string;
  source_reference_id?: string;
  finding_title?: string;
  risk_description?: string;
  vulnerability_categories: string[];
  affected_systems: string[];
  severity_indicators: string[];
  compliance_targets: string[];
  business_impact: string;
  exposure_level: string;
  remediation_scope: string;
  timeline: string;
  budget_band: string;
  operator_review_required: string;
  diagnostic_context?: Record<string, unknown>;
  source_route?: string;
};

export type SecurityRemediationSubmission = SecurityRemediationInput & {
  remediation_plan_id: string;
  created_at: string;
  risk_summary: string;
  vulnerabilities: Array<{
    id: string;
    title: string;
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    affected_system: string;
  }>;
  severity_levels: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  prioritized_fix_plan: string[];
  remediation_steps: Array<{
    step: number;
    phase: string;
    action: string;
    owner: string;
    effort: string;
    validation: string;
  }>;
  implementation_order: string[];
  estimated_effort: string;
  timeline: string;
  risk_level: "low" | "medium" | "high" | "critical";
  priority: "low" | "medium" | "high" | "critical";
  security_controls_required: string[];
  compliance_alignment: {
    nist_csf: string[];
    cisa: string[];
    zero_trust: string[];
  };
  validation_steps: string[];
  regression_risks: string[];
  monitoring_plan: {
    frequency: string;
    signals: string[];
    alert_conditions: string[];
    operator_dashboard_fields: string[];
  };
  retainer_path: string;
  recommended_service: string;
  recommended_next_step: string;
  next_route: string;
  engagement_id?: string;
  status: "security-remediation-plan-complete" | "intake-received";
  northstar_alignment?: NorthstarAlignmentMetadata;
};

export const securityRemediationMarketplaceModule = {
  module_id: "msh-security-remediation-agent",
  service_slug: "security_remediation_agent",
  name: "Security Remediation Agent",
  category: "AI Security / Remediation",
  public_service_route: "/apps/security-remediation-planner",
  operator_route: "/operator/security-remediation",
  description:
    "Deterministic advisory agent that converts AI security audit results, prompt injection scans, and risk diagnostics into structured remediation plans.",
  revenue_type: "implementation_spec",
  base_price: 0,
  recommended_upsell: "AI Security Audit Remediation Sprint / Security Governance Retainer",
  required_inputs: [
    "source_type",
    "risk_description",
    "vulnerability_categories",
    "affected_systems",
    "severity_indicators",
    "compliance_targets",
    "business_impact",
    "exposure_level",
    "remediation_scope",
    "timeline",
    "budget_band",
  ],
  delivery_outputs: [
    "risk_summary",
    "vulnerabilities",
    "prioritized_fix_plan",
    "remediation_steps",
    "implementation_order",
    "security_controls_required",
    "compliance_alignment",
    "validation_steps",
    "monitoring_plan",
    "intake_route",
  ],
  status: "active",
};

const securityRemediationSubmissions: SecurityRemediationSubmission[] = [];

const SOURCE_TYPES = [
  "ai_security_audit",
  "prompt_injection_scan",
  "security_fleet_event",
  "rag_risk_analyzer",
  "cloudflare_audit_lite",
  "manual_remediation_request",
  "not_sure",
] as const;

const VULNERABILITY_CATEGORIES = [
  "prompt_injection_exposure",
  "weak_access_controls",
  "missing_logging",
  "data_exposure",
  "model_misuse",
  "api_abuse",
  "policy_drift",
  "secrets_handling",
  "rag_retrieval_risk",
  "identity_gaps",
  "supply_chain_risk",
  "monitoring_gap",
  "not_sure",
] as const;

const AFFECTED_SYSTEMS = [
  "public_web_app",
  "operator_dashboard",
  "ai_agent",
  "api_gateway",
  "rag_pipeline",
  "cloudflare_edge",
  "identity_provider",
  "data_store",
  "third_party_integration",
  "not_sure",
] as const;

const SEVERITY_INDICATORS = [
  "confirmed_exploit_path",
  "active_abuse_signal",
  "credential_exposure",
  "regulated_data_involved",
  "customer_facing",
  "internet_facing",
  "repeated_failures",
  "no_approval_gates",
  "missing_audit_trail",
  "not_sure",
] as const;

const COMPLIANCE_TARGETS = ["nist_csf", "cisa", "zero_trust", "not_sure"] as const;

const BUSINESS_IMPACTS = ["low", "moderate", "high", "critical"] as const;
const EXPOSURE_LEVELS = ["internal", "authenticated", "public", "internet_facing"] as const;
const REMEDIATION_SCOPES = ["advisory_only", "operator_review", "phased_remediation", "urgent_containment_plan", "not_sure"] as const;
const TIMELINES = ["this_week", "this_month", "this_quarter", "flexible", "exploring"] as const;
const BUDGET_BANDS = ["under_1000", "1000_2500", "2500_7500", "7500_15000", "15000_30000", "30000_plus", "not_sure"] as const;

const CATEGORY_META: Record<string, { title: string; baseSeverity: SecurityRemediationSubmission["risk_level"]; control: string }> = {
  prompt_injection_exposure: {
    title: "Prompt injection exposure",
    baseSeverity: "high",
    control: "Input sanitization, prompt isolation, and operator approval gates",
  },
  weak_access_controls: {
    title: "Weak access controls",
    baseSeverity: "high",
    control: "Least-privilege RBAC and scoped operator permissions",
  },
  missing_logging: {
    title: "Missing security logging",
    baseSeverity: "medium",
    control: "Structured audit logging with redaction rules",
  },
  data_exposure: {
    title: "Sensitive data exposure risk",
    baseSeverity: "high",
    control: "Data minimization, redaction, and retention policy",
  },
  model_misuse: {
    title: "Model misuse pathway",
    baseSeverity: "high",
    control: "Output validation and refusal conditions",
  },
  api_abuse: {
    title: "API abuse surface",
    baseSeverity: "medium",
    control: "Rate limiting, auth hardening, and abuse monitoring",
  },
  policy_drift: {
    title: "Policy drift",
    baseSeverity: "medium",
    control: "Policy baseline review and change control",
  },
  secrets_handling: {
    title: "Secrets handling weakness",
    baseSeverity: "critical",
    control: "Secret redaction, vault review, and no-credential logging",
  },
  rag_retrieval_risk: {
    title: "RAG retrieval risk",
    baseSeverity: "high",
    control: "Retrieval boundaries, citation checks, and source isolation",
  },
  identity_gaps: {
    title: "Identity and session gaps",
    baseSeverity: "high",
    control: "Session validation and operator auth review",
  },
  supply_chain_risk: {
    title: "Supply chain integration risk",
    baseSeverity: "medium",
    control: "Third-party access review and integration scoping",
  },
  monitoring_gap: {
    title: "Monitoring and detection gap",
    baseSeverity: "medium",
    control: "Detection signals, alert thresholds, and operator dashboards",
  },
  not_sure: {
    title: "Unclassified security finding",
    baseSeverity: "medium",
    control: "Operator-led classification and scoped review",
  },
};

const INDICATOR_WEIGHT: Record<string, number> = {
  confirmed_exploit_path: 25,
  active_abuse_signal: 20,
  credential_exposure: 25,
  regulated_data_involved: 20,
  customer_facing: 15,
  internet_facing: 15,
  repeated_failures: 12,
  no_approval_gates: 10,
  missing_audit_trail: 10,
};

const EXPOSURE_WEIGHT: Record<string, number> = {
  internal: 10,
  authenticated: 25,
  public: 55,
  internet_facing: 75,
};

const IMPACT_WEIGHT: Record<string, number> = {
  low: 15,
  moderate: 35,
  high: 65,
  critical: 90,
};

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

function generateRemediationPlanId(): string {
  return `remediation-plan-${1001 + securityRemediationSubmissions.length}`;
}

function severityRank(severity: SecurityRemediationSubmission["risk_level"]): number {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function mapSourceType(sourceType: string): string {
  if (sourceType === "audit") return "ai_security_audit";
  if (sourceType === "prompt_scan" || sourceType === "prompt_injection_scan") return "prompt_injection_scan";
  if (sourceType === "manual") return "manual_remediation_request";
  return sourceType;
}

export function normalizeSecurityRemediationInput(payload: Record<string, unknown> = {}): SecurityRemediationInput {
  const diagnostic =
    payload.diagnostic_context && typeof payload.diagnostic_context === "object" && !Array.isArray(payload.diagnostic_context)
      ? (payload.diagnostic_context as Record<string, unknown>)
      : undefined;

  const sourceType = mapSourceType(normalizeText(payload.source_type, 96) || "not_sure");

  return {
    source_type: clampEnum(sourceType, SOURCE_TYPES, "not_sure"),
    source_reference_id:
      normalizeText(payload.source_reference_id, 128) ||
      normalizeText(payload.audit_id, 128) ||
      normalizeText(payload.scan_id, 128) ||
      normalizeText(diagnostic?.audit_id, 128) ||
      normalizeText(diagnostic?.scan_id, 128) ||
      undefined,
    finding_title: normalizeText(payload.finding_title, 256) || undefined,
    risk_description: normalizeMultiline(payload.risk_description || payload.finding_summary, 4000) || undefined,
    vulnerability_categories: normalizeStringArray(payload.vulnerability_categories, [...VULNERABILITY_CATEGORIES.slice(0, 1)]),
    affected_systems: normalizeStringArray(payload.affected_systems, [...AFFECTED_SYSTEMS.slice(0, 1)]),
    severity_indicators: normalizeStringArray(payload.severity_indicators, [...SEVERITY_INDICATORS.slice(-1)]),
    compliance_targets: normalizeStringArray(payload.compliance_targets, [...COMPLIANCE_TARGETS.slice(0, 1)]),
    business_impact: clampEnum(payload.business_impact, BUSINESS_IMPACTS, "moderate"),
    exposure_level: clampEnum(payload.exposure_level, EXPOSURE_LEVELS, "authenticated"),
    remediation_scope: clampEnum(payload.remediation_scope, REMEDIATION_SCOPES, "operator_review"),
    timeline: clampEnum(payload.timeline, TIMELINES, "this_month"),
    budget_band: clampEnum(payload.budget_band, BUDGET_BANDS, "not_sure"),
    operator_review_required: normalizeText(payload.operator_review_required, 32) || "yes",
    diagnostic_context: diagnostic,
    source_route: normalizeText(payload.source_route, 256) || "/apps/security-remediation-planner",
  };
}

function normalizeMultiline(value: unknown, maxLength = 4000): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .slice(0, maxLength);
}

function inferCategories(input: SecurityRemediationInput): string[] {
  const categories = input.vulnerability_categories.filter((item) => item !== "not_sure");
  if (categories.length) return categories;
  if (input.source_type === "prompt_injection_scan") return ["prompt_injection_exposure", "model_misuse"];
  if (input.source_type === "rag_risk_analyzer") return ["rag_retrieval_risk", "data_exposure"];
  if (input.source_type === "security_fleet_event") return ["api_abuse", "monitoring_gap"];
  if (input.source_type === "cloudflare_audit_lite") return ["weak_access_controls", "monitoring_gap"];
  return ["not_sure"];
}

function buildVulnerabilities(input: SecurityRemediationInput) {
  const categories = inferCategories(input);
  const systems = input.affected_systems.filter((item) => item !== "not_sure");
  const defaultSystem = systems[0] || "operator_dashboard";

  return categories.map((category, index) => {
    const meta = CATEGORY_META[category] || CATEGORY_META.not_sure;
    let severity = meta.baseSeverity;
    if (input.severity_indicators.includes("credential_exposure") || input.severity_indicators.includes("confirmed_exploit_path")) {
      severity = "critical";
    } else if (input.exposure_level === "internet_facing" && severity === "medium") {
      severity = "high";
    }
    return {
      id: `vuln-${index + 1}`,
      title: meta.title,
      category,
      severity,
      description: `${meta.title} identified during ${input.source_type.replace(/_/g, " ")} review. ${meta.control} required.`,
      affected_system: systems[index] || defaultSystem,
    };
  });
}

function scoreRisk(input: SecurityRemediationInput, vulnerabilities: SecurityRemediationSubmission["vulnerabilities"]) {
  let score = IMPACT_WEIGHT[input.business_impact] * 0.35 + EXPOSURE_WEIGHT[input.exposure_level] * 0.35;
  for (const indicator of input.severity_indicators.filter((item) => item !== "not_sure")) {
    score += INDICATOR_WEIGHT[indicator] || 5;
  }
  score += vulnerabilities.filter((item) => item.severity === "critical").length * 12;
  score += vulnerabilities.filter((item) => item.severity === "high").length * 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let risk_level: SecurityRemediationSubmission["risk_level"] = "low";
  if (score >= 85) risk_level = "critical";
  else if (score >= 65) risk_level = "high";
  else if (score >= 40) risk_level = "medium";

  let priority: SecurityRemediationSubmission["priority"] = "low";
  if (input.timeline === "this_week" || risk_level === "critical") priority = "critical";
  else if (risk_level === "high" || input.timeline === "this_month") priority = "high";
  else if (risk_level === "medium") priority = "medium";

  return { score, risk_level, priority };
}

function buildComplianceAlignment(input: SecurityRemediationInput, vulnerabilities: SecurityRemediationSubmission["vulnerabilities"]) {
  const targets = new Set(input.compliance_targets);
  const includeNist = targets.has("nist_csf") || targets.has("not_sure");
  const includeCisa = targets.has("cisa") || targets.has("not_sure");
  const includeZeroTrust = targets.has("zero_trust") || targets.has("not_sure");

  const nist: string[] = [];
  const cisa: string[] = [];
  const zeroTrust: string[] = [];

  if (includeNist) {
    nist.push("GV.RM — risk management response planning");
    nist.push("PR.AA — identity and access control hardening");
    if (vulnerabilities.some((item) => item.category.includes("logging") || item.category === "monitoring_gap")) {
      nist.push("DE.AE — adverse event detection improvements");
    }
    if (vulnerabilities.some((item) => item.severity === "critical" || item.severity === "high")) {
      nist.push("RS.MA — incident response and containment planning");
    }
  }

  if (includeCisa) {
    cisa.push("Reduce likelihood of prompt injection abuse through input controls");
    cisa.push("Improve audit logging and operator review visibility");
    if (input.exposure_level === "internet_facing" || input.exposure_level === "public") {
      cisa.push("Harden internet-facing AI interfaces and abuse monitoring");
    }
  }

  if (includeZeroTrust) {
    zeroTrust.push("Verify explicitly before sensitive actions");
    zeroTrust.push("Enforce least-privilege access across operator and agent surfaces");
    zeroTrust.push("Assume breach — monitor, log, and limit blast radius");
    if (vulnerabilities.some((item) => item.category === "identity_gaps")) {
      zeroTrust.push("Strengthen identity/session validation on affected systems");
    }
  }

  return { nist_csf: nist, cisa, zero_trust: zeroTrust };
}

function deriveEffort(riskLevel: SecurityRemediationSubmission["risk_level"], vulnerabilityCount: number) {
  if (riskLevel === "critical" || vulnerabilityCount >= 5) {
    return { estimated_effort: "Enterprise remediation program: phased 4–8+ weeks", timeline: "phased 4–8+ weeks" };
  }
  if (riskLevel === "high" || vulnerabilityCount >= 3) {
    return { estimated_effort: "Large remediation effort: 2–6 weeks", timeline: "2–6 weeks" };
  }
  if (riskLevel === "medium") {
    return { estimated_effort: "Medium remediation effort: 1–2 weeks", timeline: "1–2 weeks" };
  }
  return { estimated_effort: "Focused remediation sprint: 3–7 business days", timeline: "3–7 business days" };
}

function deriveRetainer(riskLevel: SecurityRemediationSubmission["risk_level"]) {
  if (riskLevel === "critical") return "$5,000/mo security governance and monitoring retainer";
  if (riskLevel === "high") return "$2,500/mo AI security remediation retainer";
  if (riskLevel === "medium") return "$1,500/mo security operations advisory retainer";
  return "$500/mo advisory monitoring retainer";
}

function buildRemediationSteps(vulnerabilities: SecurityRemediationSubmission["vulnerabilities"]) {
  const sorted = [...vulnerabilities].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  return sorted.map((vuln, index) => ({
    step: index + 1,
    phase: index === 0 ? "Contain" : index < 3 ? "Harden" : "Validate",
    action: `Remediate ${vuln.title.toLowerCase()} on ${vuln.affected_system.replace(/_/g, " ")}`,
    owner: "Operator security review",
    effort: vuln.severity === "critical" ? "high" : vuln.severity === "high" ? "medium" : "low",
    validation: `Confirm control applied and re-test ${vuln.category.replace(/_/g, " ")} pathway`,
  }));
}

function buildNextRoute(result: {
  remediation_plan_id: string;
  priority: string;
  risk_level: string;
  estimated_effort: string;
  source_reference_id?: string;
}): string {
  const params = new URLSearchParams({
    service: "security_remediation",
    priority: result.priority,
    source: "security-remediation-planner",
    remediation_plan_id: result.remediation_plan_id,
    risk_level: result.risk_level,
    estimated_effort: result.estimated_effort,
    compliance_alignment: "nist_csf,cisa,zero_trust",
  });
  if (result.source_reference_id) params.set("source_reference_id", result.source_reference_id);
  return `/enter?${params.toString()}`;
}

export function generateSecurityRemediationPlan(input: SecurityRemediationInput, id?: string): SecurityRemediationSubmission {
  const remediation_plan_id = id || generateRemediationPlanId();
  const vulnerabilities = buildVulnerabilities(input);
  const severity_levels = vulnerabilities.reduce(
    (acc, item) => {
      acc[item.severity] += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
  const { risk_level, priority } = scoreRisk(input, vulnerabilities);
  const prioritized_fix_plan = [...vulnerabilities]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .map((item) => `${item.severity.toUpperCase()}: ${item.title} — ${item.affected_system.replace(/_/g, " ")}`);
  const remediation_steps = buildRemediationSteps(vulnerabilities);
  const implementation_order = remediation_steps.map((step) => `Step ${step.step}: ${step.action}`);
  const { estimated_effort, timeline } = deriveEffort(risk_level, vulnerabilities.length);
  const compliance_alignment = buildComplianceAlignment(input, vulnerabilities);
  const security_controls_required = [
    ...new Set(
      vulnerabilities.map((item) => CATEGORY_META[item.category]?.control || "Operator review required").filter(Boolean),
    ),
    "No autonomous remediation — operator approval required for all changes",
    "Do not store or request credentials in remediation workflow",
  ];

  const risk_summary =
    normalizeMultiline(input.risk_description) ||
    `Security remediation plan derived from ${input.source_type.replace(/_/g, " ")} with ${vulnerabilities.length} prioritized findings across ${input.exposure_level.replace(/_/g, " ")} exposure.`;

  const result: SecurityRemediationSubmission = {
    ...input,
    remediation_plan_id,
    created_at: new Date().toISOString(),
    risk_summary,
    vulnerabilities,
    severity_levels,
    prioritized_fix_plan,
    remediation_steps,
    implementation_order,
    estimated_effort,
    timeline,
    risk_level,
    priority,
    security_controls_required,
    compliance_alignment,
    validation_steps: [
      "Re-run source diagnostic or audit check after controls are applied",
      "Verify prompt injection test cases fail safely",
      "Confirm logging redaction and approval gates",
      "Validate operator queue records remediation decisions",
      "Review regression checklist before closing plan",
    ],
    regression_risks: [
      "Over-tightening controls may block legitimate operator workflows",
      "Incomplete logging changes may create blind spots",
      "Remediation without staging validation may disrupt production routes",
      "Policy updates without operator training may reduce adoption",
    ],
    monitoring_plan: {
      frequency: risk_level === "critical" || risk_level === "high" ? "daily operator review" : "weekly review",
      signals: ["abuse attempts", "approval gate triggers", "anomalous API usage", "prompt injection indicators"],
      alert_conditions: ["repeated high-severity findings", "credential pattern detected", "missing audit events"],
      operator_dashboard_fields: ["remediation_plan_id", "risk_level", "priority", "status", "created_at"],
    },
    retainer_path: deriveRetainer(risk_level),
    recommended_service: "ai_security_audit",
    recommended_next_step: "Start security remediation intake and confirm prioritized fixes, validation steps, and governance retainer path.",
    next_route: "",
    status: "security-remediation-plan-complete",
    northstar_alignment: buildAgentNorthstarAlignment(SECURITY_REMEDIATION_AGENT_ID, "TRUST"),
  };

  result.next_route = buildNextRoute(result);
  return result;
}

export function recordSecurityRemediationSubmission(
  input: SecurityRemediationInput,
  result: SecurityRemediationSubmission,
): SecurityRemediationSubmission {
  const submission: SecurityRemediationSubmission = { ...result, ...input, remediation_plan_id: result.remediation_plan_id };
  const index = securityRemediationSubmissions.findIndex((entry) => entry.remediation_plan_id === submission.remediation_plan_id);
  if (index >= 0) {
    securityRemediationSubmissions[index] = { ...securityRemediationSubmissions[index], ...submission };
    return securityRemediationSubmissions[index];
  }
  securityRemediationSubmissions.unshift(submission);
  return submission;
}

export function attachEngagementToSecurityRemediation(details: {
  remediation_plan_id?: string;
  remediationPlanId?: string;
  engagement_id?: string;
  engagementId?: string;
  risk_level?: string;
  priority?: string;
  estimated_effort?: string;
  compliance_alignment?: string;
  source_reference_id?: string;
  status?: string;
  created_at?: string;
  source?: string;
}): SecurityRemediationSubmission | null {
  const planId = normalizeText(details.remediation_plan_id || details.remediationPlanId, 128);
  if (!planId) return null;

  const existing = securityRemediationSubmissions.find((entry) => entry.remediation_plan_id === planId);
  const base =
    existing ||
    generateSecurityRemediationPlan(
      normalizeSecurityRemediationInput({
        source_type: "manual_remediation_request",
        risk_description: "Intake-linked remediation plan",
      }),
      planId,
    );

  const updated: SecurityRemediationSubmission = {
    ...base,
    engagement_id: normalizeText(details.engagement_id || details.engagementId, 128) || base.engagement_id,
    status: details.engagement_id || details.engagementId ? "intake-received" : base.status,
    risk_level: (normalizeText(details.risk_level, 32) as SecurityRemediationSubmission["risk_level"]) || base.risk_level,
    priority: (normalizeText(details.priority, 16) as SecurityRemediationSubmission["priority"]) || base.priority,
    estimated_effort: normalizeText(details.estimated_effort, 128) || base.estimated_effort,
    source_reference_id: normalizeText(details.source_reference_id, 128) || base.source_reference_id,
  };
  updated.next_route = buildNextRoute(updated);
  return recordSecurityRemediationSubmission(updated, updated);
}

type EngagementLike = {
  id?: string;
  engagement_id?: string;
  remediationPlanId?: string | null;
  remediation_plan_id?: string | null;
  status?: string;
  createdAt?: string;
  created_at?: string;
};

export function listSecurityRemediationQueue(engagements: EngagementLike[] = []) {
  const queue = securityRemediationSubmissions.map((submission) => {
    const linked = engagements.find(
      (entry) =>
        (entry.remediationPlanId && entry.remediationPlanId === submission.remediation_plan_id) ||
        (entry.remediation_plan_id && entry.remediation_plan_id === submission.remediation_plan_id),
    );
    return {
      ...submission,
      engagement_id: submission.engagement_id || linked?.id || linked?.engagement_id || null,
      status: linked?.status || submission.status,
      created_at: linked?.createdAt || linked?.created_at || submission.created_at,
    };
  });

  for (const engagement of engagements) {
    const planId = engagement.remediationPlanId || engagement.remediation_plan_id;
    if (!planId || queue.some((row) => row.remediation_plan_id === planId)) continue;
    queue.push({
      remediation_plan_id: planId,
      created_at: engagement.createdAt || engagement.created_at || new Date().toISOString(),
      source_type: "not_sure",
      vulnerability_categories: [],
      affected_systems: [],
      severity_indicators: [],
      compliance_targets: [],
      business_impact: "moderate",
      exposure_level: "authenticated",
      remediation_scope: "operator_review",
      timeline: "this_month",
      budget_band: "not_sure",
      operator_review_required: "yes",
      source_route: "/apps/security-remediation-planner",
      risk_summary: "Intake-linked remediation plan",
      vulnerabilities: [],
      severity_levels: { critical: 0, high: 0, medium: 0, low: 0 },
      prioritized_fix_plan: [],
      remediation_steps: [],
      implementation_order: [],
      estimated_effort: "",
      risk_level: "medium",
      priority: "medium",
      security_controls_required: [],
      compliance_alignment: { nist_csf: [], cisa: [], zero_trust: [] },
      validation_steps: [],
      regression_risks: [],
      monitoring_plan: {
        frequency: "weekly review",
        signals: [],
        alert_conditions: [],
        operator_dashboard_fields: [],
      },
      retainer_path: "",
      recommended_service: "ai_security_audit",
      recommended_next_step: "",
      next_route: buildNextRoute({ remediation_plan_id: planId, priority: "medium", risk_level: "medium", estimated_effort: "" }),
      engagement_id: engagement.id || engagement.engagement_id || null,
      status: engagement.status || "intake-received",
    });
  }

  return queue;
}

export function resolveRemediationPlanId(payload: Record<string, unknown>): string | null {
  const candidate = normalizeText(payload.remediation_plan_id || payload.remediationPlanId, 128);
  if (!candidate) return null;
  return /^remediation-plan-\d+$/.test(candidate) ? candidate : null;
}

const securityRemediationAgent = {
  securityRemediationMarketplaceModule,
  normalizeSecurityRemediationInput,
  generateSecurityRemediationPlan,
  recordSecurityRemediationSubmission,
  attachEngagementToSecurityRemediation,
  listSecurityRemediationQueue,
  resolveRemediationPlanId,
};

export default securityRemediationAgent;
