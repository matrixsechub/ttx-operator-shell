const CLOUDFLARE_MCP_SERVERS = {
  cloudflare: {
    id: "cloudflare",
    label: "Cloudflare API",
    url: "https://mcp.cloudflare.com/mcp",
    auth: "oauth",
    description: "Cloudflare API MCP server (Code Mode).",
  },
  "cloudflare-docs": {
    id: "cloudflare-docs",
    label: "Cloudflare Docs",
    url: "https://docs.mcp.cloudflare.com/mcp",
    auth: "none",
    description: "Public Cloudflare documentation search.",
  },
  "cloudflare-bindings": {
    id: "cloudflare-bindings",
    label: "Cloudflare Bindings",
    url: "https://bindings.mcp.cloudflare.com/mcp",
    auth: "oauth",
    description: "Wrangler bindings inspection and management.",
  },
  "cloudflare-builds": {
    id: "cloudflare-builds",
    label: "Cloudflare Builds",
    url: "https://builds.mcp.cloudflare.com/mcp",
    auth: "oauth",
    description: "Workers Builds CI/CD status and logs.",
  },
  "cloudflare-observability": {
    id: "cloudflare-observability",
    label: "Cloudflare Observability",
    url: "https://observability.mcp.cloudflare.com/mcp",
    auth: "oauth",
    description: "Worker logs, metrics, and observability queries.",
  },
};

const CLOUDFLARE_SKILLS = [
  "agents-sdk",
  "cloudflare",
  "cloudflare-email-service",
  "cloudflare-one",
  "cloudflare-one-migrations",
  "durable-objects",
  "sandbox-sdk",
  "turnstile-spin",
  "web-perf",
  "workers-best-practices",
  "wrangler",
];

const FEDERATION_SURFACES = {
  hq: {
    id: "hq",
    label: "HQ",
    path: "/",
    description: "Division landing and public command surface.",
  },
  constellation: {
    id: "constellation",
    label: "Constellation",
    path: "/marketplace",
    description: "Module constellation and marketplace registry.",
  },
  operator: {
    id: "operator",
    label: "Operator",
    path: "/operator",
    description: "Operator console and execution controls.",
  },
  federation: {
    id: "federation",
    label: "Federation",
    path: "/os",
    description: "OS federation plane and cross-surface health.",
  },
  mission: {
    id: "mission",
    label: "Mission Control",
    path: "/mission",
    description: "Advisory Cloudflare federation mission board.",
  },
};

const WRANGLER_BINDINGS_MANIFEST = {
  worker: "mshops-public",
  compatibilityDate: "2026-07-06",
  bindings: [
    { name: "PAYLOADS", type: "kv_namespace" },
    { name: "ESCALATIONS", type: "kv_namespace" },
    { name: "MODULES", type: "kv_namespace" },
    { name: "ROUTING_LOGS", type: "kv_namespace" },
    { name: "SEARCH_LOGS", type: "kv_namespace" },
    { name: "EVENTS", type: "kv_namespace" },
    { name: "AUTONOMY_LOGS", type: "kv_namespace" },
    { name: "ECOSYSTEM", type: "kv_namespace" },
    { name: "NOTIFICATIONS", type: "kv_namespace" },
    { name: "AUDIT", type: "kv_namespace" },
    { name: "SCENARIOS", type: "kv_namespace" },
    { name: "HEARTBEAT", type: "kv_namespace" },
    { name: "OS_ROUTING", type: "kv_namespace" },
    { name: "DIVISION_MEMORY", type: "kv_namespace" },
    { name: "OPERATOR_INTENTS", type: "kv_namespace" },
    { name: "PIPELINES", type: "kv_namespace" },
    { name: "SANDBOX_LOGS", type: "kv_namespace" },
    { name: "OS_CONFIG", type: "kv_namespace" },
    { name: "PUBLIC_SCENARIOS", type: "kv_namespace" },
    { name: "TELEMETRY", type: "kv_namespace" },
    { name: "GOVERNANCE", type: "kv_namespace" },
    { name: "RELEASES", type: "kv_namespace" },
    { name: "INTEGRATIONS", type: "kv_namespace" },
    { name: "CERTIFICATION", type: "kv_namespace" },
    { name: "ASSETS", type: "assets" },
  ],
  vars: ["UPSTREAM_ENGINE_URL"],
  crons: ["*/5 * * * *"],
};

