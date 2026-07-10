import type { BackboneEnv } from "./backboneEnv";
import type { WorkerEnv } from "./env";
import type { AiGatewayEnv } from "./aiGateway";
import { recordUsageEvent, isValidSessionId } from "./usage";
import { injectSecurityHeaders } from "./edge/headers";
import {
  handleFulfillmentAgentApi,
  processAiAgentBuildEngagement,
  processLocalAiDeploymentEngagement,
  processNorthstarBeaconEngagement,
  processRagArchitectureEngagement,
  processSecurityRemediationEngagement,
  resolveAiAgentBuildId,
  resolveBeaconOrderId,
  resolveDeploymentPlanId,
  resolveRagPlanId,
  resolveRemediationPlanId,
} from "./fulfillmentAgentRoutes";

type FunnelRecoveryEnv = {
  TTX_STATE?: KVNamespace;
};

type ServiceCatalogItem = {
  slug: string;
  name: string;
  public_description: string;
  best_for: string;
  price_range: string;
  delivery_time: string;
  default_cta: string;
  icon: string;
};

type RegisterRecord = {
  register_id: string;
  register_lookup_id: string;
  name: string;
  email: string;
  role: string;
  reason: string;
  created_at: string;
  lifecycle_status: string;
  lifecycle_label: string;
  lifecycle_timeline: Array<{ status: string; label: string; at: string; note?: string }>;
  observer_mode: boolean;
  operator_mode: boolean;
  permission_profile: string;
  security_stage: string;
  agent_config_key: string;
};

type EngagementRecord = {
  id: string;
  engagement_id: string;
  status_lookup_id: string;
  operator_handle: string;
  organization: string | null;
  contact_email: string;
  transmission: string;
  source: string;
  source_reference_id: string | null;
  module_interest: string | null;
  urgency: string | null;
  selector_id: string | null;
  recommended_service: string | null;
  secondary_service: string | null;
  priority: string | null;
  revenue_potential: string | null;
  urgency_score: number | null;
  audit_id: string | null;
  register_id: string | null;
  scan_id: string | null;
  agent_check_id: string | null;
  automation_roi_id: string | null;
  rag_risk_id: string | null;
  risk_score: number | null;
  injection_score: number | null;
  risk_tier: string | null;
  readiness_score: number | null;
  readiness_tier: string | null;
  roi_score: number | null;
  roi_tier: string | null;
  rag_risk_score: number | null;
  rag_risk_tier: string | null;
  retrieval_exposure_level: string | null;
  access_control_level: string | null;
  governance_maturity: string | null;
  build_complexity: string | null;
  automation_complexity: string | null;
  safety_level: string | null;
  security_event_id: string | null;
  security_severity: string | null;
  security_recommended_action: string | null;
  quote_id: string | null;
  estimated_project_value: number | null;
  price_range: string | null;
  package_tier: string | null;
  complexity_level: string | null;
  risk_level: string | null;
  urgency_level: string | null;
  ai_agent_build_id: string | null;
  agent_name: string | null;
  agent_category: string | null;
  estimated_effort: string | null;
  delivery_timeline: string | null;
  remediation_plan_id: string | null;
  compliance_alignment: string | null;
  rag_plan_id: string | null;
  deployment_plan_id: string | null;
  beacon_order_id: string | null;
  status: string;
  createdAt: string;
};

type PublicStatusSummary = {
  engagement_id: string;
  status_lookup_id: string;
  status: string;
  source: string;
  createdAt: string;
};

type RateLimitRule = {
  max: number;
  windowMs: number;
};

const KV_NAMESPACE_PREFIX = "mshops:funnel:v1";
const REGISTER_INDEX_KEY = `${KV_NAMESPACE_PREFIX}:register:index`;
const ENGAGEMENT_INDEX_KEY = `${KV_NAMESPACE_PREFIX}:engagement:index`;
const MAX_SELECTOR_BODY_BYTES = 6_144;
const MAX_REGISTER_BODY_BYTES = 4_096;
const MAX_ENGAGEMENT_BODY_BYTES = 16_384;
const REGISTER_RETENTION_SECONDS = 60 * 60 * 24 * 30;
const ENGAGEMENT_RETENTION_SECONDS = 60 * 60 * 24 * 30;
const LOOKUP_TOKEN_BYTES = 16;
const WRITE_LIMIT: RateLimitRule = { max: 8, windowMs: 5 * 60_000 };
const LOOKUP_LIMIT: RateLimitRule = { max: 20, windowMs: 60_000 };
const AGGREGATE_LIMIT: RateLimitRule = { max: 10, windowMs: 60_000 };
const fieldRateLimitBuckets = new Map<string, { count: number; windowStart: number }>();

