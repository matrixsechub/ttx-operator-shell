export type LocalAiDeploymentInput = {
  source_type: string;
  source_reference_id?: string;
  use_case: string;
  use_case_description?: string;
  model_family_preference: string;
  model_size_band: string;
  hardware_profile: string;
  hosting_strategy_preference: string;
  data_sensitivity: string;
  isolation_requirement: string;
  concurrent_users: string;
  workload_volume: string;
  latency_requirement: string;
  budget_band: string;
  timeline: string;
  access_model: string;
  compliance_notes?: string;
  diagnostic_context?: Record<string, unknown>;
  source_route?: string;
};

export type LocalAiDeploymentSubmission = LocalAiDeploymentInput & {
  deployment_plan_id: string;
  created_at: string;
  model_recommendation: string;
  model_size: string;
  hardware_requirements: {
    cpu: string;
    gpu: string;
    ram_gb: string;
    notes: string[];
  };
  storage_requirements: {
    model_weights_gb: string;
    vector_cache_gb: string;
    logs_gb: string;
    backup_gb: string;
  };
  hosting_strategy: "local" | "cloud" | "hybrid";
  latency_expectation: string;
  cost_estimate: string;
  data_isolation_model: string;
  security_controls: string[];
  access_control_model: string;
  update_strategy: string;
  monitoring_plan: {
    frequency: string;
    signals: string[];
    alert_conditions: string[];
    operator_dashboard_fields: string[];
  };
  scaling_plan: string;
  integration_points: string[];
  failure_modes: string[];
  backup_strategy: string;
  estimated_effort: string;
  timeline: string;
  complexity_level: "basic" | "moderate" | "advanced" | "enterprise";
  risk_level: "low" | "medium" | "high" | "critical";
  priority: "low" | "medium" | "high" | "critical";
  recommended_service: string;
  recommended_next_step: string;
  next_route: string;
  engagement_id?: string;
  status: "local-ai-deployment-plan-complete" | "intake-received";
};

export const localAiDeploymentMarketplaceModule = {
  module_id: "msh-local-ai-deployment-agent",
  service_slug: "local_ai_deployment_agent",
  name: "Local AI Deployment Agent",
  category: "AI Infrastructure / Local Deployment",
  public_service_route: "/apps/local-ai-deployment-planner",
  operator_route: "/operator/local-ai-deployments",
  description:
    "Deterministic advisory agent that designs private and local AI deployment architectures for secure, offline, or controlled environments.",
  revenue_type: "implementation_spec",
  base_price: 0,
  recommended_upsell: "Local AI Setup / AI Security Audit / Private RAG Build",
  required_inputs: [
    "source_type",
    "use_case",
    "model_family_preference",
    "model_size_band",
    "hardware_profile",
    "hosting_strategy_preference",
    "data_sensitivity",
    "isolation_requirement",
    "concurrent_users",
    "workload_volume",
    "latency_requirement",
    "timeline",
    "budget_band",
    "access_model",
  ],
  delivery_outputs: [
    "model_recommendation",
    "hardware_requirements",
    "storage_requirements",
    "hosting_strategy",
    "data_isolation_model",
    "security_controls",
    "monitoring_plan",
    "scaling_plan",
    "integration_points",
    "backup_strategy",
    "intake_route",
  ],
  status: "active",
};

const localAiDeploymentSubmissions: LocalAiDeploymentSubmission[] = [];

const SOURCE_TYPES = [
  "manual_request",
  "rag_architecture_plan",
  "ai_security_audit",
  "ai_agent_build_spec",
  "service_quote",
  "not_sure",
] as const;

const USE_CASES = [
  "offline_inference",
  "private_copilot",
  "regulated_data_assistant",
  "edge_inference",
  "air_gapped_ops",
  "not_sure",
] as const;