const PIPELINE_REQUIRED_BINDINGS = ["MODULES", "PIPELINES", "ASSETS", "GOVERNANCE"];

const CURATED_DOCS_INDEX = [
  { title: "Workers", url: "https://developers.cloudflare.com/workers/", keywords: ["workers", "serverless", "edge"], topic: "workers" },
  { title: "Workers KV", url: "https://developers.cloudflare.com/kv/", keywords: ["kv", "key-value", "storage"], topic: "kv" },
  { title: "Durable Objects", url: "https://developers.cloudflare.com/durable-objects/", keywords: ["durable", "objects", "state"], topic: "durable-objects" },
  { title: "Email Routing", url: "https://developers.cloudflare.com/email-routing/", keywords: ["email", "routing", "mail"], topic: "email" },
  { title: "Cloudflare Email Service", url: "https://developers.cloudflare.com/email-security/", keywords: ["email", "security", "service"], topic: "email" },
  { title: "Cloudflare One", url: "https://developers.cloudflare.com/cloudflare-one/", keywords: ["cloudflare", "one", "zero", "trust", "access"], topic: "cloudflare-one" },
  { title: "Wrangler CLI", url: "https://developers.cloudflare.com/workers/wrangler/", keywords: ["wrangler", "deploy", "cli"], topic: "workers" },
  { title: "Workers Builds", url: "https://developers.cloudflare.com/workers/ci-cd/builds/", keywords: ["builds", "ci", "cd", "deploy"], topic: "workers" },
  { title: "Workers Observability", url: "https://developers.cloudflare.com/workers/observability/", keywords: ["observability", "logs", "metrics", "tracing"], topic: "workers" },
  { title: "MCP on Cloudflare", url: "https://developers.cloudflare.com/agents/model-context-protocol/", keywords: ["mcp", "model context protocol", "agents"], topic: "workers" },
  { title: "Agent Setup", url: "https://developers.cloudflare.com/agent-setup/", keywords: ["agent", "setup", "skills", "cursor"], topic: "workers" },
  { title: "Workers Bindings", url: "https://developers.cloudflare.com/workers/runtime-apis/bindings/", keywords: ["bindings", "kv", "r2", "d1"], topic: "kv" },
  { title: "Cron Triggers", url: "https://developers.cloudflare.com/workers/configuration/cron-triggers/", keywords: ["cron", "scheduled", "triggers"], topic: "workers" },
  { title: "Workers Performance", url: "https://developers.cloudflare.com/workers/observability/metrics-and-analytics/", keywords: ["performance", "metrics", "analytics", "latency"], topic: "performance" },
  { title: "Cloudflare Security", url: "https://developers.cloudflare.com/security/", keywords: ["security", "waf", "ddos", "zero trust"], topic: "security" },
];

const DOCS_TOPIC_CATEGORIES = [
  "workers",
  "kv",
  "durable-objects",
  "email",
  "cloudflare-one",
  "security",
  "performance",
];