const RECOVERED_ROUTE_MAP: Record<string, string> = {
  "/about": "/about.html",
  "/apps/ai-agent-readiness-checker": "/ai-agent-readiness-checker.html",
  "/apps/ai-security-audit": "/ai-security-audit.html",
  "/apps/cloudflare-security-audit-lite": "/cloudflare-security-audit-lite.html",
  "/apps/ai-service-quote": "/ai-service-quote.html",
  "/apps/automation-builder": "/automation-builder.html",
  "/apps/ai-agent-builder": "/ai-agent-builder.html",
  "/operator/ai-agent-builds": "/ai-agent-builds-operator.html",
  "/apps/security-remediation-planner": "/security-remediation-planner.html",
  "/operator/security-remediation": "/security-remediation-operator.html",
  "/apps/rag-architecture-planner": "/rag-architecture-planner.html",
  "/operator/rag-architectures": "/rag-architectures-operator.html",
  "/apps/local-ai-deployment-planner": "/local-ai-deployment-planner.html",
  "/operator/local-ai-deployments": "/local-ai-deployments-operator.html",
  "/apps/northstar-beacon": "/northstar-beacon.html",
  "/operator/northstar-beacon-orders": "/northstar-beacon-operator.html",
  "/apps/automation-roi-calculator": "/automation-roi-calculator.html",
  "/apps/prompt-injection-scanner": "/prompt-injection-scanner.html",
  "/apps/rag-risk-analyzer": "/rag-risk-analyzer.html",
  "/apps/security-fleet": "/security-fleet.html",
  "/contact": "/contact.html",
  "/docs": "/docs.html",
  "/ecosystem": "/ecosystem.html",
  "/enter": "/enter.html",
  "/intake": "/intake.html",
  "/mission": "/mission.html",
  "/onboarding": "/onboarding.html",
  "/register": "/register.html",
  "/roadmap": "/roadmap.html",
  "/scenario": "/scenario.html",
  "/services": "/services.html",
  "/start": "/start.html",
  "/status": "/status.html",
};

const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    slug: "ai_security_audit",
    name: "AI Security Audit",
    public_description: "Identify vulnerabilities in your AI stack before they become breaches.",
    best_for: "Customer-facing AI or regulated data",
    price_range: "$2,500 - $8,500",
    delivery_time: "5-10 business days",
    default_cta: "Start Security Intake",
    icon: "SEC",
  },
  {
    slug: "cloudflare_security_audit_lite",
    name: "Cloudflare Security Audit Lite",
    public_description: "Instant Cloudflare and web security posture report with paid JSON/PDF delivery.",
    best_for: "Public sites that need immediate edge hardening clarity",
    price_range: "$299",
    delivery_time: "<5 minutes",
    default_cta: "Run Cloudflare Audit",
    icon: "CFL",
  },
  {
    slug: "security_remediation",
    name: "Security Remediation Planning",
    public_description: "Convert audit findings and prompt injection scans into prioritized remediation roadmaps.",
    best_for: "Teams with active AI security findings needing a fix plan",
    price_range: "$2,500 - $12,000",
    delivery_time: "1-4 weeks",
    default_cta: "Generate Remediation Plan",
    icon: "REM",
  },
  {
    slug: "ai_agent_build",
    name: "AI Agent Build",
    public_description: "Custom AI agents that take action across real business workflows.",
    best_for: "Multi-step business automation",
    price_range: "$4,000 - $18,000",
    delivery_time: "2-6 weeks",
    default_cta: "Start Agent Intake",
    icon: "AGT",
  },
  {
    slug: "ai_automation_systems",
    name: "AI Automation Systems",
    public_description: "Replace manual workflows with intelligent, reliable automation.",
    best_for: "Ops-heavy teams with repetitive processes",
    price_range: "$3,000 - $12,000",
    delivery_time: "2-4 weeks",
    default_cta: "Start Automation Intake",
    icon: "AUT",
  },
  {
    slug: "private_rag_system_build",
    name: "RAG Architecture Planning",
    public_description: "Design enterprise-grade RAG architectures with retrieval, ranking, and governance controls.",
    best_for: "Teams building private knowledge assistants or customer-facing RAG",
    price_range: "$4,000 - $18,000",
    delivery_time: "2-6 weeks",
    default_cta: "Plan RAG Architecture",
    icon: "RAG",
  },
  {
    slug: "local_ai_setup",
    name: "Local AI Setup",
    public_description: "Deploy AI models on your own infrastructure without cloud dependency.",
    best_for: "Privacy-first, air-gapped, or controlled local inference environments",
    price_range: "$2,000 - $7,500",
    delivery_time: "1-3 weeks",
    default_cta: "Start Local AI Intake",
    icon: "LOC",
  },
  {
    slug: "rag_governance_review",
    name: "RAG Governance Review",
    public_description: "Audit and improve your retrieval-augmented generation pipelines.",
    best_for: "Existing RAG or knowledge assistants",
    price_range: "$3,500 - $9,000",
    delivery_time: "1-2 weeks",
    default_cta: "Start RAG Intake",
    icon: "RAG",
  },
  {
    slug: "northstar_beacon_governance",
    name: "Northstar Beacon Governance App",
    public_description:
      "Create an immutable strategic Beacon every agent must load, validate, and reference before recommendations or execution approval.",
    best_for: "AI agencies, multi-agent builders, and regulated operators",
    price_range: "$99 - $2,500+",
    delivery_time: "Instant package generation",
    default_cta: "Configure Beacon Package",
    icon: "BCN",
  },
  {
    slug: "copilot_governance",
    name: "Copilot Governance",
    public_description: "Govern, monitor, and secure Microsoft Copilot in your enterprise.",
    best_for: "Enterprise AI rollouts",
    price_range: "$3,000 - $10,000",
    delivery_time: "1-3 weeks",
    default_cta: "Start Governance Intake",
    icon: "COP",
  },
];