const MODEL_FAMILY_PREFERENCES = ["llama", "mistral", "qwen", "no_preference", "not_sure"] as const;
const MODEL_SIZE_BANDS = ["small_7b", "medium_13b", "large_70b", "not_sure"] as const;
const HARDWARE_PROFILES = ["cpu_only", "gpu_workstation", "apple_silicon", "edge_device", "server_cluster", "not_sure"] as const;
const HOSTING_PREFERENCES = ["local", "cloud", "hybrid", "not_sure"] as const;
const DATA_SENSITIVITIES = ["public", "internal", "confidential", "regulated", "not_sure"] as const;
const ISOLATION_REQUIREMENTS = [
  "network_airgap",
  "vpc_private",
  "single_tenant",
  "shared_host",
  "not_sure",
] as const;
const CONCURRENT_USERS = ["solo", "small_team", "department", "enterprise", "not_sure"] as const;
const WORKLOAD_VOLUMES = ["light", "moderate", "heavy", "bursty", "not_sure"] as const;
const LATENCY_REQUIREMENTS = ["low", "balanced", "batch_ok", "not_sure"] as const;
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
const ACCESS_MODELS = [
  "public_read",
  "authenticated",
  "role_based",
  "tenant_isolated",
  "operator_only",
  "not_sure",
] as const;

const USE_CASE_LABELS: Record<string, string> = {
  offline_inference: "Offline inference workload",
  private_copilot: "Private copilot for internal teams",
  regulated_data_assistant: "Regulated data assistant",
  edge_inference: "Edge inference deployment",
  air_gapped_ops: "Air-gapped operations environment",
  not_sure: "General local AI deployment",
};

const SENSITIVITY_WEIGHT: Record<string, number> = {
  public: 10,
  internal: 30,
  confidential: 55,
  regulated: 85,
  not_sure: 25,
};

const ISOLATION_WEIGHT: Record<string, number> = {
  shared_host: 15,
  single_tenant: 35,
  vpc_private: 55,
  network_airgap: 80,
  not_sure: 30,
};

const SIZE_WEIGHT: Record<string, number> = {
  small_7b: 15,
  medium_13b: 35,
  large_70b: 70,
  not_sure: 25,
};

const USER_WEIGHT: Record<string, number> = {
  solo: 10,
  small_team: 25,
  department: 45,
  enterprise: 70,
  not_sure: 20,
};

function normalizeText(value: unknown, maxLength = 512): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeMultiline(value: unknown, maxLength = 4000): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .slice(0, maxLength);
}

function clampEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const normalized = normalizeText(value, 96) as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function generateDeploymentPlanId(): string {
  return `deployment-plan-${1001 + localAiDeploymentSubmissions.length}`;
}

export function normalizeLocalAiDeploymentInput(payload: Record<string, unknown> = {}): LocalAiDeploymentInput {
  const diagnostic =
    payload.diagnostic_context && typeof payload.diagnostic_context === "object" && !Array.isArray(payload.diagnostic_context)
      ? (payload.diagnostic_context as Record<string, unknown>)
      : undefined;

  return {
    source_type: clampEnum(payload.source_type, SOURCE_TYPES, "not_sure"),
    source_reference_id:
      normalizeText(payload.source_reference_id, 128) ||
      normalizeText(payload.deployment_plan_id, 128) ||
      normalizeText(diagnostic?.deployment_plan_id, 128) ||
      undefined,
    use_case: clampEnum(payload.use_case, USE_CASES, "not_sure"),
    use_case_description: normalizeMultiline(payload.use_case_description, 2000) || undefined,
    model_family_preference: clampEnum(payload.model_family_preference, MODEL_FAMILY_PREFERENCES, "no_preference"),
    model_size_band: clampEnum(payload.model_size_band, MODEL_SIZE_BANDS, "not_sure"),
    hardware_profile: clampEnum(payload.hardware_profile, HARDWARE_PROFILES, "not_sure"),
    hosting_strategy_preference: clampEnum(payload.hosting_strategy_preference, HOSTING_PREFERENCES, "not_sure"),
    data_sensitivity: clampEnum(payload.data_sensitivity, DATA_SENSITIVITIES, "internal"),
    isolation_requirement: clampEnum(payload.isolation_requirement, ISOLATION_REQUIREMENTS, "not_sure"),
    concurrent_users: clampEnum(payload.concurrent_users, CONCURRENT_USERS, "small_team"),
    workload_volume: clampEnum(payload.workload_volume, WORKLOAD_VOLUMES, "moderate"),
    latency_requirement: clampEnum(payload.latency_requirement, LATENCY_REQUIREMENTS, "balanced"),
    budget_band: clampEnum(payload.budget_band, BUDGET_BANDS, "not_sure"),
    timeline: clampEnum(payload.timeline, TIMELINES, "this_month"),
    access_model: clampEnum(payload.access_model, ACCESS_MODELS, "authenticated"),
    compliance_notes: normalizeMultiline(payload.compliance_notes, 1500) || undefined,
    diagnostic_context: diagnostic,
    source_route: normalizeText(payload.source_route, 256) || "/apps/local-ai-deployment-planner",
  };
}