const DOCS_QUICK_ACTIONS = [
  { id: "kv-best-practices", label: "KV Best Practices", query: "KV namespace best practices workers storage", topic: "kv", category: "kv" },
  { id: "workers-deploy", label: "Workers Deployment", query: "Workers deployment wrangler CI CD", topic: "workers", category: "workers" },
  { id: "do-patterns", label: "Durable Objects Patterns", query: "Durable Objects patterns state coordination", topic: "durable-objects", category: "durable-objects" },
  { id: "workers-kv", label: "Workers KV", query: "workers kv bindings storage", topic: "kv", category: "kv" },
  { id: "durable-objects", label: "Durable Objects", query: "durable objects state coordination", topic: "durable-objects", category: "durable-objects" },
  { id: "email-service", label: "Email Service", query: "cloudflare email routing security", topic: "email", category: "email" },
  { id: "cloudflare-one", label: "Cloudflare One", query: "cloudflare one zero trust access", topic: "cloudflare-one", category: "cloudflare-one" },
  { id: "workers-observability", label: "Workers Observability", query: "workers observability logs metrics", topic: "workers", category: "performance" },
  { id: "workers-builds", label: "Workers Builds", query: "workers builds ci cd deploy", topic: "workers", category: "workers" },
  { id: "security-posture", label: "Security Posture", query: "cloudflare security zero trust WAF", topic: "security", category: "security" },
  { id: "web-performance", label: "Web Performance", query: "web performance core web vitals caching", topic: "performance", category: "performance" },
];

const CLOUDFLARE_FEDERATION_ACTIONS = [
  { id: "logs", label: "Fetch Logs", method: "POST", route: "/api/os/cloudflare/logs/fetch", mcpServer: "cloudflare-observability", capability: "logs" },
  { id: "metrics", label: "Fetch Metrics", method: "POST", route: "/api/os/cloudflare/metrics/fetch", mcpServer: "cloudflare-observability", capability: "metrics" },
  { id: "build", label: "Run Build", method: "POST", route: "/api/os/cloudflare/build/run", mcpServer: "cloudflare-builds", capability: "build" },
  { id: "validate-bindings", label: "Validate Bindings", method: "POST", route: "/api/os/cloudflare/bindings/validate", mcpServer: "cloudflare-bindings", capability: "bindings" },
  { id: "docs-query", label: "Docs Query", method: "POST", route: "/api/os/cloudflare/docs/query", mcpServer: "cloudflare-docs", capability: "docs" },
];

const MODULE_CF_ACTION_COMPATIBILITY = {
  "multi-agent-cockpit": ["logs", "metrics", "build", "bindings", "docs"],
  "scenario-engine": ["logs", "metrics", "build", "bindings", "docs"],
  "msh-ops-doctrine": ["docs", "bindings"],
  "n8n-automation-packs": ["docs", "metrics"],
  "ai-agent-threat-report": ["logs", "metrics", "docs"],
};

const STATIC_LOGS_FALLBACK = {
  source: "advisory-fallback",
  status: "requires_oauth",
  logs: [
    "[advisory] cloudflare-observability MCP requires OAuth for live Worker logs.",
    "[manifest] Worker mshops-public registered in wrangler.jsonc.",
    "[hint] Connect Cursor cloudflare-observability MCP and authenticate to fetch live logs.",
  ],
};

const STATIC_METRICS_FALLBACK = {
  source: "advisory-fallback",
  status: "requires_oauth",
  metrics: [
    { name: "kvHealth", value: "manifest-only", note: "OAuth required for live metrics." },
    { name: "pipelineEngine", value: "optional", note: "Pipeline engine online when records exist." },
    { name: "autonomyLoop", value: "*/5 * * * *", note: "Cron registered in wrangler manifest." },
  ],
};

const STATIC_BUILD_MANIFEST = {
  worker: "mshops-public",
  source: "wrangler-manifest",
  stages: [
    { name: "validate", status: "optional", note: "Wrangler dry-run validation available locally." },
    { name: "bundle", status: "optional", note: "Worker bundle served via ASSETS binding." },
    { name: "deploy", status: "optional", note: "OAuth required for live Workers Builds MCP logs." },
  ],
  logs: [
    "[manifest] Worker mshops-public declared in wrangler.jsonc",
    "[manifest] 24 KV namespaces + ASSETS binding configured",
    "[manifest] Cron */5 * * * * autonomy loop registered",
    "[note] Connect cloudflare-builds MCP via OAuth for live build logs",
  ],
};