const ROUTE_METHODS = new Map<string, readonly string[]>([
  ["/api/growth/track", ["POST"]],
  ["/api/growth/posture", ["GET"]],
  ["/api/public/demo-mode", ["GET"]],
  ["/api/service-selector/catalog", ["GET"]],
  ["/api/service-selector", ["POST"]],
  ["/api/register", ["POST"]],
  ["/api/register-lifecycle", ["GET"]],
  ["/api/register-security", ["GET"]],
  ["/api/register-queue", ["GET"]],
  ["/api/engagements/create", ["POST"]],
  ["/api/engagements", ["POST"]],
  ["/api/engagements/status", ["GET"]],
  ["/api/audit-lite/lifecycle", ["GET"]],
  ["/api/ai-agent-build-spec-generate", ["POST"]],
  ["/api/security-remediation-plan-generate", ["POST"]],
  ["/api/rag-architecture-plan-generate", ["POST"]],
  ["/api/local-ai-deployment-plan-generate", ["POST"]],
  ["/api/northstar-beacon/catalog", ["GET"]],
  ["/api/northstar-beacon/validate", ["POST"]],
  ["/api/northstar-beacon/hash", ["POST"]],
  ["/api/northstar-beacon/generate", ["POST"]],
  ["/api/northstar-beacon/proposal", ["POST"]],
  ["/api/marketplace/service-modules", ["GET"]],
]);

const SERVICE_SELECTOR_KEYS = [
  "primary_goal",
  "business_type",
  "current_ai_usage",
  "risk_level",
  "budget_range",
  "urgency",
  "source_route",
] as const;

const REGISTER_KEYS = ["name", "email", "role", "reason"] as const;

const ENGAGEMENT_KEYS = [
  "operator_handle",
  "contact_email",
  "organization",
  "module_interest",
  "urgency",
  "transmission",
  "service",
  "priority",
  "source",
  "selector_id",
  "audit_id",
  "register_id",
  "scan_id",
  "agent_check_id",
  "automation_roi_id",
  "rag_risk_id",
  "risk_score",
  "injection_score",
  "risk_tier",
  "readiness_score",
  "readiness_tier",
  "roi_score",
  "roi_tier",
  "rag_risk_score",
  "rag_risk_tier",
  "estimated_monthly_savings",
  "estimated_annual_savings",
  "hours_saved_per_month",
  "retrieval_exposure_level",
  "access_control_level",
  "governance_maturity",
  "build_complexity",
  "automation_complexity",
  "safety_level",
  "security_event_id",
  "security_severity",
  "security_recommended_action",
  "quote_id",
  "estimated_project_value",
  "price_range",
  "package_tier",
  "complexity_level",
  "risk_level",
  "urgency_level",
  "source_reference_id",
  "recommended_service",
  "secondary_service",
  "revenue_potential",
  "urgency_score",
  "ai_agent_build_id",
  "agent_name",
  "agent_category",
  "estimated_effort",
  "delivery_timeline",
  "remediation_plan_id",
  "compliance_alignment",
  "rag_plan_id",
  "deployment_plan_id",
  "beacon_order_id",
  "sessionId",
] as const;

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

function buildKvKey(scope: "register" | "engagement", id: string): string {
  return `${KV_NAMESPACE_PREFIX}:${scope}:${id}`;
}