function scoreComplexity(input: LocalAiDeploymentInput): LocalAiDeploymentSubmission["complexity_level"] {
  let score = SIZE_WEIGHT[input.model_size_band] * 0.35;
  score += ISOLATION_WEIGHT[input.isolation_requirement] * 0.25;
  score += USER_WEIGHT[input.concurrent_users] * 0.2;
  if (input.hosting_strategy_preference === "hybrid") score += 12;
  if (input.use_case === "air_gapped_ops") score += 15;
  if (input.hardware_profile === "server_cluster") score += 10;
  if (input.workload_volume === "heavy" || input.workload_volume === "bursty") score += 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 75) return "enterprise";
  if (score >= 55) return "advanced";
  if (score >= 35) return "moderate";
  return "basic";
}

function scoreRisk(input: LocalAiDeploymentInput): LocalAiDeploymentSubmission["risk_level"] {
  let score = SENSITIVITY_WEIGHT[input.data_sensitivity] * 0.45;
  score += ISOLATION_WEIGHT[input.isolation_requirement] * 0.25;
  if (input.isolation_requirement === "network_airgap") score += 10;
  if (input.access_model === "public_read") score += 20;
  if (input.compliance_notes) score += 12;
  if (input.source_type === "ai_security_audit") score += 10;
  if (input.use_case === "regulated_data_assistant" || input.use_case === "air_gapped_ops") score += 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function derivePriority(
  riskLevel: LocalAiDeploymentSubmission["risk_level"],
  timeline: string,
): LocalAiDeploymentSubmission["priority"] {
  if (timeline === "this_week" || riskLevel === "critical") return "critical";
  if (riskLevel === "high" || timeline === "this_month") return "high";
  if (riskLevel === "medium") return "medium";
  return "low";
}

function resolveHostingStrategy(input: LocalAiDeploymentInput): LocalAiDeploymentSubmission["hosting_strategy"] {
  if (
    input.hosting_strategy_preference === "local" ||
    input.hosting_strategy_preference === "cloud" ||
    input.hosting_strategy_preference === "hybrid"
  ) {
    return input.hosting_strategy_preference;
  }
  if (input.isolation_requirement === "network_airgap" || input.use_case === "air_gapped_ops") return "local";
  if (input.data_sensitivity === "regulated" && input.latency_requirement === "low") return "hybrid";
  if (input.hardware_profile === "edge_device") return "local";
  return "hybrid";
}

function resolveModelRecommendation(input: LocalAiDeploymentInput): { family: string; size: string } {
  const useCase = input.use_case;
  let family = "Llama 3.1";

  if (input.model_family_preference === "mistral") family = "Mistral";
  else if (input.model_family_preference === "qwen") family = "Qwen 2.5";
  else if (input.model_family_preference === "llama") family = "Llama 3.1";
  else if (useCase === "edge_inference" || input.hardware_profile === "edge_device") family = "Mistral";
  else if (useCase === "regulated_data_assistant" || input.data_sensitivity === "regulated") family = "Llama 3.1";
  else if (input.hardware_profile === "apple_silicon") family = "Llama 3.1";
  else if (useCase === "private_copilot") family = "Qwen 2.5";

  let size = "7B";
  if (input.model_size_band === "medium_13b") size = "13B";
  else if (input.model_size_band === "large_70b") size = "70B";
  else if (input.model_size_band === "not_sure") {
    if (input.concurrent_users === "enterprise" || input.workload_volume === "heavy") size = "13B";
    else if (input.hardware_profile === "server_cluster" && input.latency_requirement === "low") size = "70B";
    else size = "7B";
  }

  if (input.hardware_profile === "cpu_only" && size === "70B") size = "13B";
  if (input.hardware_profile === "edge_device" && size !== "7B") size = "7B";

  return { family, size };
}

function buildHardwareRequirements(
  input: LocalAiDeploymentInput,
  modelSize: string,
): LocalAiDeploymentSubmission["hardware_requirements"] {
  const profile = input.hardware_profile;
  const notes: string[] = [
    "Advisory sizing only — validate against representative inference benchmarks before procurement",
    "Preserve existing Cloudflare Workers topology for public edge; local runtime is isolated inference plane",
  ];

  if (profile === "cpu_only") {
    return {
      cpu: modelSize === "70B" ? "64+ cores (AVX2/AVX-512)" : modelSize === "13B" ? "16–32 cores" : "8–16 cores",
      gpu: "None required (CPU inference via llama.cpp / ONNX)",
      ram_gb: modelSize === "70B" ? "128–256 GB" : modelSize === "13B" ? "32–64 GB" : "16–32 GB",
      notes: [...notes, "Expect higher latency on CPU-only paths; batch_ok workloads preferred"],
    };
  }
  if (profile === "apple_silicon") {
    return {
      cpu: "Apple M2 Pro / M3 Max or better",
      gpu: "Unified memory GPU (Metal acceleration)",
      ram_gb: modelSize === "70B" ? "128 GB unified" : modelSize === "13B" ? "36–64 GB unified" : "24–36 GB unified",
      notes: [...notes, "Use MLX or Ollama with Metal backend for local inference"],
    };
  }
  if (profile === "edge_device") {
    return {
      cpu: "ARM or x86 edge appliance (4–8 cores)",
      gpu: "Optional NPU / Jetson-class GPU for 7B models",
      ram_gb: "16–32 GB",
      notes: [...notes, "Quantized 4-bit models recommended for edge deployment"],
    };
  }
  if (profile === "server_cluster") {
    return {
      cpu: "Dual-socket server (32+ cores per node)",
      gpu:
        modelSize === "70B"
          ? "2× A100 80GB or 4× L40S for tensor-parallel serving"
          : modelSize === "13B"
            ? "1× A100 40GB or 2× RTX 4090"
            : "1× RTX 4090 / L4",
      ram_gb: modelSize === "70B" ? "256+ GB system RAM" : "64–128 GB system RAM",
      notes: [...notes, "Plan vLLM or TGI serving layer with health checks and request queue"],
    };
  }
  return {
    cpu: "Workstation-class (12–16 cores)",
    gpu: modelSize === "70B" ? "2× RTX 4090 or 1× A100" : modelSize === "13B" ? "1× RTX 4090 / L40S" : "1× RTX 4060 Ti 16GB+",
    ram_gb: modelSize === "70B" ? "128 GB" : modelSize === "13B" ? "64 GB" : "32 GB",
    notes: [...notes, "Single-node GPU workstation suitable for pilot and small-team production"],
  };
}

function buildStorageRequirements(
  modelSize: string,
  input: LocalAiDeploymentInput,
): LocalAiDeploymentSubmission["storage_requirements"] {
  const weights =
    modelSize === "70B" ? "140–160 GB (FP16) / 40–50 GB (4-bit)" : modelSize === "13B" ? "26–30 GB / 8–10 GB (4-bit)" : "14–16 GB / 4–5 GB (4-bit)";
  const vector =
    input.use_case === "private_copilot" || input.use_case === "regulated_data_assistant" ? "20–100 GB vector cache" : "5–20 GB";
  return {
    model_weights_gb: weights,
    vector_cache_gb: vector,
    logs_gb: input.concurrent_users === "enterprise" ? "50–200 GB/year" : "10–50 GB/year",
    backup_gb: "2× model weights + 30-day log retention snapshot",
  };
}

function buildDataIsolationModel(input: LocalAiDeploymentInput, hosting: LocalAiDeploymentSubmission["hosting_strategy"]): string {
  if (input.isolation_requirement === "network_airgap") {
    return "Fully air-gapped inference plane with sneakernet model updates and offline audit log export";
  }
  if (input.isolation_requirement === "vpc_private") {
    return "Private VPC inference subnet with no default egress; controlled bastion for operator maintenance";
  }
  if (hosting === "hybrid") {
    return "Sensitive inference and embeddings local; public edge routing via Cloudflare Workers with scoped API bridge";
  }
  if (input.isolation_requirement === "single_tenant") {
    return "Dedicated single-tenant runtime per organization with encrypted volumes at rest";
  }
  return "Shared host with process-level isolation, encrypted volumes, and per-tenant API keys";
}

function buildSecurityControls(input: LocalAiDeploymentInput): string[] {
  const controls = [
    "Encrypt model weights and vector stores at rest (AES-256)",
    "TLS 1.3 for all internal inference API traffic",
    "No outbound model telemetry or vendor callback without operator approval",
    "Audit log all inference requests with user_id and prompt hash (not raw prompt for regulated tiers)",
    "Network egress deny-by-default on inference hosts",
  ];
  if (input.data_sensitivity === "regulated" || input.isolation_requirement === "network_airgap") {
    controls.push("Hardware security module or TPM-backed key storage for encryption keys");
    controls.push("Quarterly access review for inference admin roles");
  }
  if (input.access_model === "role_based" || input.access_model === "tenant_isolated") {
    controls.push("RBAC on inference API with scoped model and tool permissions");
  }
  if (input.compliance_notes) {
    controls.push("Map controls to stated compliance framework in implementation SOW");
  }
  return controls;
}

function buildAccessControlModel(input: LocalAiDeploymentInput): string {
  const model = input.access_model.replace(/_/g, " ");
  if (input.isolation_requirement === "network_airgap") {
    return `${model} with physical access controls and dual-operator approval for model updates`;
  }
  if (input.access_model === "tenant_isolated") {
    return "Per-tenant inference namespaces with isolated vector partitions and API credentials";
  }
  return `${model} enforced at inference gateway with session TTL and revocation hooks`;
}

function buildUpdateStrategy(input: LocalAiDeploymentInput, hosting: LocalAiDeploymentSubmission["hosting_strategy"]): string {
  if (input.isolation_requirement === "network_airgap") {
    return "Offline model package verification (checksum + signature) imported via approved media; blue/green swap with rollback snapshot";
  }
  if (hosting === "local") {
    return "Scheduled maintenance window model swaps with canary prompt regression suite before promotion";
  }
  if (hosting === "hybrid") {
    return "Edge Workers config via existing deployment pipeline; local model updates on separate cadence with version pinning";
  }
  return "Managed update channel with staged rollout and automated regression gates";
}

function buildMonitoringPlan(
  riskLevel: LocalAiDeploymentSubmission["risk_level"],
): LocalAiDeploymentSubmission["monitoring_plan"] {
  return {
    frequency: riskLevel === "high" || riskLevel === "critical" ? "daily operator review" : "weekly review",
    signals: [
      "inference_latency_p95",
      "gpu_utilization",
      "queue_depth",
      "error_rate",
      "model_version_drift",
      "disk_usage",
      "failed_auth_attempts",
    ],
    alert_conditions: [
      "p95 latency exceeds SLA for 15 minutes",
      "GPU OOM or OOM-kill events",
      "Disk usage above 85%",
      "Repeated authentication failures from single source",
    ],
    operator_dashboard_fields: [
      "deployment_plan_id",
      "hosting_strategy",
      "model_recommendation",
      "complexity_level",
      "risk_level",
      "priority",
      "status",
      "created_at",
    ],
  };
}

function buildScalingPlan(input: LocalAiDeploymentInput, hosting: LocalAiDeploymentSubmission["hosting_strategy"]): string {
  if (input.concurrent_users === "enterprise" || input.workload_volume === "heavy") {
    return hosting === "local"
      ? "Horizontal inference replicas behind local load balancer; shard by tenant or model variant"
      : "Hybrid scale: burst traffic to edge Workers; heavy inference on dedicated GPU pool";
  }
  if (input.workload_volume === "bursty") {
    return "Auto-scale inference replicas on queue depth; scale-to-zero during idle with cold-start budget";
  }
  return "Single-node pilot with documented scale triggers at 70% sustained GPU utilization";
}

function buildIntegrationPoints(
  input: LocalAiDeploymentInput,
  hosting: LocalAiDeploymentSubmission["hosting_strategy"],
): string[] {
  const points = [
    "OpenAI-compatible local inference API (Ollama / vLLM / llama.cpp server)",
    "Existing MSHOPS operator intake and engagement funnel",
  ];
  if (hosting === "hybrid" || hosting === "cloud") {
    points.push("Cloudflare Workers gateway for auth, rate limiting, and request routing");
  }
  if (input.use_case === "private_copilot" || input.use_case === "regulated_data_assistant") {
    points.push("RAG retrieval layer (vector DB local or hybrid per architecture plan)");
    points.push("AI Agent Builder tool orchestration hooks");
  }
  if (input.source_type === "rag_architecture_plan") {
    points.push("RAG architecture plan embedding and retrieval topology");
  }
  if (input.source_type === "ai_agent_build_spec") {
    points.push("AI Agent Builder spec tool and memory requirements");
  }
  points.push("SIEM or log shipper for audit trail export");
  return points;
}

function buildFailureModes(input: LocalAiDeploymentInput): string[] {
  const modes = [
    "GPU OOM under concurrent load — mitigate with request queue and max batch size",
    "Model corruption on update — mitigate with checksum verification and rollback snapshot",
    "Disk exhaustion from logs or vector growth — mitigate with retention policy and alerts",
    "Inference latency spike during cold start — mitigate with keep-warm policy or smaller default model",
  ];
  if (input.isolation_requirement === "network_airgap") {
    modes.push("Delayed security patches — mitigate with offline patch cadence and compensating controls");
  }
  if (input.hosting_strategy_preference === "hybrid") {
    modes.push("Bridge misconfiguration exposing local inference — mitigate with mutual TLS and IP allowlists");
  }
  return modes;
}

function buildBackupStrategy(input: LocalAiDeploymentInput): string {
  if (input.isolation_requirement === "network_airgap") {
    return "Encrypted offline backups of model weights, config, and audit logs to removable media; test restore quarterly";
  }
  if (input.data_sensitivity === "regulated") {
    return "Daily encrypted snapshots with 30-day retention; geo-redundant backup vault with access logging";
  }
  return "Weekly full backup of model artifacts and config; daily incremental logs; 14-day retention minimum";
}

function deriveLatencyExpectation(input: LocalAiDeploymentInput, modelSize: string): string {
  if (input.latency_requirement === "batch_ok") {
    return "Batch/async acceptable: minutes per job; optimize for throughput over interactive latency";
  }
  if (input.hardware_profile === "cpu_only") {
    return modelSize === "7B" ? "Interactive: 5–15s first token (CPU)" : "Interactive: 15–45s first token (CPU)";
  }
  if (input.latency_requirement === "low") {
    return modelSize === "70B" ? "Target p95 under 8s first token (multi-GPU)" : "Target p95 under 3s first token (GPU)";
  }
  return modelSize === "70B" ? "Balanced: p95 under 12s first token" : "Balanced: p95 under 5s first token";
}

function deriveCostEstimate(input: LocalAiDeploymentInput, hosting: LocalAiDeploymentSubmission["hosting_strategy"]): string {
  const bandMap: Record<string, string> = {
    under_1000: "$500 – $1,500 (pilot / existing hardware)",
    "1000_2500": "$1,500 – $3,500",
    "2500_7500": "$3,500 – $8,500",
    "7500_15000": "$8,500 – $16,000",
    "15000_30000": "$16,000 – $28,000",
    "30000_plus": "$28,000+",
    not_sure: "$2,000 – $12,000 (hardware-dependent)",
  };
  const base = bandMap[input.budget_band] || bandMap.not_sure;
  if (hosting === "local" && input.hardware_profile === "server_cluster") {
    return `${base} + GPU hardware capex (estimate separately)`;
  }
  return base;
}

function deriveEffort(complexity: LocalAiDeploymentSubmission["complexity_level"]) {
  switch (complexity) {
    case "enterprise":
      return { estimated_effort: "Enterprise local AI program: 8–14+ weeks", timeline: "8–14+ weeks" };
    case "advanced":
      return { estimated_effort: "Advanced local AI deployment: 4–8 weeks", timeline: "4–8 weeks" };
    case "moderate":
      return { estimated_effort: "Standard local AI deployment: 2–5 weeks", timeline: "2–5 weeks" };
    default:
      return { estimated_effort: "Focused local AI pilot: 1–2 weeks", timeline: "1–2 weeks" };
  }
}

function buildNextRoute(result: {
  deployment_plan_id: string;
  priority: string;
  complexity_level: string;
  risk_level: string;
  estimated_effort: string;
  source_reference_id?: string;
}): string {
  const params = new URLSearchParams({
    service: "local_ai_setup",
    priority: result.priority,
    source: "local-ai-deployment-planner",
    deployment_plan_id: result.deployment_plan_id,
    complexity_level: result.complexity_level,
    risk_level: result.risk_level,
    estimated_effort: result.estimated_effort,
  });
  if (result.source_reference_id) params.set("source_reference_id", result.source_reference_id);
  return `/enter?${params.toString()}`;
}

export function generateLocalAiDeploymentPlan(
  input: LocalAiDeploymentInput,
  id?: string,
): LocalAiDeploymentSubmission {
  const deployment_plan_id = id || generateDeploymentPlanId();
  const complexity_level = scoreComplexity(input);
  const risk_level = scoreRisk(input);
  const priority = derivePriority(risk_level, input.timeline);
  const hosting_strategy = resolveHostingStrategy(input);
  const { family, size } = resolveModelRecommendation(input);
  const { estimated_effort, timeline } = deriveEffort(complexity_level);
  const useCaseLabel = USE_CASE_LABELS[input.use_case] || "Local AI deployment";

  const result: LocalAiDeploymentSubmission = {
    ...input,
    deployment_plan_id,
    created_at: new Date().toISOString(),
    use_case: input.use_case,
    model_recommendation: family,
    model_size: size,
    hardware_requirements: buildHardwareRequirements(input, size),
    storage_requirements: buildStorageRequirements(size, input),
    hosting_strategy,
    latency_expectation: deriveLatencyExpectation(input, size),
    cost_estimate: deriveCostEstimate(input, hosting_strategy),
    data_isolation_model: buildDataIsolationModel(input, hosting_strategy),
    security_controls: buildSecurityControls(input),
    access_control_model: buildAccessControlModel(input),
    update_strategy: buildUpdateStrategy(input, hosting_strategy),
    monitoring_plan: buildMonitoringPlan(risk_level),
    scaling_plan: buildScalingPlan(input, hosting_strategy),
    integration_points: buildIntegrationPoints(input, hosting_strategy),
    failure_modes: buildFailureModes(input),
    backup_strategy: buildBackupStrategy(input),
    estimated_effort,
    timeline,
    complexity_level,
    risk_level,
    priority,
    recommended_service: "local_ai_setup",
    recommended_next_step: `Validate ${useCaseLabel} assumptions, route to AI Agent Builder or RAG Architecture Planner for application layer specs, then start local AI setup intake.`,
    next_route: "",
    status: "local-ai-deployment-plan-complete",
  };

  result.next_route = buildNextRoute(result);
  return result;
}

export function recordLocalAiDeploymentSubmission(
  input: LocalAiDeploymentInput,
  result: LocalAiDeploymentSubmission,
): LocalAiDeploymentSubmission {
  const submission: LocalAiDeploymentSubmission = { ...result, ...input, deployment_plan_id: result.deployment_plan_id };
  const index = localAiDeploymentSubmissions.findIndex((entry) => entry.deployment_plan_id === submission.deployment_plan_id);
  if (index >= 0) {
    localAiDeploymentSubmissions[index] = { ...localAiDeploymentSubmissions[index], ...submission };
    return localAiDeploymentSubmissions[index];
  }
  localAiDeploymentSubmissions.unshift(submission);
  return submission;
}

export function attachEngagementToLocalAiDeployment(details: {
  deployment_plan_id?: string;
  deploymentPlanId?: string;
  engagement_id?: string;
  engagementId?: string;
  complexity_level?: string;
  risk_level?: string;
  estimated_effort?: string;
  priority?: string;
  source_reference_id?: string;
  status?: string;
  created_at?: string;
  source?: string;
}): LocalAiDeploymentSubmission | null {
  const planId = normalizeText(details.deployment_plan_id || details.deploymentPlanId, 128);
  if (!planId) return null;

  const existing = localAiDeploymentSubmissions.find((entry) => entry.deployment_plan_id === planId);
  const base =
    existing ||
    generateLocalAiDeploymentPlan(
      normalizeLocalAiDeploymentInput({
        source_type: "manual_request",
        use_case: "not_sure",
      }),
      planId,
    );

  const updated: LocalAiDeploymentSubmission = {
    ...base,
    engagement_id: normalizeText(details.engagement_id || details.engagementId, 128) || base.engagement_id,
    status: details.engagement_id || details.engagementId ? "intake-received" : base.status,
    complexity_level:
      (normalizeText(details.complexity_level, 32) as LocalAiDeploymentSubmission["complexity_level"]) || base.complexity_level,
    risk_level: (normalizeText(details.risk_level, 32) as LocalAiDeploymentSubmission["risk_level"]) || base.risk_level,
    priority: (normalizeText(details.priority, 16) as LocalAiDeploymentSubmission["priority"]) || base.priority,
    estimated_effort: normalizeText(details.estimated_effort, 128) || base.estimated_effort,
    source_reference_id: normalizeText(details.source_reference_id, 128) || base.source_reference_id,
  };
  updated.next_route = buildNextRoute(updated);
  return recordLocalAiDeploymentSubmission(updated, updated);
}

type EngagementLike = {
  id?: string;
  engagement_id?: string;
  deploymentPlanId?: string | null;
  deployment_plan_id?: string | null;
  status?: string;
  createdAt?: string;
  created_at?: string;
};

export function listLocalAiDeploymentQueue(engagements: EngagementLike[] = []) {
  const queue = localAiDeploymentSubmissions.map((submission) => {
    const linked = engagements.find(
      (entry) =>
        (entry.deploymentPlanId && entry.deploymentPlanId === submission.deployment_plan_id) ||
        (entry.deployment_plan_id && entry.deployment_plan_id === submission.deployment_plan_id),
    );
    return {
      ...submission,
      engagement_id: submission.engagement_id || linked?.id || linked?.engagement_id || null,
      status: linked?.status || submission.status,
      created_at: linked?.createdAt || linked?.created_at || submission.created_at,
    };
  });

  for (const engagement of engagements) {
    const planId = engagement.deploymentPlanId || engagement.deployment_plan_id;
    if (!planId || queue.some((row) => row.deployment_plan_id === planId)) continue;
    queue.push({
      deployment_plan_id: planId,
      created_at: engagement.createdAt || engagement.created_at || new Date().toISOString(),
      source_type: "not_sure",
      use_case: "not_sure",
      model_family_preference: "no_preference",
      model_size_band: "not_sure",
      hardware_profile: "not_sure",
      hosting_strategy_preference: "not_sure",
      data_sensitivity: "internal",
      isolation_requirement: "not_sure",
      concurrent_users: "not_sure",
      workload_volume: "not_sure",
      latency_requirement: "not_sure",
      budget_band: "not_sure",
      access_model: "not_sure",
      source_route: "/apps/local-ai-deployment-planner",
      model_recommendation: "Llama 3.1",
      model_size: "7B",
      hardware_requirements: { cpu: "", gpu: "", ram_gb: "", notes: [] },
      storage_requirements: { model_weights_gb: "", vector_cache_gb: "", logs_gb: "", backup_gb: "" },
      hosting_strategy: "hybrid",
      latency_expectation: "",
      cost_estimate: "",
      data_isolation_model: "",
      security_controls: [],
      access_control_model: "",
      update_strategy: "",
      monitoring_plan: { frequency: "weekly review", signals: [], alert_conditions: [], operator_dashboard_fields: [] },
      scaling_plan: "",
      integration_points: [],
      failure_modes: [],
      backup_strategy: "",
      estimated_effort: "",
      timeline: "",
      complexity_level: "moderate",
      risk_level: "medium",
      priority: "medium",
      recommended_service: "local_ai_setup",
      recommended_next_step: "",
      next_route: buildNextRoute({
        deployment_plan_id: planId,
        priority: "medium",
        complexity_level: "moderate",
        risk_level: "medium",
        estimated_effort: "",
      }),
      engagement_id: engagement.id || engagement.engagement_id || null,
      status: engagement.status || "intake-received",
    });
  }

  return queue;
}

export function resolveDeploymentPlanId(payload: Record<string, unknown>): string | null {
  const candidate = normalizeText(payload.deployment_plan_id || payload.deploymentPlanId, 128);
  if (!candidate) return null;
  return /^deployment-plan-\d+$/.test(candidate) ? candidate : null;
}

const localAiDeploymentAgent = {
  localAiDeploymentMarketplaceModule,
  normalizeLocalAiDeploymentInput,
  generateLocalAiDeploymentPlan,
  recordLocalAiDeploymentSubmission,
  attachEngagementToLocalAiDeployment,
  listLocalAiDeploymentQueue,
  resolveDeploymentPlanId,
};

export default localAiDeploymentAgent;