const AUTONOMOUS_SIGNAL_TRIGGERS = {
  "logs-anomaly": {
    id: "logs-anomaly",
    label: "Logs anomaly",
    description: "Error, failure, timeout, or degraded patterns detected in Worker logs.",
    severity: "advisory",
  },
  "metrics-spike": {
    id: "metrics-spike",
    label: "Metrics spike",
    description: "Elevated request volume or latency indicators in Worker metrics.",
    severity: "advisory",
  },
  "build-failure": {
    id: "build-failure",
    label: "Build failure",
    description: "Workers Builds MCP or manifest reports a failed or unreachable build stage.",
    severity: "advisory",
  },
  "binding-mismatch": {
    id: "binding-mismatch",
    label: "Binding mismatch",
    description: "Wrangler manifest bindings diverge from pipeline requirements or MCP inspection.",
    severity: "advisory",
  },
};

const ANOMALY_LOG_PATTERNS = [/error/i, /fail/i, /timeout/i, /degraded/i, /warning/i, /exception/i, /spike/i];

const METRICS_SPIKE_KEYWORDS = [/spike/i, /elevated/i, /high/i, /surge/i];

const CLOUDFLARE_EVENT_HOOKS = {
  onBuildComplete: {
    id: "onBuildComplete",
    label: "Build complete",
    description: "Advisory hook when a Cloudflare build completes or manifest stage is satisfied.",
    simulated: true,
    advisoryOnly: true,
  },
  onBindingMismatch: {
    id: "onBindingMismatch",
    label: "Binding mismatch",
    description: "Advisory hook when wrangler or MCP binding validation detects a mismatch.",
    simulated: true,
    advisoryOnly: true,
  },
  onObservabilitySpike: {
    id: "onObservabilitySpike",
    label: "Observability spike",
    description: "Advisory hook when logs anomalies or metrics spikes are detected.",
    simulated: true,
    advisoryOnly: true,
  },
};

const CLOUDFLARE_INSIGHTS_RECOMMENDATIONS = [
  {
    id: "oauth-cloudflare-mcp",
    topic: "oauth",
    message: "Complete OAuth for cloudflare, cloudflare-builds, cloudflare-bindings, and cloudflare-observability MCP servers in Cursor for live federation actions.",
  },
  {
    id: "wrangler-dry-run",
    topic: "build",
    message: "Run `npx wrangler deploy --dry-run` locally before promoting releases to validate bundle size and binding declarations.",
  },
  {
    id: "kv-namespace-audit",
    topic: "bindings",
    message: "Audit KV namespace IDs in wrangler.jsonc against Cloudflare dashboard; placeholder IDs block production deploys.",
  },
  {
    id: "workers-observability",
    topic: "observability",
    message: "Enable Workers Observability and connect cloudflare-observability MCP for live logs and metrics instead of advisory fallbacks.",
  },
  {
    id: "durable-objects-patterns",
    topic: "architecture",
    message: "Review Durable Objects patterns for stateful operator modules before scaling multi-agent pipelines.",
  },
  {
    id: "governance-safety-rules",
    topic: "governance",
    message: "Keep cloudflareSafetyRules.blockOnMcpOffline false unless you explicitly want MCP offline states to block execution.",
  },
];

const CROSS_DIVISION_SYNC = {
  operatorShell: {
    repo: "ttx-operator-shell",
    division: "operator-shell",
    syncRoute: "/api/os/cloudflare/sync",
    crossDivisionRoute: "/api/os/cloudflare/cross-division",
  },
  marketplaceBackend: {
    repo: "marketplace-tracking-backend",
    division: "marketplace-backend",
    syncRoute: "/api/cloudflare/sync",
    crossDivisionRoute: "/api/cloudflare/cross-division",
    defaultPort: 3099,
  },
  sharedDimensions: ["decision", "certification", "automation", "insights", "autonomous", "score"],
  alignmentThresholds: {
    aligned: 0.85,
    partial: 0.5,
  },
  scoreTolerance: 8,
};