function randomOpaqueId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LOOKUP_TOKEN_BYTES));
  const token = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${token}`;
}

function normalizeText(value: unknown, maxLength = 512): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  return normalized.slice(0, maxLength);
}

function normalizeMultilineText(value: unknown, maxLength = 4_000): string {
  if (typeof value !== "string") return "";
  const normalized = value
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
  return normalized.slice(0, maxLength);
}

function normalizeNullable(value: unknown, maxLength = 512): string | null {
  const normalized = normalizeText(value, maxLength);
  return normalized || null;
}

function containsDangerousMarkup(value: string): boolean {
  return /<[^>]+>|javascript:|data:text\/html|onerror\s*=|onload\s*=/i.test(value);
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value, 320).toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function derivePriority(urgencyScore: number): string {
  if (urgencyScore >= 75) return "high";
  if (urgencyScore >= 40) return "medium";
  return "low";
}

function deriveRevenuePotential(budgetRange: string): string {
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

function computeUrgencyScore(answers: {
  urgency?: string;
  risk_level?: string;
  business_type?: string;
  current_ai_usage?: string[];
}): number {
  let score = 20;
  const usage = Array.isArray(answers.current_ai_usage) ? answers.current_ai_usage : [];

  if (answers.urgency === "this_week") score += 25;
  if (answers.urgency === "this_month") score += 15;
  if (answers.urgency === "planning_phase") score += 5;
  if (answers.risk_level === "regulated_compliance_heavy") score += 30;
  if (answers.risk_level === "customer_facing_ai" || answers.risk_level === "handling_sensitive_data") score += 20;
  if (answers.risk_level === "unknown") score += 10;
  if (answers.risk_level === "internal_only_ai") score += 5;
  if (answers.business_type === "enterprise_team" || answers.business_type === "regulated_business") score += 20;
  if (answers.business_type === "saas_company" || answers.business_type === "agency") score += 10;
  if (usage.includes("customer_chatbot")) score += 15;
  if (usage.includes("rag_system")) score += 10;
  if (usage.includes("multimodal_ai")) score += 10;
  if (usage.includes("microsoft_copilot")) score += 5;
  if (usage.includes("n8n_make_zapier")) score += 5;

  return Math.max(0, Math.min(100, score));
}

function resolveRecommendedServices(primaryGoal: string) {
  switch (primaryGoal) {
    case "build_ai_agent":
      return { primary: "ai_agent_build", secondary: "ai_automation_systems" };
    case "automate_workflow":
      return { primary: "ai_automation_systems", secondary: "ai_agent_build" };
    case "improve_ai_visibility":
      return { primary: "rag_governance_review", secondary: "copilot_governance" };
    case "govern_copilot_enterprise_ai":
      return { primary: "copilot_governance", secondary: "ai_security_audit" };
    default:
      return { primary: "ai_security_audit", secondary: "copilot_governance" };
  }
}

function resolveRecoveredHtml(pathname: string): string | null {
  return RECOVERED_ROUTE_MAP[normalizePath(pathname)] ?? null;
}

function jsonResponse(payload: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(payload, { status, headers });
}

function rateLimitKey(request: Request, scope: string): string {
  const ip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  return `${scope}:${ip}`;
}

function isRateLimited(key: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  const bucket = fieldRateLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= rule.windowMs) {
    fieldRateLimitBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > rule.max;
}

function checkRateLimit(request: Request, scope: string, rule: RateLimitRule): Response | null {
  if (!isRateLimited(rateLimitKey(request, scope), rule)) return null;
  return jsonResponse({ error: "Rate limit exceeded" }, 429, {
    "Retry-After": String(Math.ceil(rule.windowMs / 1000)),
  });
}

function registerSecurityPlane() {
  return {
    module: {
      security_stage: "intake",
      permission_profile: "public_intake",
      agent_config_key: "intake_agent_v2",
      requires_threat_modeling: false,
    },
    threat_hooks: {
      firedCount: 0,
    },
  };
}

function requireDurableStore(env: FunnelRecoveryEnv): KVNamespace | null {
  return env.TTX_STATE ?? null;
}

async function readKvJson<T>(kv: KVNamespace, key: string, fallback: T): Promise<T> {
  const raw = await kv.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function appendIdToIndex(kv: KVNamespace, indexKey: string, id: string): Promise<void> {
  const ids = await readKvJson<string[]>(kv, indexKey, []);
  if (!ids.includes(id)) {
    ids.push(id);
    await kv.put(indexKey, JSON.stringify(ids));
  }
}

async function saveRegister(kv: KVNamespace, record: RegisterRecord): Promise<void> {
  await appendIdToIndex(kv, REGISTER_INDEX_KEY, record.register_id);
  await kv.put(buildKvKey("register", record.register_id), JSON.stringify(record), {
    expirationTtl: REGISTER_RETENTION_SECONDS,
  });
}

async function saveEngagement(kv: KVNamespace, record: EngagementRecord): Promise<void> {
  await appendIdToIndex(kv, ENGAGEMENT_INDEX_KEY, record.engagement_id);
  await kv.put(buildKvKey("engagement", record.engagement_id), JSON.stringify(record), {
    expirationTtl: ENGAGEMENT_RETENTION_SECONDS,
  });
}

async function listRegisters(kv: KVNamespace): Promise<RegisterRecord[]> {
  const ids = await readKvJson<string[]>(kv, REGISTER_INDEX_KEY, []);
  const records = await Promise.all(ids.map((id) => readKvJson<RegisterRecord | null>(kv, buildKvKey("register", id), null)));
  return records.filter(Boolean) as RegisterRecord[];
}

async function listEngagements(kv: KVNamespace): Promise<EngagementRecord[]> {
  const ids = await readKvJson<string[]>(kv, ENGAGEMENT_INDEX_KEY, []);
  const records = await Promise.all(ids.map((id) => readKvJson<EngagementRecord | null>(kv, buildKvKey("engagement", id), null)));
  return records.filter(Boolean) as EngagementRecord[];
}

async function getRegisterById(kv: KVNamespace, registerId: string): Promise<RegisterRecord | null> {
  return readKvJson<RegisterRecord | null>(kv, buildKvKey("register", registerId), null);
}

async function getEngagementById(kv: KVNamespace, engagementId: string): Promise<EngagementRecord | null> {
  return readKvJson<EngagementRecord | null>(kv, buildKvKey("engagement", engagementId), null);
}

async function findRegisterByLookupId(kv: KVNamespace, lookupId: string): Promise<RegisterRecord | null> {
  const registers = await listRegisters(kv);
  return registers.find((record) => record.register_lookup_id === lookupId) ?? null;
}

async function findEngagementByLookupId(kv: KVNamespace, lookupId: string): Promise<EngagementRecord | null> {
  const engagements = await listEngagements(kv);
  return engagements.find((record) => record.status_lookup_id === lookupId) ?? null;
}

async function readJsonBody(request: Request, allowedKeys: readonly string[], maxBytes: number): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "Content-Type must be application/json");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiError(413, "Payload too large");
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new ApiError(413, "Payload too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError(400, "JSON body must be an object");
  }

  const payload = parsed as Record<string, unknown>;
  const unknownKeys = Object.keys(payload).filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length) {
    throw new ApiError(400, `Unsupported fields: ${unknownKeys.join(", ")}`);
  }

  return payload;
}

function validateCleanText(value: string, field: string, required = false): string {
  if (required && !value) {
    throw new ApiError(400, `${field} is required`);
  }
  if (value && containsDangerousMarkup(value)) {
    throw new ApiError(400, `${field} contains unsupported markup`);
  }
  return value;
}

function normalizeSelectorAnswers(payload: Record<string, unknown>) {
  const currentAiUsage = Array.isArray(payload.current_ai_usage)
    ? payload.current_ai_usage.map((value) => normalizeText(value, 64)).filter(Boolean)
    : ["no_ai_yet"];

  return {
    primary_goal: validateCleanText(normalizeText(payload.primary_goal, 64) || "not_sure", "primary_goal", true),
    business_type: validateCleanText(normalizeText(payload.business_type, 64) || "small_business", "business_type", true),
    current_ai_usage: currentAiUsage.length ? currentAiUsage : ["no_ai_yet"],
    risk_level: validateCleanText(normalizeText(payload.risk_level, 64) || "unknown", "risk_level", true),
    budget_range: validateCleanText(normalizeText(payload.budget_range, 64) || "not_sure", "budget_range", true),
    urgency: validateCleanText(normalizeText(payload.urgency, 64) || "research_only", "urgency", true),
  };
}

function normalizeRegisterPayload(payload: Record<string, unknown>) {
  const name = validateCleanText(normalizeText(payload.name, 160), "name", true);
  const email = normalizeEmail(payload.email);
  const role = validateCleanText(normalizeText(payload.role, 64) || "observer", "role", true);
  const reason = validateCleanText(normalizeMultilineText(payload.reason, 1_000), "reason", true);
  if (!isValidEmail(email)) {
    throw new ApiError(400, "email must be a valid email address");
  }
  return { name, email, role, reason };
}

function normalizeEngagementPayload(payload: Record<string, unknown>) {
  const operatorHandle = validateCleanText(normalizeText(payload.operator_handle, 160), "operator_handle", true);
  const contactEmail = normalizeEmail(payload.contact_email);
  const transmission = validateCleanText(normalizeMultilineText(payload.transmission, 3_500), "transmission", true);

  if (!isValidEmail(contactEmail)) {
    throw new ApiError(400, "contact_email must be a valid email address");
  }

  return {
    operatorHandle,
    contactEmail,
    organization: normalizeNullable(payload.organization, 160),
    moduleInterest: normalizeNullable(payload.module_interest, 128),
    urgency: normalizeNullable(payload.urgency, 64),
    transmission,
    source: validateCleanText(normalizeText(payload.source, 96) || "enter-funnel", "source", true),
    service: normalizeNullable(payload.service, 128),
    priority: normalizeNullable(payload.priority, 64),
    selectorId: normalizeNullable(payload.selector_id, 128),
    auditId: normalizeNullable(payload.audit_id, 128),
    registerId: normalizeNullable(payload.register_id, 128),
    scanId: normalizeNullable(payload.scan_id, 128),
    agentCheckId: normalizeNullable(payload.agent_check_id, 128),
    automationRoiId: normalizeNullable(payload.automation_roi_id, 128),
    ragRiskId: normalizeNullable(payload.rag_risk_id, 128),
    riskScore: numberOrNull(payload.risk_score),
    injectionScore: numberOrNull(payload.injection_score),
    riskTier: normalizeNullable(payload.risk_tier, 64),
    readinessScore: numberOrNull(payload.readiness_score),
    readinessTier: normalizeNullable(payload.readiness_tier, 64),
    roiScore: numberOrNull(payload.roi_score),
    roiTier: normalizeNullable(payload.roi_tier, 64),
    ragRiskScore: numberOrNull(payload.rag_risk_score),
    ragRiskTier: normalizeNullable(payload.rag_risk_tier, 64),
    retrievalExposureLevel: normalizeNullable(payload.retrieval_exposure_level, 64),
    accessControlLevel: normalizeNullable(payload.access_control_level, 64),
    governanceMaturity: normalizeNullable(payload.governance_maturity, 64),
    buildComplexity: normalizeNullable(payload.build_complexity, 64),
    automationComplexity: normalizeNullable(payload.automation_complexity, 64),
    safetyLevel: normalizeNullable(payload.safety_level, 64),
    securityEventId: normalizeNullable(payload.security_event_id, 128),
    securitySeverity: normalizeNullable(payload.security_severity, 64),
    securityRecommendedAction: normalizeNullable(payload.security_recommended_action, 256),
    quoteId: normalizeNullable(payload.quote_id, 128),
    estimatedProjectValue: numberOrNull(payload.estimated_project_value),
    priceRange: normalizeNullable(payload.price_range, 64),
    packageTier: normalizeNullable(payload.package_tier, 64),
    complexityLevel: normalizeNullable(payload.complexity_level, 64),
    riskLevel: normalizeNullable(payload.risk_level, 64),
    urgencyLevel: normalizeNullable(payload.urgency_level, 64),
    sourceReferenceId: normalizeNullable(payload.source_reference_id, 128),
    recommendedService: normalizeNullable(payload.recommended_service, 128),
    secondaryService: normalizeNullable(payload.secondary_service, 128),
    revenuePotential: normalizeNullable(payload.revenue_potential, 64),
    urgencyScore: numberOrNull(payload.urgency_score),
    aiAgentBuildId: resolveAiAgentBuildId(payload),
    agentName: normalizeNullable(payload.agent_name, 256),
    agentCategory: normalizeNullable(payload.agent_category, 128),
    estimatedEffort: normalizeNullable(payload.estimated_effort, 128),
    deliveryTimeline: normalizeNullable(payload.delivery_timeline, 64),
    remediationPlanId: resolveRemediationPlanId(payload),
    complianceAlignment: normalizeNullable(payload.compliance_alignment, 256),
    ragPlanId: resolveRagPlanId(payload),
    deploymentPlanId: resolveDeploymentPlanId(payload),
    beaconOrderId: resolveBeaconOrderId(payload),
  };
}

function summarizeEngagement(record: EngagementRecord): PublicStatusSummary {
  return {
    engagement_id: record.engagement_id,
    status_lookup_id: record.status_lookup_id,
    status: record.status,
    source: record.source,
    createdAt: record.createdAt,
  };
}

async function registerQueuePreview(kv: KVNamespace) {
  const values = await listRegisters(kv);
  const lifecycle_distribution = values.reduce<Record<string, number>>((acc, record) => {
    acc[record.lifecycle_status] = (acc[record.lifecycle_status] || 0) + 1;
    return acc;
  }, {});

  return {
    queue_length: values.length,
    total: values.length,
    lifecycle_distribution,
    last_submission: values.length
      ? {
          register_id: values.at(-1)?.register_id ?? null,
          lifecycle_status: values.at(-1)?.lifecycle_status ?? null,
          created_at: values.at(-1)?.created_at ?? null,
        }
      : null,
    security_plane: registerSecurityPlane(),
  };
}

export function redirectWelcomeToRoot(request: Request, pathname: string): Response | null {
  if (normalizePath(pathname) !== "/welcome") return null;
  if (request.method === "GET" || request.method === "HEAD") {
    return Response.redirect(new URL("/", request.url).toString(), 302);
  }
  return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD" });
}

export function isRecoveredPublicRoute(pathname: string): boolean {
  return resolveRecoveredHtml(pathname) !== null;
}

export async function serveRecoveredPublicRoute(request: Request, pathname: string, assets: Fetcher): Promise<Response | null> {
  const targetPath = resolveRecoveredHtml(pathname);
  if (!targetPath) return null;

  const url = new URL(request.url);
  url.pathname = targetPath;
  const response = await assets.fetch(new Request(url.toString(), { method: "GET", headers: request.headers }));
  if (response.status === 404 && pathname !== "/") {
    return jsonResponse({ error: "Not found" }, 404);
  }
  return injectSecurityHeaders(response);
}

export async function handleRecoveredFunnelApi(request: Request, url: URL, env: FunnelRecoveryEnv): Promise<Response | null> {
  const pathname = normalizePath(url.pathname);
  const method = request.method.toUpperCase();
  const allowedMethods = ROUTE_METHODS.get(pathname);

  if (!allowedMethods) {
    return null;
  }

  if (!allowedMethods.includes(method)) {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: allowedMethods.join(", ") });
  }

  try {
    if (method === "POST" && pathname === "/api/growth/track") {
      if (env.TTX_STATE) {
        try {
          const payload = await readJsonBody(request, ["event", "sessionId", "trafficSource", "campaignId"], 4096);
          const event = typeof payload.event === "string" ? payload.event : "";
          const sessionId = payload.sessionId;
          if (isValidSessionId(sessionId) && event) {
            const allowed = [
              "visit",
              "entry_click",
              "marketplace_click",
              "service_view",
              "intake_started",
              "intake_completed",
              "checkout_started",
              "purchase_completed",
            ];
            if (allowed.includes(event)) {
              await recordUsageEvent(env as WorkerEnv, {
                event: event as Parameters<typeof recordUsageEvent>[1]["event"],
                sessionId,
                trafficSource: typeof payload.trafficSource === "string" ? payload.trafficSource : undefined,
                campaignId: typeof payload.campaignId === "string" ? payload.campaignId : undefined,
              });
            }
          }
        } catch {
          // backward-compatible no-op on malformed payloads
        }
      }
      return new Response(null, { status: 202 });
    }

    if (method === "GET" && pathname === "/api/growth/posture") {
      return jsonResponse({ fedgrade_enabled: true, advisory_only: true }, 200);
    }

    if (method === "GET" && pathname === "/api/public/demo-mode") {
      return jsonResponse(
        {
          demo_mode: false,
          cockpit_status: "under_construction",
          cockpit_message: "Operator Cockpit Under Construction - your registration will receive updates as systems come online.",
        },
        200,
        { "Cache-Control": "no-store" },
      );
    }

    if (method === "GET" && pathname === "/api/service-selector/catalog") {
      return jsonResponse({ services: SERVICE_CATALOG }, 200, { "Cache-Control": "no-store" });
    }

    if (method === "POST" && pathname === "/api/service-selector") {
      const limited = checkRateLimit(request, "service-selector:write", WRITE_LIMIT);
      if (limited) return limited;

      const payload = await readJsonBody(request, SERVICE_SELECTOR_KEYS, MAX_SELECTOR_BODY_BYTES);
      const answers = normalizeSelectorAnswers(payload);
      const recommendation = resolveRecommendedServices(answers.primary_goal);
      const selector_id = randomOpaqueId("sel");
      const urgency_score = computeUrgencyScore(answers);
      const priority = derivePriority(urgency_score);
      const next = new URLSearchParams({
        service: recommendation.primary,
        priority,
        source: "service-selector",
        selector_id,
      });

      return jsonResponse(
        {
          status: "service-match-ready",
          selector_id,
          recommended_service: recommendation.primary,
          secondary_service: recommendation.secondary,
          urgency_score,
          revenue_potential: deriveRevenuePotential(answers.budget_range),
          priority,
          next_route: `/enter?${next.toString()}`,
          explanation: `${recommendation.primary.replace(/_/g, " ")} is the strongest fit based on your goal, current AI usage, and urgency.`,
        },
        200,
        { "Cache-Control": "no-store" },
      );
    }

    if (method === "POST" && pathname === "/api/register") {
      const limited = checkRateLimit(request, "register:write", WRITE_LIMIT);
      if (limited) return limited;

      const kv = requireDurableStore(env);
      if (!kv) {
        throw new ApiError(503, "Public registration is temporarily unavailable");
      }

      const payload = await readJsonBody(request, REGISTER_KEYS, MAX_REGISTER_BODY_BYTES);
      const normalized = normalizeRegisterPayload(payload);
      const register_id = randomOpaqueId("reg");
      const register_lookup_id = randomOpaqueId("rlook");
      const created_at = new Date().toISOString();
      const record: RegisterRecord = {
        register_id,
        register_lookup_id,
        name: normalized.name,
        email: normalized.email,
        role: normalized.role,
        reason: normalized.reason,
        created_at,
        lifecycle_status: "received",
        lifecycle_label: "Pending Intake",
        lifecycle_timeline: [
          {
            status: "received",
            label: "Pending Intake",
            at: created_at,
            note: "Public registration captured and queued for operator review.",
          },
        ],
        observer_mode: true,
        operator_mode: false,
        permission_profile: "public_intake",
        security_stage: "intake",
        agent_config_key: "intake_agent_v2",
      };

      await saveRegister(kv, record);

      return jsonResponse(
        {
          status: "pending",
          mode: "public",
          received_at: created_at,
          register_id,
          register_lookup_id,
          role: record.role,
          lifecycle: {
            register_id: record.register_id,
            lifecycle_status: record.lifecycle_status,
            lifecycle_label: record.lifecycle_label,
            lifecycle_timeline: record.lifecycle_timeline,
            observer_mode: record.observer_mode,
            operator_mode: record.operator_mode,
          },
          security_plane: registerSecurityPlane(),
          queue_preview: await registerQueuePreview(kv),
          permission_profile: record.permission_profile,
          security_stage: record.security_stage,
          agent_config_key: record.agent_config_key,
        },
        200,
        { "Cache-Control": "no-store" },
      );
    }

    if (method === "GET" && pathname === "/api/register-lifecycle") {
      const limited = checkRateLimit(request, "register:lookup", LOOKUP_LIMIT);
      if (limited) return limited;

      const kv = requireDurableStore(env);
      if (!kv) {
        throw new ApiError(503, "Registration lookup is temporarily unavailable");
      }

      const register_id = normalizeText(url.searchParams.get("register_id"), 128);
      const lookup_id = normalizeText(url.searchParams.get("lookup"), 128);
      if (!register_id && !lookup_id) {
        throw new ApiError(400, "register_id or lookup is required");
      }

      const record = register_id ? await getRegisterById(kv, register_id) : await findRegisterByLookupId(kv, lookup_id);
      if (!record) {
        return jsonResponse({ error: "Register lifecycle not found" }, 404);
      }

      return jsonResponse(
        {
          register_id: record.register_id,
          lifecycle_status: record.lifecycle_status,
          lifecycle_label: record.lifecycle_label,
          lifecycle_timeline: record.lifecycle_timeline,
          observer_mode: record.observer_mode,
          operator_mode: record.operator_mode,
        },
        200,
        { "Cache-Control": "no-store" },
      );
    }

    if (method === "GET" && pathname === "/api/register-security") {
      const limited = checkRateLimit(request, "register:security", AGGREGATE_LIMIT);
      if (limited) return limited;
      return jsonResponse(registerSecurityPlane(), 200, { "Cache-Control": "no-store" });
    }

    if (method === "GET" && pathname === "/api/register-queue") {
      const limited = checkRateLimit(request, "register:queue", AGGREGATE_LIMIT);
      if (limited) return limited;

      const kv = requireDurableStore(env);
      if (!kv) {
        throw new ApiError(503, "Registration queue is temporarily unavailable");
      }

      return jsonResponse(await registerQueuePreview(kv), 200, { "Cache-Control": "no-store" });
    }

    if (method === "POST" && (pathname === "/api/engagements/create" || pathname === "/api/engagements")) {
      const limited = checkRateLimit(request, "engagement:write", WRITE_LIMIT);
      if (limited) return limited;

      const kv = requireDurableStore(env);
      if (!kv) {
        throw new ApiError(503, "Public intake is temporarily unavailable");
      }

      const payload = await readJsonBody(request, ENGAGEMENT_KEYS, MAX_ENGAGEMENT_BODY_BYTES);
      const normalized = normalizeEngagementPayload(payload);
      const createdAt = new Date().toISOString();
      const engagement_id = randomOpaqueId("eng");
      const status_lookup_id = randomOpaqueId("stat");
      const record: EngagementRecord = {
        id: engagement_id,
        engagement_id,
        status_lookup_id,
        operator_handle: normalized.operatorHandle,
        organization: normalized.organization,
        contact_email: normalized.contactEmail,
        transmission: normalized.transmission,
        source: normalized.source,
        source_reference_id: normalized.sourceReferenceId,
        module_interest: normalized.moduleInterest ?? normalized.service,
        urgency: normalized.urgency,
        selector_id: normalized.selectorId,
        recommended_service: normalized.recommendedService ?? normalized.service,
        secondary_service: normalized.secondaryService,
        priority: normalized.priority,
        revenue_potential: normalized.revenuePotential,
        urgency_score: normalized.urgencyScore,
        audit_id: normalized.auditId,
        register_id: normalized.registerId,
        scan_id: normalized.scanId,
        agent_check_id: normalized.agentCheckId,
        automation_roi_id: normalized.automationRoiId,
        rag_risk_id: normalized.ragRiskId,
        risk_score: normalized.riskScore,
        injection_score: normalized.injectionScore,
        risk_tier: normalized.riskTier,
        readiness_score: normalized.readinessScore,
        readiness_tier: normalized.readinessTier,
        roi_score: normalized.roiScore,
        roi_tier: normalized.roiTier,
        rag_risk_score: normalized.ragRiskScore,
        rag_risk_tier: normalized.ragRiskTier,
        retrieval_exposure_level: normalized.retrievalExposureLevel,
        access_control_level: normalized.accessControlLevel,
        governance_maturity: normalized.governanceMaturity,
        build_complexity: normalized.buildComplexity,
        automation_complexity: normalized.automationComplexity,
        safety_level: normalized.safetyLevel,
        security_event_id: normalized.securityEventId,
        security_severity: normalized.securitySeverity,
        security_recommended_action: normalized.securityRecommendedAction,
        quote_id: normalized.quoteId,
        estimated_project_value: normalized.estimatedProjectValue,
        price_range: normalized.priceRange,
        package_tier: normalized.packageTier,
        complexity_level: normalized.complexityLevel,
        risk_level: normalized.riskLevel,
        urgency_level: normalized.urgencyLevel,
        ai_agent_build_id: normalized.aiAgentBuildId,
        agent_name: normalized.agentName,
        agent_category: normalized.agentCategory,
        estimated_effort: normalized.estimatedEffort,
        delivery_timeline: normalized.deliveryTimeline,
        remediation_plan_id: normalized.remediationPlanId,
        compliance_alignment: normalized.complianceAlignment,
        rag_plan_id: normalized.ragPlanId,
        deployment_plan_id: normalized.deploymentPlanId,
        beacon_order_id: normalized.beaconOrderId,
        status: "intake-received",
        createdAt,
      };

      await saveEngagement(kv, record);
      processAiAgentBuildEngagement(payload, record);
      processSecurityRemediationEngagement(payload, record);
      processRagArchitectureEngagement(payload, record);
      processLocalAiDeploymentEngagement(payload, record);
      processNorthstarBeaconEngagement(payload, record);

      if (env.TTX_STATE && isValidSessionId(payload.sessionId)) {
        void recordUsageEvent(env as WorkerEnv, {
          event: "intake_started",
          sessionId: payload.sessionId as string,
          trafficSource: typeof payload.source === "string" ? payload.source : undefined,
        }).catch(() => {});
      }

      return jsonResponse(
        {
          engagement_id,
          status_lookup_id,
          status: record.status,
          createdAt,
        },
        201,
        { "Cache-Control": "no-store" },
      );
    }

    if (method === "GET" && pathname === "/api/engagements/status") {
      const kv = requireDurableStore(env);
      if (!kv) {
        throw new ApiError(503, "Engagement lookup is temporarily unavailable");
      }

      const lookup = normalizeText(url.searchParams.get("lookup"), 128);
      const engagementId = normalizeText(url.searchParams.get("engagement_id"), 128);

      if (!lookup && !engagementId) {
        const limited = checkRateLimit(request, "engagement:aggregate", AGGREGATE_LIMIT);
        if (limited) return limited;
        const engagements = await listEngagements(kv);
        return jsonResponse({ engagements_count: engagements.length }, 200, { "Cache-Control": "no-store" });
      }

      const limited = checkRateLimit(request, "engagement:lookup", LOOKUP_LIMIT);
      if (limited) return limited;

      const record = lookup ? await findEngagementByLookupId(kv, lookup) : await getEngagementById(kv, engagementId);
      if (!record) {
        return jsonResponse({ error: "Engagement status not found" }, 404);
      }

      return jsonResponse(summarizeEngagement(record), 200, { "Cache-Control": "no-store" });
    }

    if (method === "GET" && pathname === "/api/audit-lite/lifecycle") {
      const limited = checkRateLimit(request, "audit-lite:lifecycle", LOOKUP_LIMIT);
      if (limited) return limited;

      const audit_id = normalizeText(url.searchParams.get("audit_id"), 128);
      if (!audit_id) {
        throw new ApiError(400, "audit_id is required");
      }

      return jsonResponse(
        {
          audit_id,
          lifecycle_label: "Observer Mode",
          lifecycle_timeline: [
            {
              status: "received",
              label: "Observer Mode",
              at: new Date().toISOString(),
              note: "Advisory risk-check context is attached to the public intake handoff.",
            },
          ],
          observer_mode: true,
          operator_mode: false,
        },
        200,
        { "Cache-Control": "no-store" },
      );
    }

    const fulfillmentResponse = await handleFulfillmentAgentApi(
      request,
      pathname,
      method,
      env as WorkerEnv & BackboneEnv & AiGatewayEnv,
    );
    if (fulfillmentResponse) {
      return fulfillmentResponse;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonResponse({ error: error.message }, error.status, { "Cache-Control": "no-store" });
    }
    return jsonResponse({ error: "Request failed" }, 400, { "Cache-Control": "no-store" });
  }

  return null;
}