const CLOUDFLARE_ORCHESTRATION = {
  routes: {
    orchestration: "/api/os/cloudflare/orchestration",
    agents: "/api/os/cloudflare/agents",
  },
  agents: {
    operatorShell: "route-advisory",
    marketplaceBackend: "marketplace-sync",
    crossDivision: "operator-sentinel",
    pipeline: "payload-generator",
  },
  statuses: ["coordinated", "review", "deferred"],
  advisoryOnly: true,
};

const CLOUDFLARE_EXECUTION = {
  routes: {
    execution: "/api/os/cloudflare/execution",
    signals: "/api/os/cloudflare/execution/signals",
  },
  agents: CLOUDFLARE_ORCHESTRATION.agents,
  statuses: ["ready", "review", "deferred"],
  advisoryOnly: true,
};

const CLOUDFLARE_ADAPTIVE = {
  route: "/api/os/cloudflare/adaptive",
  modes: ["steady", "caution", "review", "degraded"],
  badges: ["ADAPT_STEADY", "ADAPT_CAUTION", "ADAPT_REVIEW"],
  inputs: [
    "executionScore",
    "orchestrationScore",
    "crossDivisionScore",
    "certificationScore",
    "decision",
    "automationLoops",
    "insightsHealth",
    "autonomousTriggers",
  ],
  advisoryOnly: true,
};

const CLOUDFLARE_PREDICTIVE = {
  route: "/api/os/cloudflare/predictive",
  forecastModes: ["stable", "watch", "alert", "fallback"],
  badges: ["PREDICT_STABLE", "PREDICT_WATCH", "PREDICT_ALERT"],
  inputs: [
    "adaptiveMode",
    "executionScore",
    "orchestrationScore",
    "crossDivisionScore",
    "certificationScore",
    "decision",
    "automationLoops",
    "insightsHealth",
    "autonomousTriggers",
    "moduleRiskPatterns",
  ],
  advisoryOnly: true,
};

const CLOUDFLARE_STRATEGIC = {
  route: "/api/os/cloudflare/strategic",
  horizons: ["short", "medium", "long"],
  stripModes: ["stable", "watch", "prioritize"],
  tags: ["STRAT_REVIEW", "STRAT_STABILIZE", "STRAT_PROMOTE"],
  themes: ["stability", "risk_reduction", "performance", "observability"],
  advisoryOnly: true,
};

const CLOUDFLARE_UCIP = {
  route: "/api/os/cloudflare/ucip",
  modes: ["green", "yellow", "orange", "red"],
  badges: ["UCIP_GREEN", "UCIP_YELLOW", "UCIP_ORANGE", "UCIP_RED"],
  layers: [
    "automation",
    "autonomous",
    "decision",
    "certification",
    "sync",
    "orchestration",
    "execution",
    "adaptive",
    "predictive",
    "strategic",
  ],
  advisoryOnly: true,
};

const CLOUDFLARE_AMG = {
  route: "/api/os/cloudflare/amg",
  modes: ["govern_green", "govern_yellow", "govern_orange", "govern_red"],
  badges: ["AMG_OK", "AMG_REVIEW", "AMG_CAUTION"],
  tags: ["AMG_OK", "AMG_REVIEW", "AMG_CAUTION"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: "/api/os/cloudflare/ucip",
  advisoryOnly: true,
};

const CLOUDFLARE_CBA = {
  route: "/api/os/cloudflare/cba",
  modes: ["behavior_green", "behavior_yellow", "behavior_orange", "behavior_red"],
  badges: ["CBA_STABLE", "CBA_DRIFT", "CBA_RISK"],
  tags: ["CBA_STABLE", "CBA_DRIFT", "CBA_RISK"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: ["/api/os/cloudflare/amg", "/api/os/cloudflare/ucip"],
  advisoryOnly: true,
};

const CLOUDFLARE_CAL = {
  route: "/api/os/cloudflare/cal",
  modes: ["align_green", "align_yellow", "align_orange", "align_red"],
  badges: ["CAL_ALIGNED", "CAL_PARTIAL", "CAL_MISALIGNED"],
  tags: ["CAL_ALIGNED", "CAL_PARTIAL", "CAL_MISALIGNED"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: [
    "/api/os/cloudflare/cba",
    "/api/os/cloudflare/amg",
    "/api/os/cloudflare/ucip",
  ],
  advisoryOnly: true,
};

const CLOUDFLARE_IHL = {
  route: "/api/os/cloudflare/ihl",
  modes: ["intent_green", "intent_yellow", "intent_orange", "intent_red"],
  badges: ["IHL_ALIGNED", "IHL_PARTIAL", "IHL_CONFLICT"],
  tags: ["IHL_ALIGNED", "IHL_PARTIAL", "IHL_CONFLICT"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: [
    "/api/os/cloudflare/cal",
    "/api/os/cloudflare/cba",
    "/api/os/cloudflare/amg",
    "/api/os/cloudflare/ucip",
  ],
  advisoryOnly: true,
};

const CLOUDFLARE_IARL = {
  route: "/api/os/cloudflare/iarl",
  modes: ["resonance_green", "resonance_yellow", "resonance_orange", "resonance_red"],
  badges: ["IARL_ALIGNED", "IARL_PARTIAL", "IARL_MISMATCH"],
  tags: ["IARL_ALIGNED", "IARL_PARTIAL", "IARL_MISMATCH"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: [
    "/api/os/cloudflare/ihl",
    "/api/os/cloudflare/cal",
    "/api/os/cloudflare/cba",
    "/api/os/cloudflare/amg",
    "/api/os/cloudflare/ucip",
  ],
  advisoryOnly: true,
};

const CLOUDFLARE_ACL = {
  route: "/api/os/cloudflare/acl",
  modes: ["coherence_green", "coherence_yellow", "coherence_orange", "coherence_red"],
  badges: ["ACL_ALIGNED", "ACL_PARTIAL", "ACL_FRAGMENTED"],
  tags: ["ACL_ALIGNED", "ACL_PARTIAL", "ACL_FRAGMENTED"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: [
    "/api/os/cloudflare/iarl",
    "/api/os/cloudflare/ihl",
    "/api/os/cloudflare/cal",
    "/api/os/cloudflare/cba",
    "/api/os/cloudflare/amg",
    "/api/os/cloudflare/ucip",
  ],
  advisoryOnly: true,
};

module.exports = {
  CLOUDFLARE_MCP_SERVERS,
  CLOUDFLARE_SKILLS,
  FEDERATION_SURFACES,
  CROSS_DIVISION_SYNC,
  CLOUDFLARE_ORCHESTRATION,
  CLOUDFLARE_EXECUTION,
  CLOUDFLARE_ADAPTIVE,
  CLOUDFLARE_PREDICTIVE,
  CLOUDFLARE_STRATEGIC,
  CLOUDFLARE_UCIP,
  CLOUDFLARE_AMG,
  CLOUDFLARE_CBA,
  CLOUDFLARE_CAL,
  CLOUDFLARE_IHL,
  CLOUDFLARE_IARL,
  CLOUDFLARE_ACL,
  WRANGLER_BINDINGS_MANIFEST,
  PIPELINE_REQUIRED_BINDINGS,
  CURATED_DOCS_INDEX,
  DOCS_TOPIC_CATEGORIES,
  DOCS_QUICK_ACTIONS,
  CLOUDFLARE_FEDERATION_ACTIONS,
  MODULE_CF_ACTION_COMPATIBILITY,
  STATIC_BUILD_MANIFEST,
  STATIC_LOGS_FALLBACK,
  STATIC_METRICS_FALLBACK,
  AUTONOMOUS_SIGNAL_TRIGGERS,
  ANOMALY_LOG_PATTERNS,
  METRICS_SPIKE_KEYWORDS,
  CLOUDFLARE_EVENT_HOOKS,
  CLOUDFLARE_INSIGHTS_RECOMMENDATIONS,
};
