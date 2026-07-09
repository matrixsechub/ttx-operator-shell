import cloudflareMcpData from "./data/cloudflareMcp.js";
import {
  ADVISORY_HEAVY_TIMEOUT_MS,
  ADVISORY_VERSION_CACHE_TTL_MS,
  ADVISORY_VERSION_TIMEOUT_MS,
  buildCloudflareAdvisoryFallback,
  runAdvisoryGuarded,
} from "./cloudflare-federation-utils.js";

function metaAdvisoryCacheSuffix(options = {}) {
  if (options.cacheKeySuffix) {
    return options.cacheKeySuffix;
  }
  if (options.moduleIds) {
    return `m${options.moduleIds.length}`;
  }
  return "default";
}

const {
  CLOUDFLARE_MCP_SERVERS,
  CLOUDFLARE_SKILLS,
  FEDERATION_SURFACES,
  WRANGLER_BINDINGS_MANIFEST,
  PIPELINE_REQUIRED_BINDINGS,
  CURATED_DOCS_INDEX,
  DOCS_QUICK_ACTIONS,
  DOCS_TOPIC_CATEGORIES,
  CLOUDFLARE_FEDERATION_ACTIONS,
  STATIC_BUILD_MANIFEST,
  STATIC_LOGS_FALLBACK,
  STATIC_METRICS_FALLBACK,
  MODULE_CF_ACTION_COMPATIBILITY,
  AUTONOMOUS_SIGNAL_TRIGGERS,
  ANOMALY_LOG_PATTERNS,
  METRICS_SPIKE_KEYWORDS,
  CLOUDFLARE_EVENT_HOOKS,
  CLOUDFLARE_INSIGHTS_RECOMMENDATIONS,
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
} = cloudflareMcpData;

const CROSS_DIVISION_FETCH_TIMEOUT_MS = 3500;

const MCP_PROBE_TIMEOUT_MS = 3500;
const MCP_CLIENT_INFO = { name: "mshops-os", version: "3.5" };

function withTimeout(promise, timeoutMs = MCP_PROBE_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("probe timeout")), timeoutMs);
    }),
  ]);
}

async function mcpJsonRpc(url, method, params = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}`,
      method,
      params,
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const text = await response.text();
    const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
    if (!dataLine) {
      return { ok: response.ok, status: response.status, result: null, raw: text.slice(0, 500) };
    }
    const payload = JSON.parse(dataLine.replace(/^data:\s*/, ""));
    return { ok: response.ok, status: response.status, result: payload.result, error: payload.error };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return { ok: response.ok, status: response.status, result: null, error: "Invalid JSON response" };
  }
  return { ok: response.ok, status: response.status, result: payload.result, error: payload.error };
}

function normalizeDocsTopic(topic) {
  if (!topic) return null;
  const normalized = String(topic).trim().toLowerCase();
  if (normalized === "email-service") return "email";
  return DOCS_TOPIC_CATEGORIES.includes(normalized) ? normalized : normalized;
}

function getObservabilityTimeframe(hours = 1) {
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  return { to: to.toISOString(), from: from.toISOString() };
}

async function tryMcpToolCall(serverId, toolName, toolArguments = {}) {
  const server = CLOUDFLARE_MCP_SERVERS[serverId];
  if (!server) {
    return { status: "unknown", requiresOAuth: false, result: null, error: "Unknown MCP server." };
  }

  try {
    const init = await withTimeout(
      mcpJsonRpc(server.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO,
      }),
    );
    if (init.status === 401 || init.status === 403) {
      return { status: "requires_oauth", requiresOAuth: true, result: null, advisory: `OAuth required for ${serverId}.` };
    }
    if (!init.ok) {
      return { status: "degraded", requiresOAuth: false, result: null, advisory: `${serverId} MCP initialize failed.` };
    }

    const toolCall = await withTimeout(
      mcpJsonRpc(server.url, "tools/call", {
        name: toolName,
        arguments: toolArguments,
      }),
    );
    if (toolCall.status === 401 || toolCall.status === 403) {
      return { status: "requires_oauth", requiresOAuth: true, result: null, advisory: `OAuth required for ${toolName}.` };
    }
    if (toolCall.result?.content) {
      const text = toolCall.result.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      return { status: "online", requiresOAuth: false, result: text, source: `${serverId}-mcp` };
    }
    return { status: "degraded", requiresOAuth: false, result: null, advisory: `No content from ${toolName}.` };
  } catch (error) {
    return { status: "offline", requiresOAuth: server.auth === "oauth", result: null, advisory: error.message };
  }
}

export async function getCloudflareLogs(options = {}) {
  const worker = options.worker || WRANGLER_BINDINGS_MANIFEST.worker;
  const probe = await probeMcpServer("cloudflare-observability");
  if (probe.status === "requires_oauth" || probe.status === "offline") {
    return {
      status: probe.status === "offline" ? "offline" : "requires_oauth",
      health: probe.status === "offline" ? "offline" : "requires_oauth",
      worker,
      source: STATIC_LOGS_FALLBACK.source,
      logs: STATIC_LOGS_FALLBACK.logs,
      advisory: probe.status === "requires_oauth"
        ? "OAuth required for live Worker logs via cloudflare-observability MCP."
        : "cloudflare-observability MCP is offline; returning advisory logs.",
      checkedAt: new Date().toISOString(),
    };
  }

  const mcp = await tryMcpToolCall("cloudflare-observability", "query_worker_observability", {
    query: {
      queryId: "workers-logs-events",
      view: "events",
      limit: Number(options.limit) || 5,
      dry: true,
      parameters: {
        datasets: ["cloudflare-workers"],
        filters: [
          {
            key: "$metadata.service",
            operation: "eq",
            type: "string",
            value: worker,
          },
        ],
      },
      timeframe: getObservabilityTimeframe(Number(options.hours) || 1),
    },
  });

  if (mcp.status === "requires_oauth" || !mcp.result) {
    return {
      status: mcp.status || "requires_oauth",
      health: mcp.status || "requires_oauth",
      worker,
      source: STATIC_LOGS_FALLBACK.source,
      logs: STATIC_LOGS_FALLBACK.logs,
      advisory: mcp.advisory || STATIC_LOGS_FALLBACK.logs[0],
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    status: "online",
    health: "online",
    worker,
    source: mcp.source,
    logs: mcp.result.split("\n").filter(Boolean).slice(0, 50),
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareMetrics(options = {}) {
  const worker = options.worker || WRANGLER_BINDINGS_MANIFEST.worker;
  const probe = await probeMcpServer("cloudflare-observability");
  if (probe.status === "requires_oauth" || probe.status === "offline") {
    return {
      status: probe.status === "offline" ? "offline" : "requires_oauth",
      health: probe.status === "offline" ? "offline" : "requires_oauth",
      worker,
      source: STATIC_METRICS_FALLBACK.source,
      metrics: STATIC_METRICS_FALLBACK.metrics,
      advisory: probe.status === "requires_oauth"
        ? "OAuth required for live Worker metrics via cloudflare-observability MCP."
        : "cloudflare-observability MCP is offline; returning advisory metrics.",
      checkedAt: new Date().toISOString(),
    };
  }

  const mcp = await tryMcpToolCall("cloudflare-observability", "query_worker_observability", {
    query: {
      queryId: "workers-metrics-calculations",
      view: "calculations",
      parameters: {
        datasets: ["cloudflare-workers"],
        filters: [
          {
            key: "$metadata.service",
            operation: "eq",
            type: "string",
            value: worker,
          },
        ],
        calculations: [{ operator: "count", alias: "requests" }],
      },
      timeframe: getObservabilityTimeframe(Number(options.hours) || 1),
    },
  });

  if (mcp.status === "requires_oauth" || !mcp.result) {
    return {
      status: mcp.status || "requires_oauth",
      health: mcp.status || "requires_oauth",
      worker,
      source: STATIC_METRICS_FALLBACK.source,
      metrics: STATIC_METRICS_FALLBACK.metrics,
      advisory: mcp.advisory || STATIC_METRICS_FALLBACK.metrics[0]?.note,
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    status: "online",
    health: "online",
    worker,
    source: mcp.source,
    metrics: [{ name: "observability", value: mcp.result.slice(0, 500) }],
    checkedAt: new Date().toISOString(),
  };
}

export async function runCloudflareBuild(options = {}) {
  const worker = options.worker || WRANGLER_BINDINGS_MANIFEST.worker;
  const buildsProbe = await probeMcpServer("cloudflare-builds");
  if (buildsProbe.status === "requires_oauth" || buildsProbe.status === "offline") {
    return {
      status: buildsProbe.status === "offline" ? "offline" : "requires_oauth",
      health: buildsProbe.status === "offline" ? "offline" : "requires_oauth",
      worker,
      source: STATIC_BUILD_MANIFEST.source,
      stages: STATIC_BUILD_MANIFEST.stages,
      logs: STATIC_BUILD_MANIFEST.logs,
      advisory: buildsProbe.status === "requires_oauth"
        ? "OAuth required to trigger Workers Builds via cloudflare-builds MCP."
        : "cloudflare-builds MCP is offline; returning static build manifest.",
      checkedAt: new Date().toISOString(),
    };
  }

  const listBuilds = await tryMcpToolCall("cloudflare-builds", "workers_builds_list_builds", {});
  const logs = listBuilds.result
    ? listBuilds.result.split("\n").filter(Boolean).slice(0, 50)
    : STATIC_BUILD_MANIFEST.logs;

  return {
    status: listBuilds.status === "online" ? "online" : "requires_oauth",
    health: listBuilds.status === "online" ? "online" : "requires_oauth",
    worker,
    source: listBuilds.source || STATIC_BUILD_MANIFEST.source,
    stages: STATIC_BUILD_MANIFEST.stages,
    logs,
    advisory: listBuilds.advisory || null,
    checkedAt: new Date().toISOString(),
  };
}

export async function postValidateCloudflareBindings(options = {}) {
  const manifestValidation = await validateCloudflareBindings(options.moduleId || null);
  const bindingsProbe = await probeMcpServer("cloudflare-bindings");
  if (bindingsProbe.status === "requires_oauth" || bindingsProbe.status === "offline") {
    return {
      ...manifestValidation,
      status: bindingsProbe.status === "offline" ? "offline" : "requires_oauth",
      source: "manifest-only",
      mcpValidation: null,
      advisory: bindingsProbe.status === "requires_oauth"
        ? "OAuth required for live binding validation via cloudflare-bindings MCP."
        : "cloudflare-bindings MCP is offline; manifest-only validation applied.",
      checkedAt: new Date().toISOString(),
    };
  }

  const mcp = await tryMcpToolCall("cloudflare-bindings", "kv_namespaces_list", {});
  return {
    ...manifestValidation,
    status: mcp.status === "online" ? (manifestValidation.valid ? "online" : "warning") : mcp.status,
    source: mcp.status === "online" ? "manifest+mcp" : "manifest-only",
    mcpValidation: mcp.result ? { kvNamespaces: mcp.result.slice(0, 800) } : null,
    advisory: mcp.advisory || null,
    checkedAt: new Date().toISOString(),
  };
}

export function getCloudflareFederationActionsMetadata() {
  return {
    actions: CLOUDFLARE_FEDERATION_ACTIONS,
    topics: DOCS_TOPIC_CATEGORIES,
    quickActions: getDocsQuickActions(),
  };
}

export async function getCloudflareFederationActions() {
  const probes = await probeAllMcpServers();
  const oauthStatus = Object.fromEntries(probes.servers.map((server) => [server.id, server.oauthStatus]));
  const actions = CLOUDFLARE_FEDERATION_ACTIONS.map((action) => ({
    ...action,
    usable: oauthStatus[action.mcpServer] === "ready" || oauthStatus[action.mcpServer] === "not_required",
    oauthStatus: oauthStatus[action.mcpServer] || "unknown",
    serverStatus: probes.servers.find((server) => server.id === action.mcpServer)?.status || "unknown",
  }));
  return {
    actions,
    oauthStatus,
    topics: DOCS_TOPIC_CATEGORIES,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareActionsHealth() {
  const [logs, metrics, build, bindings] = await Promise.all([
    getCloudflareLogs(),
    getCloudflareMetrics(),
    runCloudflareBuild(),
    postValidateCloudflareBindings(),
  ]);
  const entries = [
    { id: "logs", health: logs.health },
    { id: "metrics", health: metrics.health },
    { id: "build", health: build.health },
    { id: "validate-bindings", health: bindings.valid ? bindings.status === "online" ? "online" : bindings.status : "warning" },
    { id: "docs-search", health: "online" },
  ];
  const offline = entries.filter((entry) => entry.health === "offline").length;
  const requiresOAuth = entries.filter((entry) => entry.health === "requires_oauth").length;
  return {
    health: offline ? "degraded" : requiresOAuth ? "requires_oauth" : "online",
    actions: entries,
    summary: { total: entries.length, online: entries.filter((e) => e.health === "online").length, requiresOAuth, offline },
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareActionHealthSummary() {
  const [logsHealth, metricsHealth, buildHealth, bindingHealth, docsProbe] = await Promise.all([
    probeMcpServer("cloudflare-observability").then((p) => (p.status === "online" ? "online" : p.status)),
    probeMcpServer("cloudflare-observability").then((p) => (p.status === "online" ? "online" : p.status)),
    probeMcpServer("cloudflare-builds").then((p) => (p.status === "online" ? "online" : p.status === "requires_oauth" ? "requires_oauth" : p.status)),
    probeMcpServer("cloudflare-bindings").then((p) => (p.status === "online" ? "online" : p.status === "requires_oauth" ? "requires_oauth" : p.status)),
    probeMcpServer("cloudflare-docs"),
  ]);
  const actionsHealth = await getCloudflareActionsHealth();
  return {
    cloudflareLogsHealth: logsHealth,
    cloudflareMetricsHealth: metricsHealth,
    cloudflareBuildHealth: buildHealth,
    cloudflareBindingHealth: bindingHealth,
    cloudflareDocsHealth: docsProbe.reachable ? (docsProbe.status === "online" ? "online" : docsProbe.status) : "offline",
    actionsHealth,
    checkedAt: new Date().toISOString(),
  };
}

function wrapAdvisoryAction(actionId, payload) {
  return {
    ok: true,
    advisory: true,
    action: actionId,
    ...payload,
    checkedAt: payload.checkedAt || new Date().toISOString(),
  };
}

export async function postFetchCloudflareLogs(body = {}) {
  const result = await getCloudflareLogs(body);
  return wrapAdvisoryAction("logs", result);
}

export async function postFetchCloudflareMetrics(body = {}) {
  const result = await getCloudflareMetrics(body);
  return wrapAdvisoryAction("metrics", result);
}

export async function postRunCloudflareBuild(body = {}) {
  const result = await runCloudflareBuild(body);
  return wrapAdvisoryAction("build", result);
}

export async function postValidateCloudflareBindingsAction(body = {}) {
  const result = await postValidateCloudflareBindings(body);
  return wrapAdvisoryAction("validate-bindings", result);
}

export async function postQueryCloudflareDocs(body = {}) {
  const query = String(body.query || body.q || "").trim();
  const topic = body.topic || body.category || null;
  const result = await searchCloudflareDocs(query, { topic });
  const probe = await probeMcpServer("cloudflare-docs");
  return wrapAdvisoryAction("docs-query", {
    status: probe.status === "online" ? "online" : probe.status,
    source: result.source,
    query: result.query,
    topic: result.topic,
    category: body.category || null,
    results: result.results,
    advisory: result.source !== "cloudflare-docs-mcp" ? "Docs query used curated fallback when MCP search unavailable." : null,
  });
}

export function getModuleCfCompatibility(moduleId) {
  const actions = MODULE_CF_ACTION_COMPATIBILITY[moduleId] || ["docs"];
  return {
    moduleId,
    cfReadyPlus: actions.length >= 4,
    actions,
    actionLabels: CLOUDFLARE_FEDERATION_ACTIONS.filter((action) => actions.includes(action.capability)).map((action) => action.label),
  };
}

export function getMarketplaceCfMetadata() {
  return {
    federationActions: CLOUDFLARE_FEDERATION_ACTIONS,
    moduleCompatibility: MODULE_CF_ACTION_COMPATIBILITY,
    docsCategories: DOCS_TOPIC_CATEGORIES,
    quickActions: getDocsQuickActions(),
    decisionRoute: "/api/os/cloudflare/decision",
    automationRoute: "/api/os/cloudflare/automation",
    certificationRoute: "/api/marketplace/certification",
    syncRoute: CROSS_DIVISION_SYNC.operatorShell.syncRoute,
    crossDivisionRoute: CROSS_DIVISION_SYNC.operatorShell.crossDivisionRoute,
    marketplaceSyncRoute: CROSS_DIVISION_SYNC.marketplaceBackend.syncRoute,
    orchestrationRoute: CLOUDFLARE_ORCHESTRATION.routes.orchestration,
    agentsRoute: CLOUDFLARE_ORCHESTRATION.routes.agents,
    executionRoute: CLOUDFLARE_EXECUTION.routes.execution,
    executionSignalsRoute: CLOUDFLARE_EXECUTION.routes.signals,
    adaptiveRoute: CLOUDFLARE_ADAPTIVE.route,
    predictiveRoute: CLOUDFLARE_PREDICTIVE.route,
    strategicRoute: CLOUDFLARE_STRATEGIC.route,
    ucipRoute: CLOUDFLARE_UCIP.route,
    amgRoute: CLOUDFLARE_AMG.route,
    cbaRoute: CLOUDFLARE_CBA.route,
    calRoute: CLOUDFLARE_CAL.route,
    ihlRoute: CLOUDFLARE_IHL.route,
    iarlRoute: CLOUDFLARE_IARL.route,
    aclRoute: CLOUDFLARE_ACL.route,
  };
}

export async function getCloudflareFederationHeartbeat() {
  const [actionSummary, federation] = await Promise.all([
    getCloudflareActionHealthSummary(),
    getCloudflareFederationReadiness(),
  ]);
  const probes = federation.mcp?.servers || [];
  return {
    cloudflareLogsHealth: actionSummary.cloudflareLogsHealth,
    cloudflareMetricsHealth: actionSummary.cloudflareMetricsHealth,
    cloudflareBuildHealth: actionSummary.cloudflareBuildHealth,
    cloudflareBindingHealth: actionSummary.cloudflareBindingHealth,
    cloudflareDocsHealth: actionSummary.cloudflareDocsHealth,
    cloudflareFederationScore: federation.readinessScore ?? 0,
    cloudflareLatencyMs: Object.fromEntries(probes.map((server) => [server.id, server.latencyMs ?? null])),
    cloudflareOAuthStatus: Object.fromEntries(probes.map((server) => [server.id, server.oauthStatus])),
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareIdentityFederation(env = {}) {
  const governance = {};
  const [actions, federation, heartbeat, autonomous, insights, eventHooks, certification, crossDivision, orchestration, execution, automation] = await Promise.all([
    getCloudflareFederationActions(),
    getCloudflareFederationReadiness(),
    getCloudflareFederationHeartbeat(),
    getCloudflareAutonomousSnapshot(governance),
    getCloudflareInsights(governance),
    (async () => {
      const inputs = await collectAutonomousSignalInputs();
      const signals = buildAutonomousGovernanceSignals(inputs, governance);
      return simulateCloudflareEventHooks(signals, inputs);
    })(),
    getMarketplaceCloudflareCertification(governance),
    getCloudflareCrossDivisionFederation(governance, env),
    getCloudflareOrchestration(governance, env),
    getCloudflareExecution(governance, env),
    getCloudflareAutomationLoops(governance),
  ]);
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  const expandedScore = getExpandedFederationScore(
    federation.readinessScore,
    autonomous.cloudflareSafety?.autonomousScore,
    insights.cloudflareInsightsScore,
    triggers,
  );
  const decision = await getCloudflareDecision(governance);
  const adaptiveRuntime = buildCloudflareAdaptiveFromSignals({
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
  });
  const predictiveRuntime = buildCloudflarePredictiveFromSignals({
    adaptive: adaptiveRuntime,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
  });
  const strategicRuntime = buildCloudflareStrategicFromSignals({
    predictive: predictiveRuntime,
    adaptive: adaptiveRuntime,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
  });
  const ucipRuntime = buildCloudflareUcipFromSignals({
    automation,
    autonomous,
    decision,
    certification,
    crossDivision,
    orchestration,
    execution,
    adaptive: adaptiveRuntime,
    predictive: predictiveRuntime,
    strategic: strategicRuntime,
    insights,
  });
  const amgRuntime = buildCloudflareAmgFromUcip(ucipRuntime);
  const identityAlignmentContext = await buildCalAlignmentContextFromEnv({}, env, {});
  const cbaRuntime = buildCloudflareCbaFromAmg(amgRuntime, ucipRuntime, identityAlignmentContext);
  const calRuntime = buildCloudflareCalFromCba(cbaRuntime, amgRuntime, ucipRuntime, identityAlignmentContext);
  const ihlRuntime = buildCloudflareIhlFromCal(calRuntime, cbaRuntime, amgRuntime, ucipRuntime, identityAlignmentContext);
  const iarlRuntime = buildCloudflareIarlFromIhl(ihlRuntime, calRuntime, cbaRuntime, amgRuntime, ucipRuntime, identityAlignmentContext);
  const aclRuntime = buildCloudflareAclFromIarl(iarlRuntime, ihlRuntime, calRuntime, cbaRuntime, amgRuntime, ucipRuntime, identityAlignmentContext);
  return {
    actions: Object.fromEntries(
      CLOUDFLARE_FEDERATION_ACTIONS.map((action) => [
        action.id,
        {
          route: action.route,
          method: action.method,
          capability: action.capability,
          oauthStatus: actions.oauthStatus[action.mcpServer] || "unknown",
          usable: actions.actions.find((entry) => entry.id === action.id)?.usable ?? false,
        },
      ]),
    ),
    oauthStatus: heartbeat.cloudflareOAuthStatus,
    capabilities: CLOUDFLARE_FEDERATION_ACTIONS.map((action) => action.capability),
    latency: heartbeat.cloudflareLatencyMs,
    federationScore: expandedScore,
    federationScoreBreakdown: {
      readiness: federation.readinessScore,
      autonomous: autonomous.cloudflareSafety?.autonomousScore ?? null,
      insights: insights.cloudflareInsightsScore,
      expanded: expandedScore,
      triggerPenalty: triggers.length * 5,
    },
    readiness: federation.readiness,
    autonomousCapabilities: {
      triggers: Object.keys(AUTONOMOUS_SIGNAL_TRIGGERS),
      safety: autonomous.cloudflareSafety,
      autonomousSignals: autonomous.cloudflareGovernance?.autonomousSignals,
      routes: {
        autonomous: "/api/os/cloudflare/autonomous",
        events: "/api/os/cloudflare/events",
        insights: "/api/os/cloudflare/insights",
      },
      advisoryOnly: true,
    },
    insights: {
      score: insights.cloudflareInsightsScore,
      health: insights.health,
      summaries: insights.cloudflareInsights,
    },
    events: {
      hooks: eventHooks.cloudflareEvents,
      health: deriveEventsHealth(eventHooks),
      simulated: true,
      advisoryOnly: true,
    },
    decisioningCapabilities: {
      decisions: ["proceed", "caution", "hold"],
      route: "/api/os/cloudflare/decision",
      advisoryOnly: true,
      riskDimensions: ["latency", "oauth", "logs", "metrics", "build", "bindings"],
    },
    automationCapabilities: {
      loops: ["logs", "metrics", "build", "bindings", "oauth", "latency"],
      route: "/api/os/cloudflare/automation",
      advisoryOnly: true,
    },
    certificationCapabilities: {
      statuses: ["certified", "review", "incompatible"],
      route: "/api/marketplace/certification",
      advisoryOnly: true,
    },
    certificationScore: certification.aggregate?.score ?? null,
    crossDivisionCapabilities: {
      dimensions: CROSS_DIVISION_SYNC.sharedDimensions,
      routes: {
        sync: CROSS_DIVISION_SYNC.operatorShell.syncRoute,
        crossDivision: CROSS_DIVISION_SYNC.operatorShell.crossDivisionRoute,
        marketplaceSync: CROSS_DIVISION_SYNC.marketplaceBackend.syncRoute,
      },
      advisoryOnly: true,
    },
    crossDivisionScore: crossDivision.cloudflareCrossDivisionScore ?? null,
    crossDivisionHealth: crossDivision.cloudflareCrossDivisionHealth || "optional",
    crossDivisionSyncStatus: crossDivision.syncStatus || "partial",
    orchestrationCapabilities: {
      routes: CLOUDFLARE_ORCHESTRATION.routes,
      agents: CLOUDFLARE_ORCHESTRATION.agents,
      statuses: CLOUDFLARE_ORCHESTRATION.statuses,
      advisoryOnly: true,
    },
    orchestrationScore: orchestration.orchestrationScore ?? null,
    orchestrationHealth: orchestration.orchestrationHealth || "optional",
    executionCapabilities: {
      routes: CLOUDFLARE_EXECUTION.routes,
      agents: CLOUDFLARE_EXECUTION.agents,
      statuses: CLOUDFLARE_EXECUTION.statuses,
      advisoryOnly: true,
    },
    executionScore: execution.executionScore ?? null,
    executionHealth: execution.executionHealth || "optional",
    adaptiveCapabilities: {
      modes: CLOUDFLARE_ADAPTIVE.modes,
      route: CLOUDFLARE_ADAPTIVE.route,
      badges: CLOUDFLARE_ADAPTIVE.badges,
      inputs: CLOUDFLARE_ADAPTIVE.inputs,
      advisoryOnly: true,
    },
    adaptiveScore: adaptiveRuntime.adaptiveScore,
    adaptiveHealth: adaptiveRuntime.adaptiveHealth,
    predictiveCapabilities: {
      forecastModes: CLOUDFLARE_PREDICTIVE.forecastModes,
      route: CLOUDFLARE_PREDICTIVE.route,
      badges: CLOUDFLARE_PREDICTIVE.badges,
      inputs: CLOUDFLARE_PREDICTIVE.inputs,
      advisoryOnly: true,
    },
    predictiveScore: predictiveRuntime.predictiveScore,
    predictiveHealth: predictiveRuntime.predictiveHealth,
    strategicCapabilities: {
      horizons: CLOUDFLARE_STRATEGIC.horizons,
      stripModes: CLOUDFLARE_STRATEGIC.stripModes,
      tags: CLOUDFLARE_STRATEGIC.tags,
      themes: CLOUDFLARE_STRATEGIC.themes,
      route: CLOUDFLARE_STRATEGIC.route,
      advisoryOnly: true,
    },
    strategicScore: strategicRuntime.strategicScore,
    strategicHealth: strategicRuntime.strategicHealth,
    ucipCapabilities: {
      modes: CLOUDFLARE_UCIP.modes,
      route: CLOUDFLARE_UCIP.route,
      badges: CLOUDFLARE_UCIP.badges,
      layers: CLOUDFLARE_UCIP.layers,
      advisoryOnly: true,
    },
    ucipScore: ucipRuntime.ucipScore,
    ucipHealth: ucipRuntime.ucipHealth,
    amgCapabilities: {
      modes: CLOUDFLARE_AMG.modes,
      route: CLOUDFLARE_AMG.route,
      badges: CLOUDFLARE_AMG.badges,
      tags: CLOUDFLARE_AMG.tags,
      surfaces: CLOUDFLARE_AMG.surfaces,
      upstream: CLOUDFLARE_AMG.upstream,
      advisoryOnly: true,
    },
    amgScore: amgRuntime.amgScore,
    amgHealth: amgRuntime.amgHealth,
    cbaCapabilities: {
      modes: CLOUDFLARE_CBA.modes,
      route: CLOUDFLARE_CBA.route,
      badges: CLOUDFLARE_CBA.badges,
      tags: CLOUDFLARE_CBA.tags,
      surfaces: CLOUDFLARE_CBA.surfaces,
      upstream: CLOUDFLARE_CBA.upstream,
      advisoryOnly: true,
    },
    cbaScore: cbaRuntime.cbaScore,
    cbaHealth: cbaRuntime.cbaHealth,
    calCapabilities: {
      modes: CLOUDFLARE_CAL.modes,
      route: CLOUDFLARE_CAL.route,
      badges: CLOUDFLARE_CAL.badges,
      tags: CLOUDFLARE_CAL.tags,
      surfaces: CLOUDFLARE_CAL.surfaces,
      upstream: CLOUDFLARE_CAL.upstream,
      advisoryOnly: true,
    },
    calScore: calRuntime.calScore,
    calHealth: calRuntime.calHealth,
    ihlCapabilities: {
      modes: CLOUDFLARE_IHL.modes,
      route: CLOUDFLARE_IHL.route,
      badges: CLOUDFLARE_IHL.badges,
      tags: CLOUDFLARE_IHL.tags,
      surfaces: CLOUDFLARE_IHL.surfaces,
      upstream: CLOUDFLARE_IHL.upstream,
      advisoryOnly: true,
    },
    ihlScore: ihlRuntime.ihlScore,
    ihlHealth: ihlRuntime.ihlHealth,
    iarlCapabilities: {
      modes: CLOUDFLARE_IARL.modes,
      route: CLOUDFLARE_IARL.route,
      badges: CLOUDFLARE_IARL.badges,
      tags: CLOUDFLARE_IARL.tags,
      surfaces: CLOUDFLARE_IARL.surfaces,
      upstream: CLOUDFLARE_IARL.upstream,
      advisoryOnly: true,
    },
    iarlScore: iarlRuntime.iarlScore,
    iarlHealth: iarlRuntime.iarlHealth,
    aclCapabilities: {
      modes: CLOUDFLARE_ACL.modes,
      route: CLOUDFLARE_ACL.route,
      badges: CLOUDFLARE_ACL.badges,
      tags: CLOUDFLARE_ACL.tags,
      surfaces: CLOUDFLARE_ACL.surfaces,
      upstream: CLOUDFLARE_ACL.upstream,
      advisoryOnly: true,
    },
    aclScore: aclRuntime.aclScore,
    aclHealth: aclRuntime.aclHealth,
    decisionScore: decision.score,
    decisionReasons: decision.reasons,
    optional: true,
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function probeMcpServer(serverId) {
  const server = CLOUDFLARE_MCP_SERVERS[serverId];
  if (!server) {
    return { id: serverId, status: "unknown", reachable: false, error: "Unknown MCP server." };
  }

  const startedAt = Date.now();
  try {
    const init = await withTimeout(
      mcpJsonRpc(server.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO,
      }),
    );
    const latencyMs = Date.now() - startedAt;
    const reachable = init.ok || init.status === 401 || init.status === 403;
    const requiresAuth = init.status === 401 || init.status === 403;
    return {
      id: server.id,
      label: server.label,
      url: server.url,
      auth: server.auth,
      reachable,
      requiresAuth,
      oauthStatus: requiresAuth ? "pending" : server.auth === "none" ? "not_required" : "ready",
      status: requiresAuth ? "requires_oauth" : init.ok ? "online" : "degraded",
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id: server.id,
      label: server.label,
      url: server.url,
      auth: server.auth,
      reachable: false,
      requiresAuth: server.auth === "oauth",
      oauthStatus: server.auth === "oauth" ? "unavailable" : "not_required",
      status: "offline",
      latencyMs: Date.now() - startedAt,
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function probeAllMcpServers() {
  const entries = await Promise.all(Object.keys(CLOUDFLARE_MCP_SERVERS).map((serverId) => probeMcpServer(serverId)));
  return {
    servers: entries,
    summary: {
      total: entries.length,
      online: entries.filter((entry) => entry.status === "online").length,
      requiresOAuth: entries.filter((entry) => entry.status === "requires_oauth").length,
      offline: entries.filter((entry) => entry.status === "offline").length,
      averageLatencyMs: Math.round(
        entries.filter((entry) => typeof entry.latencyMs === "number").reduce((sum, entry) => sum + entry.latencyMs, 0) /
          Math.max(entries.filter((entry) => typeof entry.latencyMs === "number").length, 1),
      ),
    },
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareObservabilityChecks() {
  const observabilityProbe = await probeMcpServer("cloudflare-observability");
  const docsProbe = await probeMcpServer("cloudflare-docs");
  return {
    observabilityMcp: observabilityProbe,
    docsMcp: docsProbe,
    health: observabilityProbe.reachable ? (observabilityProbe.requiresAuth ? "requires_oauth" : "online") : "offline",
    docsHealth: docsProbe.reachable ? (docsProbe.status === "online" ? "online" : docsProbe.status) : "offline",
    latencyMs: observabilityProbe.latencyMs,
    oauthStatus: observabilityProbe.oauthStatus,
    serverStatus: observabilityProbe.status,
    worker: WRANGLER_BINDINGS_MANIFEST.worker,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareHeartbeatDeep() {
  const probes = await probeAllMcpServers();
  const observability = await getCloudflareObservabilityChecks();
  return {
    ...observability,
    servers: probes.servers,
    summary: probes.summary,
    docsServerHealth: observability.docsHealth,
    averageLatencyMs: probes.summary.averageLatencyMs,
    oauthStatuses: Object.fromEntries(probes.servers.map((server) => [server.id, server.oauthStatus])),
    serverStatuses: Object.fromEntries(probes.servers.map((server) => [server.id, server.status])),
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareBuildStatus() {
  const buildsProbe = await probeMcpServer("cloudflare-builds");
  return {
    buildsMcp: buildsProbe,
    worker: WRANGLER_BINDINGS_MANIFEST.worker,
    health: buildsProbe.reachable ? (buildsProbe.requiresAuth ? "requires_oauth" : "online") : "offline",
    activeWorker: WRANGLER_BINDINGS_MANIFEST.worker,
    note: buildsProbe.requiresAuth
      ? "OAuth required to list Workers Builds. Probe confirms MCP endpoint reachability."
      : "Workers Builds MCP endpoint reachable.",
    checkedAt: new Date().toISOString(),
  };
}

async function tryMcpBuildLogs() {
  const buildsServer = CLOUDFLARE_MCP_SERVERS["cloudflare-builds"];
  try {
    const init = await withTimeout(
      mcpJsonRpc(buildsServer.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO,
      }),
    );
    if (!init.ok || init.status === 401 || init.status === 403) {
      return null;
    }
    const toolCall = await withTimeout(
      mcpJsonRpc(buildsServer.url, "tools/call", {
        name: "workers_builds_list_builds",
        arguments: {},
      }),
    );
    if (toolCall.result?.content) {
      const text = toolCall.result.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      return { source: "cloudflare-builds-mcp", logs: text.split("\n").filter(Boolean).slice(0, 50) };
    }
  } catch {
    return null;
  }
  return null;
}

export async function getCloudflareBuildPreview() {
  const buildStatus = await getCloudflareBuildStatus();
  const liveLogs = await tryMcpBuildLogs();
  return {
    ...buildStatus,
    preview: {
      worker: WRANGLER_BINDINGS_MANIFEST.worker,
      stages: STATIC_BUILD_MANIFEST.stages,
      source: liveLogs?.source || STATIC_BUILD_MANIFEST.source,
      logs: liveLogs?.logs || STATIC_BUILD_MANIFEST.logs,
    },
    checkedAt: new Date().toISOString(),
  };
}

export function getWranglerBindingsManifest() {
  return {
    ...WRANGLER_BINDINGS_MANIFEST,
    bindingCount: WRANGLER_BINDINGS_MANIFEST.bindings.length,
    kvBindingCount: WRANGLER_BINDINGS_MANIFEST.bindings.filter((entry) => entry.type === "kv_namespace").length,
  };
}

export async function getCloudflareBindingsInspection() {
  const bindingsProbe = await probeMcpServer("cloudflare-bindings");
  const manifest = getWranglerBindingsManifest();
  return {
    bindingsMcp: bindingsProbe,
    manifest,
    health: bindingsProbe.reachable ? (bindingsProbe.requiresAuth ? "requires_oauth" : "online") : "offline",
    note: bindingsProbe.requiresAuth
      ? "OAuth required for live binding queries. Manifest reflects wrangler.jsonc declaration."
      : "Bindings MCP endpoint reachable.",
    checkedAt: new Date().toISOString(),
  };
}

export async function validateCloudflareBindings(moduleId = null) {
  const manifest = getWranglerBindingsManifest();
  const bindingNames = new Set(manifest.bindings.map((entry) => entry.name));
  const missing = PIPELINE_REQUIRED_BINDINGS.filter((name) => !bindingNames.has(name));
  const bindingsProbe = await probeMcpServer("cloudflare-bindings");
  const warnings = [];
  if (missing.length) {
    warnings.push(`Missing required bindings: ${missing.join(", ")}`);
  }
  if (bindingsProbe.status === "offline") {
    warnings.push("cloudflare-bindings MCP is offline; using manifest-only validation.");
  }
  if (bindingsProbe.status === "requires_oauth") {
    warnings.push("cloudflare-bindings MCP requires OAuth for live inspection.");
  }
  return {
    valid: missing.length === 0,
    health: missing.length ? "warning" : bindingsProbe.status === "offline" ? "degraded" : "online",
    moduleId,
    requiredBindings: PIPELINE_REQUIRED_BINDINGS,
    presentBindings: PIPELINE_REQUIRED_BINDINGS.filter((name) => bindingNames.has(name)),
    missingBindings: missing,
    bindingsMcp: bindingsProbe,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareBindingHealth() {
  const validation = await validateCloudflareBindings();
  const inspection = await getCloudflareBindingsInspection();
  return {
    health: validation.health,
    validation,
    inspection,
    checkedAt: new Date().toISOString(),
  };
}

function searchCuratedDocs(query, topic = null) {
  const normalizedTopic = normalizeDocsTopic(topic);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length && !normalizedTopic) {
    return [];
  }
  return CURATED_DOCS_INDEX.filter((entry) => {
    if (normalizedTopic && entry.topic !== normalizedTopic) {
      return false;
    }
    const haystack = `${entry.title} ${entry.keywords.join(" ")} ${entry.topic || ""}`.toLowerCase();
    return terms.length ? terms.every((term) => haystack.includes(term)) : true;
  }).map((entry) => ({
    title: entry.title,
    url: entry.url,
    topic: entry.topic,
    source: "curated-fallback",
  }));
}

export async function searchCloudflareDocs(query, options = {}) {
  const normalizedQuery = String(query || "").trim();
  const topic = normalizeDocsTopic(options.topic);
  if (!normalizedQuery && !topic) {
    return { query: "", topic: null, results: [], source: "none", checkedAt: new Date().toISOString() };
  }

  const searchQuery = normalizedQuery || DOCS_QUICK_ACTIONS.find((action) => action.topic === topic)?.query || topic;
  const docsServer = CLOUDFLARE_MCP_SERVERS["cloudflare-docs"];
  try {
    const init = await withTimeout(
      mcpJsonRpc(docsServer.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO,
      }),
    );

    if (init.ok && !init.error) {
      const toolCall = await withTimeout(
        mcpJsonRpc(docsServer.url, "tools/call", {
          name: "search_cloudflare_documentation",
          arguments: { query: searchQuery },
        }),
      );

      if (toolCall.result?.content) {
        const textBlocks = toolCall.result.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n");
        return {
          query: searchQuery,
          topic,
          source: "cloudflare-docs-mcp",
          results: [{ title: "Documentation search", snippet: textBlocks.slice(0, 1200), topic, source: "mcp" }],
          checkedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fall through to curated index.
  }

  const fallbackResults = searchCuratedDocs(searchQuery, topic);
  return {
    query: searchQuery,
    topic,
    source: fallbackResults.length ? "curated-fallback" : "no-results",
    results: fallbackResults,
    checkedAt: new Date().toISOString(),
  };
}

export function getDocsQuickActions(category = null) {
  const filtered = category
    ? DOCS_QUICK_ACTIONS.filter((action) => action.category === normalizeDocsTopic(category) || action.topic === normalizeDocsTopic(category))
    : DOCS_QUICK_ACTIONS;
  return filtered.map((action) => ({
    ...action,
    endpoint: `/api/os/cloudflare/docs?q=${encodeURIComponent(action.query)}&topic=${encodeURIComponent(action.topic)}`,
  }));
}

export async function getCloudflareApiReachability() {
  const apiProbe = await probeMcpServer("cloudflare");
  const allProbes = await probeAllMcpServers();
  return {
    apiMcp: apiProbe,
    servers: allProbes.servers,
    summary: allProbes.summary,
    health: apiProbe.reachable ? (apiProbe.requiresAuth ? "requires_oauth" : "online") : "offline",
    checkedAt: new Date().toISOString(),
  };
}

export function evaluateCloudflareSafetyFactor(reachability, governance = {}, actionsHealth = null) {
  const servers = reachability?.servers || [];
  const offline = servers.filter((server) => server.status === "offline");
  const requiresOAuth = servers.filter((server) => server.status === "requires_oauth");
  const warnings = [];
  if (offline.length) {
    warnings.push(`Offline MCP servers: ${offline.map((server) => server.id).join(", ")}`);
  }
  if (requiresOAuth.length) {
    warnings.push(`OAuth pending for: ${requiresOAuth.map((server) => server.id).join(", ")}`);
  }
  const score = Math.max(0, 100 - offline.length * 25 - requiresOAuth.length * 5);
  const status = offline.length ? "degraded" : requiresOAuth.length ? "requires_oauth" : "healthy";
  const blockOnOffline = governance.cloudflareSafetyRules?.blockOnMcpOffline === true;
  const actionMap = Object.fromEntries((actionsHealth?.actions || []).map((entry) => [entry.id, entry.health]));
  return {
    score,
    status,
    warnings,
    offlineCount: offline.length,
    requiresOAuthCount: requiresOAuth.length,
    blockRecommended: blockOnOffline && offline.length > 0,
    advisoryOnly: !blockOnOffline,
    actions: {
      logs: actionMap.logs || "unknown",
      metrics: actionMap.metrics || "unknown",
      build: actionMap.build || "unknown",
      bindings: actionMap["validate-bindings"] || "unknown",
      docs: actionMap["docs-search"] || "online",
    },
    metrics: {
      score,
      offlineCount: offline.length,
      requiresOAuthCount: requiresOAuth.length,
      averageLatencyMs: reachability?.summary?.averageLatencyMs ?? null,
    },
    bindings: {
      health: actionMap["validate-bindings"] || "unknown",
      advisoryOnly: true,
    },
    checkedAt: new Date().toISOString(),
  };
}

function detectLogAnomalies(logsResult = {}) {
  const lines = (logsResult.logs || []).map((line) => String(line));
  const hits = lines.filter((line) => ANOMALY_LOG_PATTERNS.some((pattern) => pattern.test(line)));
  const triggered = hits.length >= 2 || (hits.length > 0 && logsResult.health === "online");
  return {
    triggered,
    trigger: AUTONOMOUS_SIGNAL_TRIGGERS["logs-anomaly"],
    hits: hits.slice(0, 5),
    health: logsResult.health || "unknown",
    advisory: triggered
      ? "Worker logs show anomaly patterns or degraded observability health."
      : "No log anomalies detected.",
  };
}

function detectMetricsSpike(metricsResult = {}) {
  const metrics = metricsResult.metrics || [];
  const metricText = metrics.map((entry) => JSON.stringify(entry)).join(" ");
  const keywordHits = METRICS_SPIKE_KEYWORDS.filter((pattern) => pattern.test(metricText));
  const triggered = keywordHits.length > 0 && metricsResult.health === "online";
  return {
    triggered,
    trigger: AUTONOMOUS_SIGNAL_TRIGGERS["metrics-spike"],
    keywordHits,
    health: metricsResult.health || "unknown",
    advisory: triggered
      ? "Worker metrics indicate elevated activity or degraded observability health."
      : "No metrics spike detected.",
  };
}

function detectBuildFailure(buildResult = {}) {
  const logs = (buildResult.logs || []).map((line) => String(line));
  const failedStage = (buildResult.stages || []).find((stage) => stage.status === "failed" || stage.status === "error");
  const logFailure = logs.some((line) => /fail|error|rejected/i.test(line));
  const healthFailure = buildResult.health === "offline" || buildResult.status === "offline";
  const triggered = Boolean(failedStage) || logFailure || healthFailure;
  return {
    triggered,
    trigger: AUTONOMOUS_SIGNAL_TRIGGERS["build-failure"],
    failedStage: failedStage || null,
    health: buildResult.health || "unknown",
    advisory: triggered
      ? "Cloudflare build pipeline reports failure, offline status, or error logs."
      : "No build failures detected.",
  };
}

function detectBindingMismatch(bindingsResult = {}) {
  const missing = bindingsResult.missingBindings || [];
  const triggered = bindingsResult.valid === false || missing.length > 0;
  return {
    triggered,
    trigger: AUTONOMOUS_SIGNAL_TRIGGERS["binding-mismatch"],
    missingBindings: missing,
    warnings: (bindingsResult.warnings || []).slice(0, 5),
    health: bindingsResult.health || bindingsResult.status || "unknown",
    advisory: triggered
      ? "Wrangler manifest or MCP binding validation detected mismatches."
      : "Bindings validated against manifest.",
  };
}

export async function collectAutonomousSignalInputs() {
  const [logs, metrics, build, bindings] = await Promise.all([
    getCloudflareLogs(),
    getCloudflareMetrics(),
    runCloudflareBuild(),
    postValidateCloudflareBindings(),
  ]);
  return { logs, metrics, build, bindings };
}

export function buildAutonomousGovernanceSignals(inputs = {}, governance = {}) {
  const logsAnomaly = detectLogAnomalies(inputs.logs);
  const metricsSpike = detectMetricsSpike(inputs.metrics);
  const buildFailure = detectBuildFailure(inputs.build);
  const bindingMismatch = detectBindingMismatch(inputs.bindings);
  const triggers = [];
  const advisories = [];
  const signalMap = { logsAnomaly, metricsSpike, buildFailure, bindingMismatch };

  for (const [key, signal] of Object.entries(signalMap)) {
    if (!signal.triggered) {
      continue;
    }
    triggers.push(signal.trigger.id);
    advisories.push({
      id: signal.trigger.id,
      label: signal.trigger.label,
      severity: signal.trigger.severity,
      message: signal.advisory,
      source: key,
    });
  }

  const blockOnOffline = governance.cloudflareSafetyRules?.blockOnMcpOffline === true;
  return {
    triggers,
    advisories,
    signals: signalMap,
    triggerCatalog: AUTONOMOUS_SIGNAL_TRIGGERS,
    blocking: blockOnOffline && advisories.length > 0,
    advisoryOnly: !blockOnOffline,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareAutonomousGovernanceSignals(governance = {}) {
  const inputs = await collectAutonomousSignalInputs();
  return buildAutonomousGovernanceSignals(inputs, governance);
}

export function computeCloudflareAutonomousSafety(reachability, autonomousSignals = {}, governance = {}) {
  const servers = reachability?.servers || [];
  const avgLatency = reachability?.summary?.averageLatencyMs ?? 0;
  const oauthPending = servers.filter((server) => server.status === "requires_oauth").length;
  const offline = servers.filter((server) => server.status === "offline").length;
  const autonomousWarnings = (autonomousSignals.advisories || []).map((entry) => entry.message);

  if (offline > 0) {
    autonomousWarnings.push(`Offline MCP servers detected: ${offline}.`);
  }
  if (oauthPending > 0) {
    autonomousWarnings.push(`OAuth pending on ${oauthPending} Cloudflare MCP server(s).`);
  }

  const latencyRisk = avgLatency > 2000 ? "high" : avgLatency > 1000 ? "medium" : "low";
  const oauthRisk = oauthPending >= 3 ? "high" : oauthPending >= 1 ? "medium" : "low";

  let autonomousScore = 100;
  autonomousScore -= offline * 15;
  autonomousScore -= oauthPending * 5;
  autonomousScore -= (autonomousSignals.triggers || []).length * 8;
  if (latencyRisk === "high") {
    autonomousScore -= 10;
  } else if (latencyRisk === "medium") {
    autonomousScore -= 5;
  }
  if (oauthRisk === "high") {
    autonomousScore -= 10;
  } else if (oauthRisk === "medium") {
    autonomousScore -= 5;
  }
  autonomousScore = Math.max(0, Math.min(100, Math.round(autonomousScore)));

  const blockOnOffline = governance.cloudflareSafetyRules?.blockOnMcpOffline === true;
  return {
    autonomousWarnings,
    autonomousScore,
    latencyRisk,
    oauthRisk,
    advisoryOnly: !blockOnOffline,
    blockRecommended: blockOnOffline && (offline > 0 || autonomousScore < 40),
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareSafetySnapshot(governance = {}) {
  const [reachability, actionsHealth, autonomousSignals] = await Promise.all([
    getCloudflareApiReachability(),
    getCloudflareActionsHealth(),
    getCloudflareAutonomousGovernanceSignals(governance),
  ]);
  const factor = evaluateCloudflareSafetyFactor(reachability, governance, actionsHealth);
  const autonomous = computeCloudflareAutonomousSafety(reachability, autonomousSignals, governance);
  return {
    ...factor,
    cloudflareSafety: {
      autonomousWarnings: autonomous.autonomousWarnings,
      autonomousScore: autonomous.autonomousScore,
      latencyRisk: autonomous.latencyRisk,
      oauthRisk: autonomous.oauthRisk,
      advisoryOnly: autonomous.advisoryOnly,
      blockRecommended: autonomous.blockRecommended,
    },
    autonomousSignals,
    checkedAt: new Date().toISOString(),
  };
}

export function simulateCloudflareEventHooks(autonomousSignals = {}, inputs = {}) {
  const signals = autonomousSignals.signals || {};
  const buildComplete =
    !signals.buildFailure?.triggered &&
    (inputs.build?.health === "online" || inputs.build?.source === STATIC_BUILD_MANIFEST.source);
  const bindingMismatch = Boolean(signals.bindingMismatch?.triggered);
  const observabilitySpike = Boolean(signals.metricsSpike?.triggered || signals.logsAnomaly?.triggered);

  const cloudflareEvents = {
    onBuildComplete: {
      ...CLOUDFLARE_EVENT_HOOKS.onBuildComplete,
      fired: buildComplete,
      advisory: buildComplete
        ? "Advisory: Cloudflare build manifest stage satisfied or live build completed."
        : "Advisory: Build hook idle; no successful build signal detected.",
      payload: {
        worker: inputs.build?.worker || WRANGLER_BINDINGS_MANIFEST.worker,
        status: inputs.build?.health || inputs.build?.status || "unknown",
        source: inputs.build?.source || STATIC_BUILD_MANIFEST.source,
      },
    },
    onBindingMismatch: {
      ...CLOUDFLARE_EVENT_HOOKS.onBindingMismatch,
      fired: bindingMismatch,
      advisory: bindingMismatch
        ? "Advisory: Binding mismatch detected; review wrangler manifest and MCP validation."
        : "Advisory: Binding hook idle; no mismatch detected.",
      payload: {
        missingBindings: signals.bindingMismatch?.missingBindings || [],
        warnings: signals.bindingMismatch?.warnings || [],
      },
    },
    onObservabilitySpike: {
      ...CLOUDFLARE_EVENT_HOOKS.onObservabilitySpike,
      fired: observabilitySpike,
      advisory: observabilitySpike
        ? "Advisory: Observability spike or log anomaly detected."
        : "Advisory: Observability hook idle; no spike detected.",
      payload: {
        logsAnomaly: signals.logsAnomaly?.triggered || false,
        metricsSpike: signals.metricsSpike?.triggered || false,
      },
    },
  };

  return {
    cloudflareEvents,
    simulated: true,
    advisoryOnly: true,
    firedCount: Object.values(cloudflareEvents).filter((hook) => hook.fired).length,
    hookCatalog: CLOUDFLARE_EVENT_HOOKS,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareAutonomousSnapshot(governance = {}) {
  try {
    const inputs = await collectAutonomousSignalInputs();
    const autonomousSignals = buildAutonomousGovernanceSignals(inputs, governance);
    const [governanceHealth, safetySnapshot, events] = await Promise.all([
      getCloudflareGovernanceHealth(governance),
      getCloudflareSafetySnapshot(governance),
      Promise.resolve(simulateCloudflareEventHooks(autonomousSignals, inputs)),
    ]);
    return {
      cloudflareGovernance: {
        ...governanceHealth,
        autonomousSignals,
      },
      cloudflareSafety: safetySnapshot.cloudflareSafety,
      cloudflareEvents: events.cloudflareEvents,
      eventHooks: events,
      advisoryOnly: true,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return buildCloudflareAdvisoryFallback("autonomous", error);
  }
}

export function deriveAutonomousHealth(autonomousSnapshot = {}) {
  const score = autonomousSnapshot.cloudflareSafety?.autonomousScore ?? 100;
  const triggers = autonomousSnapshot.cloudflareGovernance?.autonomousSignals?.triggers?.length || 0;
  if (triggers > 0) {
    return "advisory";
  }
  if (score >= 80) {
    return "healthy";
  }
  if (score >= 50) {
    return "partial";
  }
  return "degraded";
}

export function deriveInsightsHealth(insightsSnapshot = {}) {
  const score = insightsSnapshot.cloudflareInsightsScore ?? 100;
  if (score >= 80) {
    return "healthy";
  }
  if (score >= 50) {
    return "partial";
  }
  return "degraded";
}

export function deriveEventsHealth(eventsSnapshot = {}) {
  const hooks = eventsSnapshot.cloudflareEvents || eventsSnapshot;
  const fired = Object.values(hooks).filter((hook) => hook?.fired).length;
  return fired > 0 ? "advisory" : "idle";
}

const AUTOMATION_LOOP_RECOMMENDATIONS = {
  logs: "Review Worker log anomalies and complete OAuth for cloudflare-observability MCP.",
  metrics: "Investigate metrics spike signals and validate observability dashboards.",
  build: "Run wrangler deploy --dry-run and connect cloudflare-builds MCP for live build health.",
  bindings: "Validate wrangler manifest bindings against pipeline requirements.",
  oauth: "Complete OAuth for Cloudflare MCP servers reporting requires_oauth status.",
  latency: "Review MCP server latency; investigate servers with latency above 2000ms.",
};

function buildAutomationLoopEntry(active, lastSignal, recommendedAction, checkedAt) {
  return {
    active: Boolean(active),
    advisoryOnly: true,
    lastRun: checkedAt,
    lastSignal: lastSignal || "idle",
    recommendedAction,
  };
}

export async function getCloudflareAutomationLoops(governance = {}) {
  try {
    const [reachability, autonomousSignals] = await Promise.all([
      getCloudflareApiReachability(),
      getCloudflareAutonomousGovernanceSignals(governance),
    ]);
    const checkedAt = new Date().toISOString();
    const signals = autonomousSignals.signals || {};
    const autonomous = computeCloudflareAutonomousSafety(reachability, autonomousSignals, governance);
    const oauthServers = (reachability.servers || []).filter((server) => server.status === "requires_oauth");
    const oauthPending = oauthServers.length > 0;

    const loops = {
      logs: buildAutomationLoopEntry(
        signals.logsAnomaly?.triggered,
        signals.logsAnomaly?.triggered ? signals.logsAnomaly.advisory : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.logs,
        checkedAt,
      ),
      metrics: buildAutomationLoopEntry(
        signals.metricsSpike?.triggered,
        signals.metricsSpike?.triggered ? signals.metricsSpike.advisory : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.metrics,
        checkedAt,
      ),
      build: buildAutomationLoopEntry(
        signals.buildFailure?.triggered,
        signals.buildFailure?.triggered ? signals.buildFailure.advisory : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.build,
        checkedAt,
      ),
      bindings: buildAutomationLoopEntry(
        signals.bindingMismatch?.triggered,
        signals.bindingMismatch?.triggered ? signals.bindingMismatch.advisory : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.bindings,
        checkedAt,
      ),
      oauth: buildAutomationLoopEntry(
        oauthPending || autonomous.oauthRisk !== "low",
        oauthPending
          ? `OAuth pending on ${oauthServers.length} server(s)`
          : autonomous.oauthRisk !== "low"
            ? `OAuth risk: ${autonomous.oauthRisk}`
            : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.oauth,
        checkedAt,
      ),
      latency: buildAutomationLoopEntry(
        autonomous.latencyRisk !== "low",
        autonomous.latencyRisk !== "low" ? `Latency risk: ${autonomous.latencyRisk}` : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.latency,
        checkedAt,
      ),
    };

    const activeCount = Object.values(loops).filter((loop) => loop.active).length;
    const health = deriveAutomationHealth({ loops, activeCount });
    const score = Math.max(0, 100 - activeCount * 15);
    const reasons = Object.entries(loops)
      .filter(([, loop]) => loop.active)
      .map(([id, loop]) => `${id}: ${loop.lastSignal || loop.recommendedAction || "active"}`);
    return {
      loops,
      activeCount,
      health,
      score,
      mode: activeCount > 0 ? "active" : "idle",
      reasons,
      advisoryOnly: true,
      checkedAt,
    };
  } catch (error) {
    return buildCloudflareAdvisoryFallback("automation", error);
  }
}

export function deriveAutomationHealth(automationSnapshot = {}) {
  const activeCount =
    automationSnapshot.activeCount ??
    Object.values(automationSnapshot.loops || {}).filter((loop) => loop.active).length;
  if (activeCount === 0) {
    return automationSnapshot.error ? "optional" : "healthy";
  }
  if (activeCount <= 2) {
    return "advisory";
  }
  return "degraded";
}

export function certifyModuleForCloudflare(moduleId, context = {}) {
  const compatibility = getModuleCfCompatibility(moduleId);
  const requiredActions = compatibility.actions || ["docs"];
  const actionsHealth = context.actionsHealth || { actions: [] };
  const autonomousSignals = context.autonomousSignals || { triggers: [], advisories: [] };
  const reasons = [];
  const actionStatuses = {};
  let score = 30;

  const capabilityMap = {
    logs: "logs",
    metrics: "metrics",
    build: "build",
    bindings: "validate-bindings",
    docs: "docs-search",
  };
  const actionHealthMap = Object.fromEntries(
    (actionsHealth.actions || []).map((entry) => [entry.id, entry.health || "unknown"]),
  );

  for (const cap of ["logs", "metrics", "build", "bindings", "docs"]) {
    const required = requiredActions.includes(cap);
    const health = actionHealthMap[capabilityMap[cap]] || actionHealthMap[cap] || "unknown";

    if (!required) {
      actionStatuses[cap] = "not-required";
      continue;
    }

    if (health === "online") {
      actionStatuses[cap] = "compatible";
      score += 14;
      reasons.push(`${cap} federation action online for module.`);
    } else if (health === "requires_oauth") {
      actionStatuses[cap] = "oauth-pending";
      score += 8;
      reasons.push(`${cap} requires OAuth; advisory compatibility maintained.`);
    } else {
      actionStatuses[cap] = "degraded";
      score += 2;
      reasons.push(`${cap} action degraded; certification review recommended.`);
    }
  }

  if (compatibility.cfReadyPlus) {
    score += 10;
    reasons.push("Module meets CF_READY+ action breadth.");
  }

  if ((autonomousSignals.triggers || []).length) {
    for (const advisory of autonomousSignals.advisories || []) {
      reasons.push(advisory.message || advisory.label || String(advisory));
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let status = score >= 80 ? "certified" : score >= 50 ? "review" : "incompatible";
  if (status === "certified" && (autonomousSignals.triggers || []).length >= 3) {
    status = "review";
    reasons.push("Multiple autonomous signals active; downgrade to review.");
  }

  return {
    status,
    score,
    reasons: [...new Set(reasons)].slice(0, 10),
    actions: actionStatuses,
    moduleId,
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function getMarketplaceCloudflareCertification(governance = {}, moduleIds = null) {
  try {
    const [actionsHealth, autonomousSignals, federation] = await Promise.all([
      getCloudflareActionsHealth(),
      getCloudflareAutonomousGovernanceSignals(governance),
      getCloudflareFederationReadiness(),
    ]);
    const context = { actionsHealth, autonomousSignals, federation };
    const ids = moduleIds?.length ? moduleIds : Object.keys(MODULE_CF_ACTION_COMPATIBILITY);
    const certifications = Object.fromEntries(ids.map((id) => [id, certifyModuleForCloudflare(id, context)]));

    const scores = Object.values(certifications).map((entry) => entry.score);
    const aggregateScore = scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;
    const aggregateStatus = aggregateScore >= 80 ? "certified" : aggregateScore >= 50 ? "review" : "incompatible";
    const aggregateReasons = [
      `Federation readiness ${federation.readiness} (${federation.readinessScore ?? 0}).`,
      ...(autonomousSignals.advisories || []).slice(0, 4).map((entry) => entry.message),
    ];

    return {
      certifications,
      aggregate: {
        status: aggregateStatus,
        score: aggregateScore,
        reasons: [...new Set(aggregateReasons)].slice(0, 12),
        advisoryOnly: true,
      },
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return buildCloudflareAdvisoryFallback("certification", error);
  }
}

export function deriveCertificationHealth(certificationSnapshot = {}) {
  const score = certificationSnapshot.aggregate?.score ?? certificationSnapshot.score ?? 100;
  if (score >= 80) {
    return "healthy";
  }
  if (score >= 50) {
    return "advisory";
  }
  return "degraded";
}

export function buildCloudflareSafetyAutomationFactor(automationSnapshot = {}) {
  return {
    health: deriveAutomationHealth(automationSnapshot),
    activeCount: automationSnapshot.activeCount ?? 0,
    loops: automationSnapshot.loops || {},
    advisoryOnly: true,
    checkedAt: automationSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function buildCloudflareSafetyCertificationFactor(certificationSnapshot = {}) {
  const aggregate = certificationSnapshot.aggregate || certificationSnapshot;
  return {
    health: deriveCertificationHealth(certificationSnapshot),
    score: aggregate.score ?? null,
    status: aggregate.status || "review",
    reasons: aggregate.reasons || [],
    advisoryOnly: true,
    checkedAt: certificationSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function computeInsightsScore(summaries = {}, autonomousSignals = {}, reachability = {}) {
  let score = 100;
  const healthPenalty = {
    offline: 20,
    degraded: 12,
    requires_oauth: 6,
    warning: 8,
  };
  for (const summary of Object.values(summaries)) {
    const penalty = healthPenalty[summary.health] || healthPenalty[summary.status] || 0;
    score -= penalty;
    if (summary.anomaly) {
      score -= 10;
    }
  }
  score -= (autonomousSignals.triggers || []).length * 6;
  score -= (reachability.servers || []).filter((server) => server.status === "offline").length * 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getExpandedFederationScore(readinessScore, autonomousScore, insightsScore, triggers = []) {
  const base = readinessScore ?? 0;
  const auto = autonomousScore ?? 100;
  const insights = insightsScore ?? 100;
  const penalty = triggers.length * 5;
  return Math.max(0, Math.min(100, Math.round(base * 0.4 + auto * 0.3 + insights * 0.3 - penalty)));
}

export async function getCloudflareInsights(governance = {}) {
  const [inputs, reachability, autonomousSignals] = await Promise.all([
    collectAutonomousSignalInputs(),
    getCloudflareApiReachability(),
    getCloudflareAutonomousGovernanceSignals(governance),
  ]);

  const logs = {
    health: inputs.logs?.health || "unknown",
    status: inputs.logs?.status || "unknown",
    source: inputs.logs?.source || "unknown",
    count: (inputs.logs?.logs || []).length,
    advisory: inputs.logs?.advisory || null,
    anomaly: Boolean(autonomousSignals.signals?.logsAnomaly?.triggered),
    sample: (inputs.logs?.logs || []).slice(0, 3),
  };
  const metrics = {
    health: inputs.metrics?.health || "unknown",
    status: inputs.metrics?.status || "unknown",
    source: inputs.metrics?.source || "unknown",
    count: (inputs.metrics?.metrics || []).length,
    advisory: inputs.metrics?.advisory || null,
    anomaly: Boolean(autonomousSignals.signals?.metricsSpike?.triggered),
    sample: (inputs.metrics?.metrics || []).slice(0, 3),
  };
  const build = {
    health: inputs.build?.health || "unknown",
    status: inputs.build?.status || "unknown",
    source: inputs.build?.source || "unknown",
    stages: (inputs.build?.stages || []).map((stage) => stage.name),
    advisory: inputs.build?.advisory || null,
    anomaly: Boolean(autonomousSignals.signals?.buildFailure?.triggered),
    logCount: (inputs.build?.logs || []).length,
  };
  const bindings = {
    health: inputs.bindings?.health || inputs.bindings?.status || "unknown",
    valid: inputs.bindings?.valid ?? null,
    source: inputs.bindings?.source || "unknown",
    missingBindings: inputs.bindings?.missingBindings || [],
    advisory: inputs.bindings?.advisory || null,
    anomaly: Boolean(autonomousSignals.signals?.bindingMismatch?.triggered),
  };

  const cloudflareInsights = {
    logs,
    metrics,
    build,
    bindings,
    recommendations: CLOUDFLARE_INSIGHTS_RECOMMENDATIONS,
  };
  const cloudflareInsightsScore = computeInsightsScore(
    { logs, metrics, build, bindings },
    autonomousSignals,
    reachability,
  );

  return {
    cloudflareInsights,
    cloudflareInsightsScore,
    health: deriveInsightsHealth({ cloudflareInsightsScore }),
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export function computeCloudflareDecision(context = {}) {
  const reasons = [];
  const signals = context.signals || {};
  const riskBadges = {
    latency: context.latencyRisk || "low",
    oauth: context.oauthRisk || "low",
    bindings: signals.bindingMismatch?.triggered ? "anomaly" : "ok",
    build: signals.buildFailure?.triggered ? "anomaly" : "ok",
    logs: signals.logsAnomaly?.triggered ? "anomaly" : "ok",
    metrics: signals.metricsSpike?.triggered ? "anomaly" : "ok",
  };

  for (const advisory of context.advisories || []) {
    if (advisory.message) {
      reasons.push(advisory.message);
    }
  }

  let score = Math.round(
    (context.insightsScore ?? 50) * 0.35 +
      (context.federationScore ?? 50) * 0.35 +
      (context.autonomousScore ?? 50) * 0.3,
  );

  if (context.latencyRisk === "high") {
    reasons.push("Elevated Cloudflare MCP latency risk.");
    score -= 10;
  } else if (context.latencyRisk === "medium") {
    reasons.push("Moderate Cloudflare MCP latency risk.");
    score -= 5;
  }

  if (context.oauthRisk === "high") {
    reasons.push("OAuth pending on multiple Cloudflare MCP servers.");
    score -= 10;
  } else if (context.oauthRisk === "medium") {
    reasons.push("OAuth required for some Cloudflare federation actions.");
    score -= 5;
  }

  score -= (context.triggers || []).length * 4;
  score = Math.max(0, Math.min(100, score));

  const bindingMismatch = Boolean(signals.bindingMismatch?.triggered);
  const buildFailure = Boolean(signals.buildFailure?.triggered);
  const logsAnomaly = Boolean(signals.logsAnomaly?.triggered);
  const metricsSpike = Boolean(signals.metricsSpike?.triggered);
  const triggerCount = (context.triggers || []).length;

  let decision = "proceed";
  if (score < 45 || bindingMismatch || buildFailure || (logsAnomaly && metricsSpike)) {
    decision = "hold";
    if (bindingMismatch) {
      reasons.unshift("Binding mismatch detected — review wrangler manifest.");
    }
    if (buildFailure) {
      reasons.unshift("Build failure or offline builds MCP detected.");
    }
  } else if (score < 70 || triggerCount > 0 || context.latencyRisk !== "low" || context.oauthRisk !== "low") {
    decision = "caution";
  }

  const blockOnOffline = context.blockOnOffline === true;
  return {
    decision,
    reasons: [...new Set(reasons)].slice(0, 12),
    score,
    advisoryOnly: !blockOnOffline,
    riskBadges,
    summary: {
      decision,
      score,
      triggerCount,
      federationScore: context.federationScore ?? null,
      insightsScore: context.insightsScore ?? null,
      autonomousScore: context.autonomousScore ?? null,
    },
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareDecision(governance = {}, options = {}) {
  try {
    const [autonomous, insights, federation] = await Promise.all([
      getCloudflareAutonomousSnapshot(governance),
      getCloudflareInsights(governance),
      getCloudflareFederationReadiness(),
    ]);
    const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
    const federationScore = getExpandedFederationScore(
      federation.readinessScore,
      autonomous.cloudflareSafety?.autonomousScore,
      insights.cloudflareInsightsScore,
      triggers,
    );
    const context = {
      insightsScore: insights.cloudflareInsightsScore,
      federationScore,
      autonomousScore: autonomous.cloudflareSafety?.autonomousScore,
      triggers,
      advisories: autonomous.cloudflareGovernance?.autonomousSignals?.advisories || [],
      signals: autonomous.cloudflareGovernance?.autonomousSignals?.signals || {},
      latencyRisk: autonomous.cloudflareSafety?.latencyRisk || "low",
      oauthRisk: autonomous.cloudflareSafety?.oauthRisk || "low",
      blockOnOffline: governance.cloudflareSafetyRules?.blockOnMcpOffline === true,
      moduleId: options.moduleId || null,
    };
    const decision = computeCloudflareDecision(context);
    return {
      ...decision,
      advisoryOnly: true,
      route: "/api/os/cloudflare/decision",
    };
  } catch (error) {
    return buildCloudflareAdvisoryFallback("decision", error);
  }
}

export function deriveDecisionHealth(decision = {}) {
  if (decision.decision === "proceed") {
    return "healthy";
  }
  if (decision.decision === "caution") {
    return "advisory";
  }
  return "degraded";
}

export function derivePipelineRisk(decision = {}) {
  if (decision.decision === "hold") {
    return "high";
  }
  if (decision.decision === "caution") {
    return "medium";
  }
  return "low";
}

export async function getCloudflarePipelineDecision(governance = {}, moduleId = null) {
  const decision = await getCloudflareDecision(governance, { moduleId });
  return {
    cloudflarePipelineDecision: decision.decision,
    cloudflarePipelineRisk: derivePipelineRisk(decision),
    cloudflarePipelineAdvisories: decision.reasons,
    advisoryOnly: true,
    score: decision.score,
    riskBadges: decision.riskBadges,
    checkedAt: decision.checkedAt,
  };
}

export function pickModuleInsights(insights, moduleActions = []) {
  if (!insights) {
    return {};
  }
  const picked = {};
  if (moduleActions.includes("logs")) {
    picked.logs = insights.logs;
  }
  if (moduleActions.includes("metrics")) {
    picked.metrics = insights.metrics;
  }
  if (moduleActions.includes("build")) {
    picked.build = insights.build;
  }
  if (moduleActions.includes("bindings")) {
    picked.bindings = insights.bindings;
  }
  if (!Object.keys(picked).length) {
    return { docs: { advisory: "Module uses docs-first Cloudflare federation." } };
  }
  return picked;
}

export function getModuleCloudflareDecisionFields(moduleId, baseDecision, insightsSnapshot) {
  const compatibility = getModuleCfCompatibility(moduleId);
  const moduleInsights = pickModuleInsights(insightsSnapshot?.cloudflareInsights, compatibility.actions);
  let risk = "low";
  if (baseDecision.decision === "hold") {
    risk = "high";
  } else if (baseDecision.decision === "caution") {
    risk = "medium";
  }
  if (compatibility.actions.includes("bindings") && baseDecision.riskBadges?.bindings === "anomaly") {
    risk = risk === "low" ? "medium" : "high";
  }
  return {
    cloudflareDecision: baseDecision.decision,
    cloudflareModuleRisk: risk,
    cloudflareModuleInsights: moduleInsights,
  };
}

export async function getCloudflareGovernanceDecisioning(governance = {}, env = {}) {
  const [decision, automation, certification, crossDivision, orchestration, execution, insights, autonomous, reachability] =
    await Promise.all([
    getCloudflareDecision(governance),
    getCloudflareAutomationLoops(governance),
    getMarketplaceCloudflareCertification(governance),
    getCloudflareCrossDivisionSync(governance, env),
    getCloudflareOrchestration(governance, env),
    getCloudflareExecution(governance, env),
    getCloudflareInsights(governance),
    getCloudflareAutonomousSnapshot(governance),
    getCloudflareApiReachability(),
  ]);
  const activeLoops = Object.entries(automation.loops || {})
    .filter(([, loop]) => loop.active)
    .map(([id]) => id);
  let recommendedAction =
    decision.decision === "proceed"
      ? "Continue with optional Cloudflare MCP federation; no blocking advisories."
      : decision.decision === "caution"
        ? "Review Cloudflare advisories and complete OAuth before high-impact pipeline or release actions."
        : "Pause promotion activities until binding mismatches and build issues are resolved.";
  if (activeLoops.length) {
    recommendedAction += ` Active automation loops: ${activeLoops.join(", ")}.`;
  }
  if (certification.aggregate?.status === "incompatible") {
    recommendedAction += " Marketplace certification reports incompatible modules; review before promotion.";
  }
  if (crossDivision.syncStatus === "divergent") {
    recommendedAction += " Cross-division Cloudflare sync is divergent; reconcile operator-shell and marketplace-backend federation metadata.";
  } else if (crossDivision.syncStatus === "partial") {
    recommendedAction += " Cross-division sync is partial; review marketplace sync advisories.";
  }
  const crossDivisionRecommendedAction =
    crossDivision.syncStatus === "aligned"
      ? "Cross-division Cloudflare federation metadata is aligned across repos."
      : crossDivision.syncStatus === "partial"
        ? "Review cross-division sync reasons and reconcile certification/automation deltas between divisions."
        : "Cross-division federation divergent; pause promotion until operator-shell and marketplace-backend signals reconcile.";
  const orchestrationRecommendedAction =
    orchestration.orchestrationHealth === "healthy"
      ? "Multi-agent Cloudflare orchestration coordinated; continue advisory federation workflows."
      : orchestration.orchestrationHealth === "advisory"
        ? `Review orchestration plan (${(orchestration.plan || []).length} steps); ${(orchestration.recommendedActions || [])[0] || "advisory coordination recommended."}`
        : `Orchestration degraded (score ${orchestration.orchestrationScore ?? "n/a"}); defer promotion until high-priority steps resolve.`;
  const executionRecommendedAction =
    execution.executionHealth === "healthy"
      ? "Autonomous execution recommendations ready; proceed with advisory operator actions."
      : execution.executionHealth === "advisory"
        ? `Review execution plan (${(execution.executionPlan || []).length} steps); ${(execution.nextActions || [])[0] || "advisory execution review recommended."}`
        : `Execution degraded (score ${execution.executionScore ?? "n/a"}); defer autonomous actions until high-priority steps resolve.`;
  const adaptive = buildCloudflareAdaptiveFromSignals({
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
    reachability,
  });
  const adaptiveRecommendedAction =
    adaptive.adaptiveState?.mode === "steady"
      ? "Adaptive runtime steady; normal UI hints."
      : adaptive.adaptiveState?.mode === "review"
        ? `Adaptive review mode: ${(adaptive.adaptiveState.reasons || []).slice(0, 2).join(" ")}`
        : adaptive.adaptiveState?.mode === "degraded"
          ? "Adaptive degraded; Cloudflare signals missing — use fallback hints."
          : `Adaptive caution mode: ${(adaptive.operatorGuidance || [])[0] || "review advisories."}`;
  const predictive = buildCloudflarePredictiveFromSignals({
    adaptive,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
    reachability,
  });
  const predictiveRecommendedAction =
    predictive.predictiveState?.forecastMode === "stable"
      ? "Predictive forecast stable; no major federation changes expected."
      : predictive.predictiveState?.forecastMode === "watch"
        ? `Predictive watch: ${(predictive.predictiveState.forecastReasons || []).slice(0, 2).join(" ")}`
        : predictive.predictiveState?.forecastMode === "fallback"
          ? "Predictive fallback; complete OAuth to improve forecast accuracy."
          : `Predictive alert: ${(predictive.recommendedPreemptiveActions || [])[0] || "review preemptive advisories."}`;
  const strategic = buildCloudflareStrategicFromSignals({
    predictive,
    adaptive,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
  });
  const strategicRecommendedAction =
    strategic.strategicState?.stripMode === "stable"
      ? `Strategic posture stable (${strategic.strategicState.horizon} horizon); maintain federation steady-state.`
      : strategic.strategicState?.stripMode === "prioritize"
        ? `Strategic prioritize: ${(strategic.strategicPlan || []).slice(0, 2).map((step) => step.action).join(" ")}`
        : `Strategic watch (${strategic.strategicState?.horizon || "medium"} horizon): ${(strategic.recommendedCampaigns || [])[0] || "review advisory plan."}`;
  const ucip = buildCloudflareUcipFromSignals({
    automation,
    autonomous,
    decision,
    certification,
    crossDivision,
    orchestration,
    execution,
    adaptive,
    predictive,
    strategic,
    insights,
  });
  const ucipRecommendedAction =
    ucip.ucipState?.mode === "green"
      ? "UCIP green: synthesized federation stable; continue normal workflows."
      : ucip.ucipState?.mode === "red"
        ? `UCIP red: ${(ucip.ucipReasons || []).slice(0, 2).join(" ")}`
        : `UCIP ${ucip.ucipState?.mode}: ${(ucip.ucipRecommendedActions || [])[0] || "review unified advisories."}`;
  const amg = buildCloudflareAmgFromUcip(ucip);
  const amgRecommendedAction =
    amg.amgState?.mode === "govern_green"
      ? "AMG green: UCIP stable; continue with standard governance review."
      : amg.amgState?.mode === "govern_red"
        ? `AMG red: ${(amg.amgReasons || []).slice(0, 2).join(" ")}`
        : `AMG ${amg.amgState?.mode}: ${(amg.amgOperatorNudges || [])[0]?.nudge || (amg.amgRules || [])[0]?.rule || "review AMG guidance."}`;
  const alignmentContext = await buildCalAlignmentContextFromEnv(governance, env, {});
  const cba = buildCloudflareCbaFromAmg(amg, ucip, alignmentContext);
  const cal = buildCloudflareCalFromCba(cba, amg, ucip, alignmentContext);
  const ihl = buildCloudflareIhlFromCal(cal, cba, amg, ucip, alignmentContext);
  const iarl = buildCloudflareIarlFromIhl(ihl, cal, cba, amg, ucip, alignmentContext);
  const acl = buildCloudflareAclFromIarl(iarl, ihl, cal, cba, amg, ucip, alignmentContext);
  const calRecommendedAction =
    cal.calState?.mode === "align_green"
      ? "CAL green: cognitive posture aligned with UCIP + AMG + CBA."
      : cal.calState?.mode === "align_red"
        ? `CAL red: ${(cal.calReasons || []).slice(0, 2).join(" ")}`
        : `CAL ${cal.calState?.mode}: ${(cal.calOperatorAlignmentHints || [])[0] || (cal.calAlignmentWarnings || [])[0] || "review alignment guidance."}`;
  const ihlRecommendedAction =
    ihl.ihlState?.mode === "intent_green"
      ? "IHL green: operator, mission, and OS intent harmonized with UCIP + AMG + CBA + CAL."
      : ihl.ihlState?.mode === "intent_red"
        ? `IHL red: ${(ihl.ihlReasons || []).slice(0, 2).join(" ")}`
        : `IHL ${ihl.ihlState?.mode}: ${(ihl.ihlOperatorIntentHints || [])[0] || (ihl.ihlIntentWarnings || [])[0] || "review intent harmonization guidance."}`;
  const iarlRecommendedAction =
    iarl.iarlState?.mode === "resonance_green"
      ? "IARL green: intent and actions resonate across operator, mission, and OS layers."
      : iarl.iarlState?.mode === "resonance_red"
        ? `IARL red: ${(iarl.iarlReasons || []).slice(0, 2).join(" ")}`
        : `IARL ${iarl.iarlState?.mode}: ${(iarl.iarlOperatorResonanceHints || [])[0] || (iarl.iarlResonanceWarnings || [])[0] || "review resonance guidance."}`;
  const aclRecommendedAction =
    acl.aclState?.mode === "coherence_green"
      ? "ACL green: OS coherence aligned across operator, mission, marketplace, and system layers."
      : acl.aclState?.mode === "coherence_red"
        ? `ACL red: ${(acl.aclReasons || []).slice(0, 2).join(" ")}`
        : `ACL ${acl.aclState?.mode}: ${(acl.aclOperatorCoherenceHints || [])[0] || (acl.aclCoherenceWarnings || [])[0] || "review coherence guidance."}`;
  return {
    decisioning: decision,
    recommendedAction,
    automationSignals: automation,
    certificationSignals: certification.aggregate,
    crossDivisionSignals: crossDivision,
    crossDivisionRecommendedAction,
    orchestrationSignals: orchestration,
    orchestrationRecommendedAction,
    executionSignals: execution,
    executionRecommendedAction,
    adaptiveSignals: adaptive,
    adaptiveRecommendedAction,
    predictiveSignals: predictive,
    predictiveRecommendedAction,
    strategicSignals: strategic,
    strategicRecommendedAction,
    ucipSignals: ucip,
    ucipRecommendedAction,
    amgState: amg.amgState,
    amgRules: amg.amgRules,
    amgOperatorNudges: amg.amgOperatorNudges,
    amgPolicyHints: amg.amgPolicyHints,
    amgRecommendedAction,
    cbaState: cba.cbaState,
    cbaBehaviorPatterns: cba.cbaBehaviorPatterns,
    cbaBehaviorDriftWarnings: cba.cbaBehaviorDriftWarnings,
    cbaBehaviorHints: [...(cba.cbaOperatorBehaviorHints || []), ...(cba.cbaSystemBehaviorHints || [])],
    calState: cal.calState,
    calAlignmentFindings: cal.calAlignmentFindings,
    calAlignmentWarnings: cal.calAlignmentWarnings,
    calAlignmentHints: [...(cal.calOperatorAlignmentHints || []), ...(cal.calSystemAlignmentHints || [])],
    calRecommendedAction,
    ihlState: ihl.ihlState,
    ihlIntentFindings: ihl.ihlIntentFindings,
    ihlIntentWarnings: ihl.ihlIntentWarnings,
    ihlIntentHints: [...(ihl.ihlOperatorIntentHints || []), ...(ihl.ihlSystemIntentHints || [])],
    ihlRecommendedAction,
    iarlState: iarl.iarlState,
    iarlResonanceFindings: iarl.iarlResonanceFindings,
    iarlResonanceWarnings: iarl.iarlResonanceWarnings,
    iarlResonanceHints: [...(iarl.iarlOperatorResonanceHints || []), ...(iarl.iarlSystemResonanceHints || [])],
    iarlRecommendedAction,
    aclState: acl.aclState,
    aclCoherenceFindings: acl.aclCoherenceFindings,
    aclCoherenceWarnings: acl.aclCoherenceWarnings,
    aclCoherenceHints: [...(acl.aclOperatorCoherenceHints || []), ...(acl.aclSystemCoherenceHints || [])],
    aclRecommendedAction,
    riskSummary: {
      latency: decision.riskBadges?.latency || "low",
      oauth: decision.riskBadges?.oauth || "low",
      logs: decision.riskBadges?.logs || "ok",
      metrics: decision.riskBadges?.metrics || "ok",
      build: decision.riskBadges?.build || "ok",
      bindings: decision.riskBadges?.bindings || "ok",
      score: decision.score,
      decision: decision.decision,
      triggerCount: decision.summary?.triggerCount ?? 0,
    },
    advisoryOnly: governance.cloudflareSafetyRules?.blockOnMcpOffline !== true,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareGovernanceSignals(governance = {}) {
  const observability = await getCloudflareObservabilityChecks();
  const reachability = await getCloudflareApiReachability();
  const actionsHealth = await getCloudflareActionsHealth();
  const federation = await getCloudflareFederationReadiness();
  const autonomousSignals = await getCloudflareAutonomousGovernanceSignals(governance);
  return {
    observabilityHealth: observability.health,
    docsHealth: observability.docsHealth,
    reachabilityHealth: reachability.health,
    actionsHealth: actionsHealth.health,
    federationScore: federation.readinessScore ?? 0,
    oauthStatus: Object.fromEntries((reachability.servers || []).map((server) => [server.id, server.oauthStatus])),
    latencyMs: observability.latencyMs,
    serverStatus: observability.serverStatus,
    offlineServers: (reachability.servers || []).filter((server) => server.status === "offline").map((server) => server.id),
    requiresOAuthServers: (reachability.servers || []).filter((server) => server.status === "requires_oauth").map((server) => server.id),
    autonomousSignals,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareGovernanceHealth(governance = {}) {
  const signals = await getCloudflareGovernanceSignals(governance);
  const health = signals.offlineServers.length
    ? "degraded"
    : signals.requiresOAuthServers.length
      ? "requires_oauth"
      : "online";
  const blockOnOffline = governance.cloudflareSafetyRules?.blockOnMcpOffline === true;
  return {
    health,
    signals,
    actionsHealth: signals.actionsHealth,
    autonomousSignals: signals.autonomousSignals,
    advisoryOnly: !blockOnOffline,
    checkedAt: new Date().toISOString(),
  };
}

export function getCloudflareMcpMetadata() {
  return {
    enabled: true,
    optional: true,
    configPath: ".cursor/mcp.json",
    surfaces: FEDERATION_SURFACES,
    servers: Object.values(CLOUDFLARE_MCP_SERVERS).map((server) => ({
      id: server.id,
      label: server.label,
      url: server.url,
      auth: server.auth,
      description: server.description,
    })),
    skills: CLOUDFLARE_SKILLS,
    routes: {
      status: "/api/os/cloudflare",
      docs: "/api/os/cloudflare/docs",
      federation: "/api/os/federation/cloudflare",
      releases: "/api/os/releases/cloudflare",
      logsFetch: "/api/os/cloudflare/logs/fetch",
      metricsFetch: "/api/os/cloudflare/metrics/fetch",
      buildRun: "/api/os/cloudflare/build/run",
      bindingsValidate: "/api/os/cloudflare/bindings/validate",
      docsQuery: "/api/os/cloudflare/docs/query",
      quickActions: "/api/os/cloudflare/quick-actions",
      autonomous: "/api/os/cloudflare/autonomous",
      automation: "/api/os/cloudflare/automation",
      events: "/api/os/cloudflare/events",
      insights: "/api/os/cloudflare/insights",
      decision: "/api/os/cloudflare/decision",
      certification: "/api/marketplace/certification",
      sync: "/api/os/cloudflare/sync",
      crossDivision: "/api/os/cloudflare/cross-division",
      orchestration: CLOUDFLARE_ORCHESTRATION.routes.orchestration,
      agents: CLOUDFLARE_ORCHESTRATION.routes.agents,
      execution: CLOUDFLARE_EXECUTION.routes.execution,
      executionSignals: CLOUDFLARE_EXECUTION.routes.signals,
      adaptive: CLOUDFLARE_ADAPTIVE.route,
      predictive: CLOUDFLARE_PREDICTIVE.route,
      strategic: CLOUDFLARE_STRATEGIC.route,
      ucip: CLOUDFLARE_UCIP.route,
      amg: CLOUDFLARE_AMG.route,
      cba: CLOUDFLARE_CBA.route,
      cal: CLOUDFLARE_CAL.route,
      ihl: CLOUDFLARE_IHL.route,
      iarl: CLOUDFLARE_IARL.route,
      acl: CLOUDFLARE_ACL.route,
    },
    actions: CLOUDFLARE_FEDERATION_ACTIONS,
    topics: DOCS_TOPIC_CATEGORIES,
    quickActions: getDocsQuickActions(),
  };
}

export async function getCloudflareFederationReadiness() {
  const reachability = await getCloudflareApiReachability();
  const observability = await getCloudflareObservabilityChecks();
  const actionHealth = await getCloudflareActionHealthSummary();
  const surfaces = Object.values(FEDERATION_SURFACES).map((surface) => ({
    ...surface,
    cloudflareReady: reachability.health !== "offline",
    observabilityHealth: observability.health,
  }));
  const readinessScore = Math.round(
    ((reachability.summary?.online || 0) + (reachability.summary?.requiresOAuth || 0) * 0.5) /
      Math.max(reachability.summary?.total || 1, 1) *
      100,
  );
  const actionSummary = actionHealth.actionsHealth?.summary || {};
  return {
    readiness: readinessScore >= 80 ? "ready" : readinessScore >= 50 ? "partial" : "degraded",
    readinessScore,
    surfaces,
    mcp: reachability,
    observability,
    actionHealth,
    actionsSummary: actionSummary,
    skills: CLOUDFLARE_SKILLS,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareFederationSnapshot() {
  const readiness = await getCloudflareFederationReadiness();
  return {
    federation: "cloudflare-mcp",
    optional: true,
    metadata: getCloudflareMcpMetadata(),
    readiness,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareVersionHealth(governance = {}, env = {}) {
  return runAdvisoryGuarded(
    () => computeCloudflareVersionHealthCore(governance, env),
    "version",
    { timeoutMs: ADVISORY_VERSION_TIMEOUT_MS, cacheTtlMs: ADVISORY_VERSION_CACHE_TTL_MS },
  );
}

async function computeCloudflareVersionHealthCore(governance = {}, env = {}) {
  const [probes, federationHeartbeat, autonomous, insights, automation, certification, crossDivision, orchestration, execution] = await Promise.all([
    probeAllMcpServers(),
    getCloudflareFederationHeartbeat(),
    getCloudflareAutonomousSnapshot(governance),
    getCloudflareInsights(governance),
    getCloudflareAutomationLoops(governance),
    getMarketplaceCloudflareCertification(governance),
    getCloudflareCrossDivisionFederation(governance, env),
    getCloudflareOrchestration(governance, env),
    getCloudflareExecution(governance, env),
  ]);
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  const expandedScore = getExpandedFederationScore(
    federationHeartbeat.cloudflareFederationScore,
    autonomous.cloudflareSafety?.autonomousScore,
    insights.cloudflareInsightsScore,
    triggers,
  );
  const decision = await getCloudflareDecision(governance);
  const adaptiveRuntime = buildCloudflareAdaptiveFromSignals({
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
    reachability: { servers: probes.servers, health: probes.summary.offline ? "offline" : "online" },
  });
  const predictiveRuntime = buildCloudflarePredictiveFromSignals({
    adaptive: adaptiveRuntime,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
    reachability: { servers: probes.servers, health: probes.summary.offline ? "offline" : "online" },
  });
  const strategicRuntime = buildCloudflareStrategicFromSignals({
    predictive: predictiveRuntime,
    adaptive: adaptiveRuntime,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
  });
  const ucipRuntime = buildCloudflareUcipFromSignals({
    automation,
    autonomous,
    decision,
    certification,
    crossDivision,
    orchestration,
    execution,
    adaptive: adaptiveRuntime,
    predictive: predictiveRuntime,
    strategic: strategicRuntime,
    insights,
  });
  const amgRuntime = buildCloudflareAmgFromUcip(ucipRuntime);
  const versionAlignmentContext = await buildCalAlignmentContextFromEnv(governance, env, {});
  const cbaRuntime = buildCloudflareCbaFromAmg(amgRuntime, ucipRuntime, versionAlignmentContext);
  const calRuntime = buildCloudflareCalFromCba(cbaRuntime, amgRuntime, ucipRuntime, versionAlignmentContext);
  const ihlRuntime = buildCloudflareIhlFromCal(calRuntime, cbaRuntime, amgRuntime, ucipRuntime, versionAlignmentContext);
  const iarlRuntime = buildCloudflareIarlFromIhl(ihlRuntime, calRuntime, cbaRuntime, amgRuntime, ucipRuntime, versionAlignmentContext);
  const aclRuntime = buildCloudflareAclFromIarl(iarlRuntime, ihlRuntime, calRuntime, cbaRuntime, amgRuntime, ucipRuntime, versionAlignmentContext);
  return {
    health: probes.summary.offline ? "degraded" : probes.summary.requiresOAuth ? "requires_oauth" : "online",
    cloudflareFederationHealth: expandedScore >= 80
      ? "ready"
      : expandedScore >= 50
        ? "partial"
        : "degraded",
    cloudflareAutonomousHealth: deriveAutonomousHealth(autonomous),
    cloudflareInsightsHealth: insights.health,
    cloudflareDecisionHealth: deriveDecisionHealth(decision),
    cloudflareAutomationHealth: deriveAutomationHealth(automation),
    cloudflareCertificationHealth: deriveCertificationHealth(certification),
    cloudflareAutonomousScore: autonomous.cloudflareSafety?.autonomousScore ?? null,
    cloudflareInsightsScore: insights.cloudflareInsightsScore,
    cloudflareDecisionScore: decision.score,
    cloudflareCertificationScore: certification.aggregate?.score ?? null,
    cloudflareCrossDivisionHealth: crossDivision.cloudflareCrossDivisionHealth,
    cloudflareCrossDivisionScore: crossDivision.cloudflareCrossDivisionScore,
    cloudflareCrossDivisionSyncStatus: crossDivision.syncStatus,
    cloudflareOrchestrationHealth: orchestration.orchestrationHealth,
    cloudflareOrchestrationScore: orchestration.orchestrationScore,
    cloudflareExecutionHealth: execution.executionHealth,
    cloudflareExecutionScore: execution.executionScore,
    cloudflareAdaptiveHealth: adaptiveRuntime.adaptiveHealth,
    cloudflareAdaptiveScore: adaptiveRuntime.adaptiveScore,
    cloudflareAdaptiveMode: adaptiveRuntime.adaptiveState?.mode,
    cloudflarePredictiveHealth: predictiveRuntime.predictiveHealth,
    cloudflarePredictiveScore: predictiveRuntime.predictiveScore,
    cloudflarePredictiveMode: predictiveRuntime.predictiveState?.forecastMode,
    cloudflareStrategicHealth: strategicRuntime.strategicHealth,
    cloudflareStrategicScore: strategicRuntime.strategicScore,
    cloudflareStrategicHorizon: strategicRuntime.strategicState?.horizon,
    cloudflareUCIPHealth: ucipRuntime.ucipHealth,
    cloudflareUCIPScore: ucipRuntime.ucipScore,
    cloudflareUCIPMode: ucipRuntime.ucipState?.mode,
    cloudflareAMGHealth: amgRuntime.amgHealth,
    cloudflareAMGScore: amgRuntime.amgScore,
    cloudflareAMGMode: amgRuntime.amgState?.mode,
    cloudflareCBAHealth: cbaRuntime.cbaHealth,
    cloudflareCBAScore: cbaRuntime.cbaScore,
    cloudflareCBAMode: cbaRuntime.cbaState?.mode,
    cloudflareCALHealth: calRuntime.calHealth,
    cloudflareCALScore: calRuntime.calScore,
    cloudflareCALMode: calRuntime.calState?.mode,
    cloudflareIHLHealth: ihlRuntime.ihlHealth,
    cloudflareIHLScore: ihlRuntime.ihlScore,
    cloudflareIHLMode: ihlRuntime.ihlState?.mode,
    cloudflareIARLHealth: iarlRuntime.iarlHealth,
    cloudflareIARLScore: iarlRuntime.iarlScore,
    cloudflareIARLMode: iarlRuntime.iarlState?.mode,
    cloudflareACLHealth: aclRuntime.aclHealth,
    cloudflareACLScore: aclRuntime.aclScore,
    cloudflareACLMode: aclRuntime.aclState?.mode,
    servers: probes.servers.map((server) => ({
      id: server.id,
      status: server.status,
      latencyMs: server.latencyMs,
      oauthStatus: server.oauthStatus,
    })),
    summary: probes.summary,
    federation: {
      ...federationHeartbeat,
      expandedScore,
    },
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareIntegrationSnapshot(governance = {}) {
  const [observability, builds, bindings, reachability, federation, governanceHealth, autonomous, insights] = await Promise.all([
    getCloudflareHeartbeatDeep(),
    getCloudflareBuildPreview(),
    getCloudflareBindingsInspection(),
    getCloudflareApiReachability(),
    getCloudflareFederationSnapshot(),
    getCloudflareGovernanceHealth(governance),
    getCloudflareAutonomousSnapshot(governance),
    getCloudflareInsights(governance),
  ]);

  return {
    metadata: getCloudflareMcpMetadata(),
    observability,
    builds,
    bindings,
    reachability,
    federation,
    governance: governanceHealth,
    cloudflareGovernance: autonomous.cloudflareGovernance,
    cloudflareSafety: autonomous.cloudflareSafety,
    cloudflareEvents: autonomous.cloudflareEvents,
    cloudflareInsights: insights.cloudflareInsights,
    cloudflareInsightsScore: insights.cloudflareInsightsScore,
    checkedAt: new Date().toISOString(),
  };
}

function compactDivisionSnapshot(snapshot = {}) {
  return {
    decision: snapshot.decision ?? "optional",
    certification: snapshot.certification ?? { status: "review", score: 50 },
    automation: snapshot.automation ?? { activeCount: 0, loops: {} },
    insights: snapshot.insights ?? { score: 50, health: "optional" },
    autonomous: snapshot.autonomous ?? { triggers: [], advisoryCount: 0 },
    score: snapshot.score ?? 0,
  };
}

export async function buildOperatorShellDivisionSnapshot(governance = {}, moduleIds = null) {
  const [decision, certification, automation, insights, federation, autonomous, reachability] = await Promise.all([
    getCloudflareDecision(governance),
    getMarketplaceCloudflareCertification(governance, moduleIds),
    getCloudflareAutomationLoops(governance),
    getCloudflareInsights(governance),
    getCloudflareFederationReadiness(),
    getCloudflareAutonomousGovernanceSignals(governance),
    getCloudflareApiReachability(),
  ]);
  const autonomousSafety = computeCloudflareAutonomousSafety(reachability, autonomous, governance);
  const score = getExpandedFederationScore(
    federation.readinessScore,
    autonomousSafety.autonomousScore,
    insights.cloudflareInsightsScore,
    autonomous.triggers || [],
  );
  return {
    division: CROSS_DIVISION_SYNC.operatorShell.division,
    repo: CROSS_DIVISION_SYNC.operatorShell.repo,
    decision: decision.decision,
    certification: certification.aggregate || { status: "review", score: 50 },
    automation: {
      activeCount: automation.activeCount ?? 0,
      loops: automation.loops || {},
    },
    insights: {
      score: insights.cloudflareInsightsScore,
      health: insights.health,
    },
    autonomous: {
      triggers: autonomous.triggers || [],
      advisoryCount: (autonomous.advisories || []).length,
      signals: autonomous.signals || {},
    },
    score,
    advisoryOnly: true,
    source: "live",
    checkedAt: new Date().toISOString(),
  };
}

export function buildAdvisoryMarketplaceBackendSnapshot(operatorSnapshot = null) {
  const operator = compactDivisionSnapshot(operatorSnapshot || {});
  const oauthMissing = true;
  return {
    division: CROSS_DIVISION_SYNC.marketplaceBackend.division,
    repo: CROSS_DIVISION_SYNC.marketplaceBackend.repo,
    decision: operator.decision === "hold" ? "caution" : operator.decision,
    certification: {
      status: operator.certification?.status || "review",
      score: Math.max(0, (operator.certification?.score ?? 50) - (oauthMissing ? 6 : 0)),
      reasons: ["Advisory manifest snapshot; live marketplace backend unavailable or OAuth pending."],
    },
    automation: {
      activeCount: Math.max(0, (operator.automation?.activeCount ?? 0) - (oauthMissing ? 1 : 0)),
      loops: operator.automation?.loops || {},
    },
    insights: {
      score: Math.max(0, (operator.insights?.score ?? 50) - (oauthMissing ? 4 : 0)),
      health: operator.insights?.health || "optional",
    },
    autonomous: {
      triggers: (operator.autonomous?.triggers || []).slice(0, 2),
      advisoryCount: operator.autonomous?.advisoryCount ?? 0,
    },
    score: Math.max(0, (operator.score ?? 50) - (oauthMissing ? 5 : 0)),
    advisoryOnly: true,
    source: "advisory-manifest",
    checkedAt: new Date().toISOString(),
  };
}

async function fetchMarketplaceBackendDivisionSnapshot(env = {}, operatorSnapshot = null) {
  const syncConfig = CROSS_DIVISION_SYNC.marketplaceBackend;
  const candidates = [
    env.MARKETPLACE_TRACKING_URL,
    env.MARKETPLACE_BACKEND_URL,
    env.UPSTREAM_ENGINE_URL ? `${String(env.UPSTREAM_ENGINE_URL).replace(/\/$/, "")}${syncConfig.syncRoute}` : null,
    `http://127.0.0.1:${syncConfig.defaultPort}${syncConfig.syncRoute}`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const url = candidate.includes("/api/")
      ? candidate
      : `${String(candidate).replace(/\/$/, "")}${syncConfig.syncRoute}`;
    try {
      const response = await withTimeout(fetch(url, { headers: { Accept: "application/json" } }), CROSS_DIVISION_FETCH_TIMEOUT_MS);
      if (!response.ok) {
        continue;
      }
      const payload = await response.json();
      const snapshot = payload.marketplaceBackend
        ? {
            ...payload.marketplaceBackend,
            certifications: payload.certifications,
            modules: payload.modules,
          }
        : payload.snapshot || payload;
      if (snapshot && (snapshot.decision || snapshot.score != null)) {
        return {
          ...snapshot,
          division: syncConfig.division,
          repo: syncConfig.repo,
          source: "live",
          advisoryOnly: true,
          checkedAt: snapshot.checkedAt || new Date().toISOString(),
        };
      }
    } catch {
      // Graceful degradation to advisory manifest.
    }
  }

  return buildAdvisoryMarketplaceBackendSnapshot(operatorSnapshot);
}

function valuesWithinTolerance(left, right, tolerance = CROSS_DIVISION_SYNC.scoreTolerance) {
  if (left == null || right == null) {
    return false;
  }
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right) <= tolerance;
  }
  return String(left) === String(right);
}

export function compareCrossDivisionSnapshots(operatorSnapshot = {}, marketplaceSnapshot = {}) {
  const operator = compactDivisionSnapshot(operatorSnapshot);
  const marketplace = compactDivisionSnapshot(marketplaceSnapshot);
  const reasons = [];
  let matchPoints = 0;
  let totalPoints = 0;

  const compareValue = (label, left, right, weight = 1) => {
    totalPoints += weight;
    if (valuesWithinTolerance(left, right)) {
      matchPoints += weight;
      return;
    }
    if (typeof left === "number" && typeof right === "number") {
      const delta = Math.abs(left - right);
      if (delta <= CROSS_DIVISION_SYNC.scoreTolerance * 2) {
        matchPoints += weight * 0.6;
        reasons.push(`${label} within advisory tolerance (${left} vs ${right}).`);
        return;
      }
    }
    reasons.push(`${label} divergent: operator-shell ${left} vs marketplace-backend ${right}.`);
  };

  compareValue("decision", operator.decision, marketplace.decision, 2);
  compareValue("certification.status", operator.certification?.status, marketplace.certification?.status, 2);
  compareValue("certification.score", operator.certification?.score, marketplace.certification?.score, 1.5);
  compareValue("automation.activeCount", operator.automation?.activeCount, marketplace.automation?.activeCount, 1);
  compareValue("insights.score", operator.insights?.score, marketplace.insights?.score, 1.5);
  compareValue("autonomous.triggers", (operator.autonomous?.triggers || []).length, (marketplace.autonomous?.triggers || []).length, 1);
  compareValue("federation.score", operator.score, marketplace.score, 2);

  const alignmentRatio = totalPoints ? matchPoints / totalPoints : 1;
  let syncStatus = "divergent";
  if (alignmentRatio >= CROSS_DIVISION_SYNC.alignmentThresholds.aligned) {
    syncStatus = "aligned";
  } else if (alignmentRatio >= CROSS_DIVISION_SYNC.alignmentThresholds.partial) {
    syncStatus = "partial";
  }

  const crossDivisionScore = Math.max(0, Math.min(100, Math.round(alignmentRatio * 100)));
  if (marketplaceSnapshot.source === "advisory-manifest") {
    reasons.unshift("Marketplace backend live sync unavailable; comparing against advisory manifest snapshot.");
  }
  if (operatorSnapshot.source === "live" && marketplaceSnapshot.source === "advisory-manifest") {
    syncStatus = syncStatus === "aligned" ? "partial" : syncStatus;
  }

  return {
    syncStatus,
    crossDivisionScore,
    crossDivisionHealth: deriveCrossDivisionHealth(crossDivisionScore, syncStatus),
    crossDivisionReasons: [...new Set(reasons)].slice(0, 12),
    alignmentRatio,
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export function deriveCrossDivisionHealth(score = 100, syncStatus = "aligned") {
  if (syncStatus === "aligned" && score >= 85) {
    return "healthy";
  }
  if (syncStatus === "partial" || score >= 50) {
    return "advisory";
  }
  return "degraded";
}

export function computeModuleCrossDivisionSync(moduleId, operatorCert = {}, marketplaceCert = {}, aggregateSync = {}) {
  const operatorScore = operatorCert.score ?? 50;
  const marketplaceScore = marketplaceCert.score ?? 50;
  const delta = Math.abs(operatorScore - marketplaceScore);
  let cloudflareSyncStatus = aggregateSync.syncStatus || "partial";
  if (delta > 20) {
    cloudflareSyncStatus = "divergent";
  } else if (delta > CROSS_DIVISION_SYNC.scoreTolerance && cloudflareSyncStatus === "aligned") {
    cloudflareSyncStatus = "partial";
  }
  const cloudflareSyncScore = Math.max(0, Math.min(100, Math.round((aggregateSync.crossDivisionScore ?? 70) - delta)));
  const cloudflareSyncReasons = [
    `Module ${moduleId} certification delta ${delta} (${operatorScore} vs ${marketplaceScore}).`,
    ...(aggregateSync.crossDivisionReasons || []).slice(0, 2),
  ];
  return {
    cloudflareSyncStatus,
    cloudflareSyncScore,
    cloudflareSyncReasons,
    advisoryOnly: true,
  };
}

export function getOperatorMarketplaceCrossDivisionFields(crossDivisionSync = {}) {
  const marketplace = crossDivisionSync.marketplaceBackend || crossDivisionSync.marketplaceSnapshot || {};
  return {
    cloudflareMarketplaceDecision: marketplace.decision || "optional",
    cloudflareMarketplaceCertification: marketplace.certification || { status: "review", score: null },
    cloudflareMarketplaceAutomation: marketplace.automation || { activeCount: 0 },
    cloudflareMarketplaceInsights: marketplace.insights || { score: null, health: "optional" },
    cloudflareMarketplaceScore: marketplace.score ?? null,
    cloudflareCrossDivisionSyncStatus: crossDivisionSync.syncStatus || "partial",
    advisoryOnly: true,
  };
}

export function buildCloudflareSafetyCrossDivisionFactor(crossDivisionSnapshot = {}) {
  return {
    health: crossDivisionSnapshot.crossDivisionHealth || deriveCrossDivisionHealth(crossDivisionSnapshot.crossDivisionScore, crossDivisionSnapshot.syncStatus),
    score: crossDivisionSnapshot.crossDivisionScore ?? null,
    syncStatus: crossDivisionSnapshot.syncStatus || "partial",
    reasons: crossDivisionSnapshot.crossDivisionReasons || [],
    advisoryOnly: true,
    checkedAt: crossDivisionSnapshot.checkedAt || new Date().toISOString(),
  };
}

export async function getCloudflareCrossDivisionSync(governance = {}, env = {}, options = {}) {
  try {
    const moduleIds = options.moduleIds || null;
    const operatorShell = await buildOperatorShellDivisionSnapshot(governance, moduleIds);
    const marketplaceBackend = await fetchMarketplaceBackendDivisionSnapshot(env, operatorShell);
    const comparison = compareCrossDivisionSnapshots(operatorShell, marketplaceBackend);
    return {
      operatorShell: compactDivisionSnapshot(operatorShell),
      marketplaceBackend: compactDivisionSnapshot(marketplaceBackend),
      syncStatus: comparison.syncStatus,
      crossDivisionScore: comparison.crossDivisionScore,
      crossDivisionHealth: comparison.crossDivisionHealth,
      crossDivisionReasons: comparison.crossDivisionReasons,
      sources: {
        operatorShell: operatorShell.source,
        marketplaceBackend: marketplaceBackend.source,
      },
      advisoryOnly: true,
      checkedAt: comparison.checkedAt,
    };
  } catch (error) {
    const operatorShell = compactDivisionSnapshot({});
    const marketplaceBackend = compactDivisionSnapshot(buildAdvisoryMarketplaceBackendSnapshot());
    return {
      operatorShell,
      marketplaceBackend,
      syncStatus: "partial",
      crossDivisionScore: 50,
      crossDivisionHealth: "advisory",
      crossDivisionReasons: [error.message || "Cross-division sync unavailable."],
      advisoryOnly: true,
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function getCloudflareCrossDivisionFederation(governance = {}, env = {}, options = {}) {
  const sync = await getCloudflareCrossDivisionSync(governance, env, options);
  return {
    cloudflareCrossDivisionScore: sync.crossDivisionScore,
    cloudflareCrossDivisionHealth: sync.crossDivisionHealth,
    cloudflareCrossDivisionReasons: sync.crossDivisionReasons,
    syncStatus: sync.syncStatus,
    operatorShell: sync.operatorShell,
    marketplaceBackend: sync.marketplaceBackend,
    sources: sync.sources,
    routes: {
      sync: CROSS_DIVISION_SYNC.operatorShell.syncRoute,
      crossDivision: CROSS_DIVISION_SYNC.operatorShell.crossDivisionRoute,
      marketplaceSync: CROSS_DIVISION_SYNC.marketplaceBackend.syncRoute,
    },
    advisoryOnly: true,
    checkedAt: sync.checkedAt,
  };
}

async function collectOrchestrationContext(governance = {}, env = {}, options = {}) {
  const moduleIds = options.moduleIds || null;
  const [crossDivision, automation, certification, decision, insights, autonomous] = await Promise.all([
    getCloudflareCrossDivisionSync(governance, env, { moduleIds }),
    getCloudflareAutomationLoops(governance),
    getMarketplaceCloudflareCertification(governance, moduleIds),
    getCloudflareDecision(governance, options),
    getCloudflareInsights(governance),
    getCloudflareAutonomousSnapshot(governance),
  ]);
  return {
    crossDivision,
    automation,
    certification,
    decision,
    insights,
    autonomous,
    moduleIds,
  };
}

export function buildCloudflareAgentSignals(context = {}) {
  const {
    crossDivision = {},
    automation = {},
    certification = {},
    decision = {},
    insights = {},
    autonomous = {},
  } = context;
  const operatorShell = crossDivision.operatorShell || {};
  const marketplaceBackend = crossDivision.marketplaceBackend || {};
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  return {
    operatorShell: {
      division: CROSS_DIVISION_SYNC.operatorShell.division,
      agent: CLOUDFLARE_ORCHESTRATION.agents.operatorShell,
      decision: operatorShell.decision || decision.decision || "optional",
      certification: operatorShell.certification || certification.aggregate || { status: "review", score: 50 },
      automation: operatorShell.automation || { activeCount: automation.activeCount ?? 0 },
      insights: operatorShell.insights || { score: insights.cloudflareInsightsScore, health: insights.health },
      autonomous: {
        triggers,
        advisoryCount: (autonomous.cloudflareGovernance?.autonomousSignals?.advisories || []).length,
      },
      score: operatorShell.score ?? decision.score ?? 50,
      health: deriveDecisionHealth(decision),
      advisoryOnly: true,
    },
    marketplaceBackend: {
      division: CROSS_DIVISION_SYNC.marketplaceBackend.division,
      agent: CLOUDFLARE_ORCHESTRATION.agents.marketplaceBackend,
      decision: marketplaceBackend.decision || "optional",
      certification: marketplaceBackend.certification || { status: "review", score: 50 },
      automation: marketplaceBackend.automation || { activeCount: 0 },
      insights: marketplaceBackend.insights || { score: null, health: "optional" },
      autonomous: marketplaceBackend.autonomous || { triggers: [], advisoryCount: 0 },
      score: marketplaceBackend.score ?? null,
      source: crossDivision.sources?.marketplaceBackend || "advisory-manifest",
      advisoryOnly: true,
    },
    crossDivision: {
      agent: CLOUDFLARE_ORCHESTRATION.agents.crossDivision,
      syncStatus: crossDivision.syncStatus || "partial",
      score: crossDivision.crossDivisionScore ?? null,
      health: crossDivision.crossDivisionHealth || "optional",
      reasons: crossDivision.crossDivisionReasons || [],
      advisoryOnly: true,
    },
  };
}

function buildOrchestrationPlanStep(id, order, agent, division, action, reason, priority = "medium") {
  return {
    id,
    order,
    agent,
    division,
    action,
    reason,
    priority,
    advisoryOnly: true,
  };
}

export function buildCloudflareOrchestrationPlan(context = {}) {
  const {
    crossDivision = {},
    automation = {},
    certification = {},
    decision = {},
    insights = {},
    autonomous = {},
  } = context;
  const plan = [];
  let order = 1;
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  const activeLoops = Object.entries(automation.loops || {})
    .filter(([, loop]) => loop.active)
    .map(([id]) => id);

  if (crossDivision.syncStatus === "divergent") {
    plan.push(
      buildOrchestrationPlanStep(
        "cross-division-reconcile",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.crossDivision,
        "cross-division",
        "Reconcile operator-shell and marketplace-backend Cloudflare federation metadata.",
        (crossDivision.crossDivisionReasons || [])[0] || "Cross-division sync divergent.",
        "high",
      ),
    );
  } else if (crossDivision.syncStatus === "partial") {
    plan.push(
      buildOrchestrationPlanStep(
        "cross-division-review",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.marketplaceBackend,
        CROSS_DIVISION_SYNC.marketplaceBackend.division,
        "Review partial cross-division sync advisories before promotion.",
        (crossDivision.crossDivisionReasons || [])[0] || "Cross-division sync partial.",
        "medium",
      ),
    );
  }

  if (decision.decision === "hold") {
    plan.push(
      buildOrchestrationPlanStep(
        "decision-hold-review",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.operatorShell,
        CROSS_DIVISION_SYNC.operatorShell.division,
        "Pause high-impact pipeline actions until Cloudflare decisioning moves off hold.",
        (decision.reasons || [])[0] || "Decision hold active.",
        "high",
      ),
    );
  } else if (decision.decision === "caution") {
    plan.push(
      buildOrchestrationPlanStep(
        "decision-caution-review",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.operatorShell,
        CROSS_DIVISION_SYNC.operatorShell.division,
        "Review Cloudflare cautions before operator pipeline execution.",
        (decision.reasons || [])[0] || "Decision caution active.",
        "medium",
      ),
    );
  }

  if (certification.aggregate?.status === "incompatible") {
    plan.push(
      buildOrchestrationPlanStep(
        "certification-remediation",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.marketplaceBackend,
        CROSS_DIVISION_SYNC.marketplaceBackend.division,
        "Remediate incompatible marketplace module certification before sync.",
        (certification.aggregate.reasons || [])[0] || "Certification incompatible.",
        "high",
      ),
    );
  } else if (certification.aggregate?.status === "review") {
    plan.push(
      buildOrchestrationPlanStep(
        "certification-review",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.marketplaceBackend,
        CROSS_DIVISION_SYNC.marketplaceBackend.division,
        "Review marketplace certification scores and module compatibility.",
        `Aggregate certification score ${certification.aggregate.score ?? "n/a"}.`,
        "medium",
      ),
    );
  }

  if (activeLoops.length) {
    plan.push(
      buildOrchestrationPlanStep(
        "automation-loop-review",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.operatorShell,
        CROSS_DIVISION_SYNC.operatorShell.division,
        `Review active automation loops: ${activeLoops.join(", ")}.`,
        automation.loops?.[activeLoops[0]]?.recommendedAction || "Automation loops active.",
        activeLoops.length > 2 ? "high" : "medium",
      ),
    );
  }

  if (triggers.length) {
    plan.push(
      buildOrchestrationPlanStep(
        "autonomous-trigger-review",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.crossDivision,
        "cross-division",
        `Review autonomous triggers: ${triggers.join(", ")}.`,
        (autonomous.cloudflareSafety?.autonomousWarnings || [])[0] || "Autonomous advisories active.",
        triggers.length > 2 ? "high" : "medium",
      ),
    );
  }

  if ((insights.cloudflareInsightsScore ?? 100) < 70) {
    plan.push(
      buildOrchestrationPlanStep(
        "insights-improvement",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.operatorShell,
        CROSS_DIVISION_SYNC.operatorShell.division,
        "Apply Cloudflare insights recommendations to improve federation readiness.",
        (insights.cloudflareInsights?.recommendations || [])[0]?.message || "Insights score below threshold.",
        "low",
      ),
    );
  }

  if (!plan.length) {
    plan.push(
      buildOrchestrationPlanStep(
        "steady-state",
        order++,
        CLOUDFLARE_ORCHESTRATION.agents.pipeline,
        CROSS_DIVISION_SYNC.operatorShell.division,
        "Continue advisory multi-agent orchestration; no blocking Cloudflare advisories.",
        "Federation signals within advisory tolerance.",
        "low",
      ),
    );
  }

  return plan.sort((a, b) => a.order - b.order);
}

export function computeOrchestrationScore(context = {}, plan = []) {
  const {
    crossDivision = {},
    certification = {},
    decision = {},
    insights = {},
    automation = {},
    autonomous = {},
  } = context;
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  const activeLoopCount =
    automation.activeCount ?? Object.values(automation.loops || {}).filter((loop) => loop.active).length;
  const components = [
    decision.score ?? 50,
    certification.aggregate?.score ?? 50,
    insights.cloudflareInsightsScore ?? 50,
    crossDivision.crossDivisionScore ?? 50,
  ];
  const base = components.reduce((sum, value) => sum + value, 0) / components.length;
  let penalty = triggers.length * 4 + activeLoopCount * 3;
  if (crossDivision.syncStatus === "divergent") {
    penalty += 15;
  } else if (crossDivision.syncStatus === "partial") {
    penalty += 8;
  }
  if (decision.decision === "hold") {
    penalty += 12;
  } else if (decision.decision === "caution") {
    penalty += 6;
  }
  if (certification.aggregate?.status === "incompatible") {
    penalty += 10;
  }
  const highPrioritySteps = plan.filter((step) => step.priority === "high").length;
  penalty += highPrioritySteps * 2;
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}

export function deriveOrchestrationHealth(score = 100, plan = []) {
  const highPriority = plan.filter((step) => step.priority === "high").length;
  if (score >= 80 && highPriority === 0) {
    return "healthy";
  }
  if (score >= 50 || highPriority <= 2) {
    return "advisory";
  }
  return "degraded";
}

export function buildOrchestrationRecommendedActions(context = {}, plan = []) {
  const actions = plan.map((step) => `${step.agent}: ${step.action}`);
  if (context.crossDivision?.syncStatus === "divergent") {
    actions.unshift("Cross-division sync divergent; coordinate marketplace-sync with operator-sentinel.");
  }
  if ((context.autonomous?.cloudflareGovernance?.autonomousSignals?.triggers || []).length) {
    actions.push("Review autonomous trigger advisories before multi-agent handoff.");
  }
  return [...new Set(actions)].slice(0, 12);
}

export async function getCloudflareOrchestration(governance = {}, env = {}, options = {}) {
  try {
    const context = await collectOrchestrationContext(governance, env, options);
    const plan = buildCloudflareOrchestrationPlan(context);
    const agents = buildCloudflareAgentSignals(context);
    const orchestrationScore = computeOrchestrationScore(context, plan);
    const recommendedActions = buildOrchestrationRecommendedActions(context, plan);
    const orchestrationHealth = deriveOrchestrationHealth(orchestrationScore, plan);
    const reasons = [
      ...(context.crossDivision.crossDivisionReasons || []).slice(0, 3),
      ...(context.decision.reasons || []).slice(0, 2),
      ...(context.certification.aggregate?.reasons || []).slice(0, 2),
    ];
    return {
      plan,
      agents,
      recommendedActions,
      orchestrationScore,
      orchestrationHealth,
      orchestrationReasons: [...new Set(reasons)].slice(0, 12),
      cloudflareAgentSignals: agents,
      syncStatus: context.crossDivision.syncStatus,
      certification: context.certification?.aggregate,
      advisoryOnly: true,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      plan: [
        buildOrchestrationPlanStep(
          "orchestration-unavailable",
          1,
          CLOUDFLARE_ORCHESTRATION.agents.operatorShell,
          CROSS_DIVISION_SYNC.operatorShell.division,
          "Cloudflare orchestration unavailable; continue with advisory defaults.",
          error.message || "OAuth or upstream unavailable.",
          "low",
        ),
      ],
      agents: {
        operatorShell: { health: "optional", advisoryOnly: true },
        marketplaceBackend: { health: "optional", advisoryOnly: true },
        crossDivision: { syncStatus: "partial", advisoryOnly: true },
      },
      cloudflareAgentSignals: {
        operatorShell: { health: "optional", advisoryOnly: true },
        marketplaceBackend: { health: "optional", advisoryOnly: true },
        crossDivision: { syncStatus: "partial", advisoryOnly: true },
      },
      recommendedActions: [error.message || "Orchestration degraded gracefully."],
      orchestrationScore: 50,
      orchestrationHealth: "advisory",
      orchestrationReasons: [error.message || "Orchestration unavailable without OAuth."],
      syncStatus: "partial",
      advisoryOnly: true,
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function getCloudflareAgentSignals(governance = {}, env = {}, options = {}) {
  const orchestration = await getCloudflareOrchestration(governance, env, options);
  return {
    cloudflareAgentSignals: orchestration.cloudflareAgentSignals || orchestration.agents,
    agents: orchestration.agents,
    orchestrationScore: orchestration.orchestrationScore,
    syncStatus: orchestration.syncStatus,
    advisoryOnly: true,
    checkedAt: orchestration.checkedAt,
  };
}

export function getCloudflarePipelineOrchestrationFields(orchestration = {}) {
  return {
    cloudflarePipelineOrchestrationPlan: orchestration.plan || [],
    cloudflarePipelineOrchestrationScore: orchestration.orchestrationScore ?? null,
    cloudflarePipelineOrchestrationReasons: orchestration.orchestrationReasons || orchestration.recommendedActions || [],
    advisoryOnly: true,
  };
}

export function computeModuleOrchestrationFields(moduleId, orchestration = {}, moduleCert = {}) {
  const certScore = moduleCert.score ?? 50;
  const baseScore = orchestration.orchestrationScore ?? 50;
  const aggregateCert = orchestration.certification?.score ?? moduleCert.score ?? 50;
  const certDelta = Math.abs(certScore - aggregateCert);
  let cloudflareOrchestrationStatus = "coordinated";
  if (certScore < 50 || orchestration.syncStatus === "divergent") {
    cloudflareOrchestrationStatus = "deferred";
  } else if (certDelta > 15 || orchestration.syncStatus === "partial" || moduleCert.status === "review") {
    cloudflareOrchestrationStatus = "review";
  }
  const cloudflareOrchestrationScore = Math.max(0, Math.min(100, Math.round(baseScore - certDelta * 0.4)));
  const cloudflareOrchestrationReasons = [
    `Module ${moduleId} orchestration ${cloudflareOrchestrationStatus} (cert ${certScore}, base ${baseScore}).`,
    ...(orchestration.orchestrationReasons || []).slice(0, 2),
  ];
  return {
    cloudflareOrchestrationStatus,
    cloudflareOrchestrationScore,
    cloudflareOrchestrationReasons,
    advisoryOnly: true,
  };
}

export function buildCloudflareSafetyOrchestrationFactor(orchestrationSnapshot = {}) {
  return {
    health: orchestrationSnapshot.orchestrationHealth || deriveOrchestrationHealth(orchestrationSnapshot.orchestrationScore, orchestrationSnapshot.plan),
    score: orchestrationSnapshot.orchestrationScore ?? null,
    planCount: (orchestrationSnapshot.plan || []).length,
    highPrioritySteps: (orchestrationSnapshot.plan || []).filter((step) => step.priority === "high").length,
    reasons: orchestrationSnapshot.orchestrationReasons || [],
    advisoryOnly: true,
    checkedAt: orchestrationSnapshot.checkedAt || new Date().toISOString(),
  };
}

async function collectExecutionContext(governance = {}, env = {}, options = {}) {
  const [orchestrationContext, orchestration] = await Promise.all([
    collectOrchestrationContext(governance, env, options),
    getCloudflareOrchestration(governance, env, options),
  ]);
  return {
    ...orchestrationContext,
    orchestration,
  };
}

function buildExecutionPlanStep(orchestrationStep = {}, order = 1) {
  return {
    id: orchestrationStep.id || `execution-step-${order}`,
    order: orchestrationStep.order ?? order,
    agent: orchestrationStep.agent || CLOUDFLARE_EXECUTION.agents.operatorShell,
    division: orchestrationStep.division || CROSS_DIVISION_SYNC.operatorShell.division,
    action: orchestrationStep.action || "Review advisory execution recommendation.",
    reason: orchestrationStep.reason || "Advisory execution step.",
    priority: orchestrationStep.priority || "medium",
    executeWhen: orchestrationStep.priority === "high" ? "before-promotion" : "advisory-review",
    advisoryOnly: true,
  };
}

export function buildCloudflareExecutionPlan(context = {}) {
  const orchestrationPlan = context.orchestration?.plan || buildCloudflareOrchestrationPlan(context);
  const executionPlan = orchestrationPlan.map((step, index) => buildExecutionPlanStep(step, index + 1));

  const { crossDivision = {}, orchestration = {} } = context;
  if (crossDivision.syncStatus === "divergent" && !executionPlan.some((step) => step.id === "cross-division-review")) {
    executionPlan.unshift(
      buildExecutionPlanStep(
        {
          id: "execution-cross-division-hold",
          agent: CLOUDFLARE_EXECUTION.agents.crossDivision,
          division: "cross-division",
          action: "Defer autonomous execution until cross-division sync reconciles.",
          reason: (crossDivision.crossDivisionReasons || [])[0] || "Cross-division sync divergent.",
          priority: "high",
        },
        0,
      ),
    );
  }

  if (orchestration.orchestrationHealth === "degraded" && !executionPlan.some((step) => step.id === "orchestration-degraded-review")) {
    executionPlan.push(
      buildExecutionPlanStep(
        {
          id: "orchestration-degraded-review",
          agent: CLOUDFLARE_EXECUTION.agents.operatorShell,
          division: CROSS_DIVISION_SYNC.operatorShell.division,
          action: "Review degraded orchestration before executing pipeline or release actions.",
          reason: `Orchestration score ${orchestration.orchestrationScore ?? "n/a"}.`,
          priority: "high",
        },
        executionPlan.length + 1,
      ),
    );
  }

  if (!executionPlan.length) {
    executionPlan.push(
      buildExecutionPlanStep(
        {
          id: "execution-steady-state",
          agent: CLOUDFLARE_EXECUTION.agents.pipeline,
          division: CROSS_DIVISION_SYNC.operatorShell.division,
          action: "Proceed with advisory operator actions; no blocking execution advisories.",
          reason: "Federation execution signals within tolerance.",
          priority: "low",
        },
        1,
      ),
    );
  }

  return executionPlan.sort((a, b) => a.order - b.order);
}

export function buildCloudflareExecutionSignals(context = {}) {
  const agentSignals = buildCloudflareAgentSignals(context);
  const orchestration = context.orchestration || {};
  const executionPlan = buildCloudflareExecutionPlan(context);
  const highPriority = executionPlan.filter((step) => step.priority === "high").length;

  return {
    operatorShell: {
      ...agentSignals.operatorShell,
      executionReadiness: highPriority === 0 ? "ready" : highPriority <= 2 ? "review" : "deferred",
      nextStep: executionPlan.find((step) => step.agent === CLOUDFLARE_EXECUTION.agents.operatorShell)?.action || null,
      orchestrationScore: orchestration.orchestrationScore ?? null,
      advisoryOnly: true,
    },
    marketplaceBackend: {
      ...agentSignals.marketplaceBackend,
      executionReadiness:
        agentSignals.marketplaceBackend?.certification?.status === "incompatible"
          ? "deferred"
          : agentSignals.marketplaceBackend?.source === "advisory-manifest"
            ? "review"
            : "ready",
      nextStep: executionPlan.find((step) => step.agent === CLOUDFLARE_EXECUTION.agents.marketplaceBackend)?.action || null,
      advisoryOnly: true,
    },
    crossDivision: {
      ...agentSignals.crossDivision,
      executionReadiness:
        context.crossDivision?.syncStatus === "aligned"
          ? "ready"
          : context.crossDivision?.syncStatus === "partial"
            ? "review"
            : "deferred",
      nextStep: executionPlan.find((step) => step.agent === CLOUDFLARE_EXECUTION.agents.crossDivision)?.action || null,
      advisoryOnly: true,
    },
  };
}

export function computeExecutionScore(context = {}, executionPlan = []) {
  const orchestrationScore = context.orchestration?.orchestrationScore ?? computeOrchestrationScore(context, context.orchestration?.plan || []);
  const highPriority = executionPlan.filter((step) => step.priority === "high").length;
  const mediumPriority = executionPlan.filter((step) => step.priority === "medium").length;
  let score = orchestrationScore;
  score -= highPriority * 5;
  score -= mediumPriority * 2;
  if (context.crossDivision?.syncStatus === "divergent") {
    score -= 10;
  }
  const triggers = context.autonomous?.cloudflareGovernance?.autonomousSignals?.triggers || [];
  score -= triggers.length * 3;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function deriveExecutionHealth(score = 100, executionPlan = []) {
  const highPriority = executionPlan.filter((step) => step.priority === "high").length;
  if (score >= 80 && highPriority === 0) {
    return "healthy";
  }
  if (score >= 50 || highPriority <= 2) {
    return "advisory";
  }
  return "degraded";
}

export function buildExecutionNextActions(context = {}, executionPlan = []) {
  const nextActions = executionPlan
    .filter((step) => step.priority === "high" || step.priority === "medium")
    .slice(0, 5)
    .map((step) => `[${step.agent}] ${step.action}`);
  if (context.crossDivision?.syncStatus === "divergent") {
    nextActions.unshift("Reconcile cross-division sync before autonomous execution.");
  }
  if ((context.orchestration?.recommendedActions || []).length) {
    nextActions.push(...context.orchestration.recommendedActions.slice(0, 3));
  }
  return [...new Set(nextActions)].slice(0, 10);
}

export async function getCloudflareExecution(governance = {}, env = {}, options = {}) {
  try {
    const context = await collectExecutionContext(governance, env, options);
    const executionPlan = buildCloudflareExecutionPlan(context);
    const cloudflareExecutionSignals = buildCloudflareExecutionSignals(context);
    const executionScore = computeExecutionScore(context, executionPlan);
    const executionHealth = deriveExecutionHealth(executionScore, executionPlan);
    const nextActions = buildExecutionNextActions(context, executionPlan);
    const executionReasons = [
      ...(context.orchestration?.orchestrationReasons || []).slice(0, 3),
      ...(context.crossDivision?.crossDivisionReasons || []).slice(0, 2),
      ...executionPlan.filter((step) => step.priority === "high").map((step) => step.reason),
    ];
    return {
      executionPlan,
      nextActions,
      executionScore,
      executionHealth,
      executionReasons: [...new Set(executionReasons)].slice(0, 12),
      cloudflareExecutionSignals,
      syncStatus: context.crossDivision?.syncStatus || "partial",
      orchestrationScore: context.orchestration?.orchestrationScore ?? null,
      advisoryOnly: true,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      executionPlan: [
        buildExecutionPlanStep(
          {
            id: "execution-unavailable",
            agent: CLOUDFLARE_EXECUTION.agents.operatorShell,
            division: CROSS_DIVISION_SYNC.operatorShell.division,
            action: "Continue with manual operator review; autonomous execution recommendations unavailable.",
            reason: error.message || "OAuth or upstream unavailable.",
            priority: "medium",
          },
          1,
        ),
      ],
      nextActions: [error.message || "Review Cloudflare federation manually."],
      executionScore: 50,
      executionHealth: "advisory",
      executionReasons: [error.message || "Execution recommendations unavailable without OAuth."],
      cloudflareExecutionSignals: {
        operatorShell: { executionReadiness: "review", advisoryOnly: true },
        marketplaceBackend: { executionReadiness: "review", advisoryOnly: true },
        crossDivision: { syncStatus: "partial", executionReadiness: "review", advisoryOnly: true },
      },
      syncStatus: "partial",
      advisoryOnly: true,
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function getCloudflareExecutionSignals(governance = {}, env = {}, options = {}) {
  const execution = await getCloudflareExecution(governance, env, options);
  return {
    cloudflareExecutionSignals: execution.cloudflareExecutionSignals,
    executionScore: execution.executionScore,
    executionHealth: execution.executionHealth,
    syncStatus: execution.syncStatus,
    advisoryOnly: true,
    checkedAt: execution.checkedAt,
  };
}

export function getCloudflarePipelineExecutionFields(execution = {}) {
  return {
    cloudflarePipelineExecutionPlan: execution.executionPlan || [],
    cloudflarePipelineExecutionScore: execution.executionScore ?? null,
    cloudflarePipelineExecutionReasons: execution.executionReasons || execution.nextActions || [],
    advisoryOnly: true,
  };
}

export function computeModuleExecutionFields(moduleId, execution = {}, moduleCert = {}, moduleOrch = {}) {
  const certScore = moduleCert.score ?? 50;
  const baseScore = execution.executionScore ?? moduleOrch.cloudflareOrchestrationScore ?? 50;
  const syncStatus = execution.syncStatus || "partial";
  let cloudflareExecutionStatus = "ready";
  if (certScore < 50 || syncStatus === "divergent" || execution.executionHealth === "degraded") {
    cloudflareExecutionStatus = "deferred";
  } else if (certScore < 70 || syncStatus === "partial" || moduleCert.status === "review" || execution.executionHealth === "advisory") {
    cloudflareExecutionStatus = "review";
  }
  const cloudflareExecutionScore = Math.max(0, Math.min(100, Math.round(baseScore - Math.abs(certScore - baseScore) * 0.3)));
  const cloudflareExecutionReasons = [
    `Module ${moduleId} execution ${cloudflareExecutionStatus} (cert ${certScore}, execution base ${baseScore}).`,
    ...(execution.executionReasons || []).slice(0, 2),
  ];
  return {
    cloudflareExecutionStatus,
    cloudflareExecutionScore,
    cloudflareExecutionReasons,
    advisoryOnly: true,
  };
}

export function buildCloudflareSafetyExecutionFactor(executionSnapshot = {}) {
  return {
    health: executionSnapshot.executionHealth || deriveExecutionHealth(executionSnapshot.executionScore, executionSnapshot.executionPlan),
    score: executionSnapshot.executionScore ?? null,
    planCount: (executionSnapshot.executionPlan || []).length,
    nextActionCount: (executionSnapshot.nextActions || []).length,
    highPrioritySteps: (executionSnapshot.executionPlan || []).filter((step) => step.priority === "high").length,
    reasons: executionSnapshot.executionReasons || [],
    advisoryOnly: true,
    checkedAt: executionSnapshot.checkedAt || new Date().toISOString(),
  };
}

const ADAPTIVE_MODES = ["steady", "caution", "review", "degraded"];

export function deriveAdaptiveHealth(score, signalsMissing = false) {
  if (signalsMissing || score == null) {
    return "degraded";
  }
  if (score >= 80) {
    return "healthy";
  }
  if (score >= 50) {
    return "advisory";
  }
  return "degraded";
}

function scoreAutomationContribution(automation = {}) {
  const activeCount =
    automation.activeCount ?? Object.values(automation.loops || {}).filter((loop) => loop.active).length;
  return Math.max(0, 100 - activeCount * 12);
}

function scoreAutonomousContribution(triggers = []) {
  return Math.max(0, 100 - triggers.length * 10);
}

function scoreInsightsContribution(insightsHealth) {
  if (insightsHealth === "healthy") {
    return 100;
  }
  if (insightsHealth === "partial" || insightsHealth === "advisory") {
    return 65;
  }
  if (insightsHealth === "degraded") {
    return 35;
  }
  return 50;
}

export function computeCloudflareAdaptiveScore(context = {}) {
  const executionScore = context.executionScore ?? 50;
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certificationScore = context.certificationScore ?? 50;
  const decisionScore = context.decisionScore ?? 50;
  const automationScore = scoreAutomationContribution(context.automation || {});
  const insightsScore = scoreInsightsContribution(context.insightsHealth);
  const autonomousScore = scoreAutonomousContribution(context.autonomousTriggers || []);
  const weighted = Math.round(
    executionScore * 0.12 +
      orchestrationScore * 0.13 +
      crossDivisionScore * 0.13 +
      certificationScore * 0.13 +
      decisionScore * 0.18 +
      automationScore * 0.08 +
      insightsScore * 0.08 +
      autonomousScore * 0.15,
  );
  return Math.max(0, Math.min(100, weighted));
}

export function computeCloudflareAdaptiveMode(context = {}) {
  const reasons = [];
  const offlineCount = (context.reachability?.servers || []).filter((server) => server.status === "offline").length;
  const signalsMissing =
    context.signalsMissing === true ||
    offlineCount >= 3 ||
    (context.reachability?.health === "offline" && offlineCount > 0);

  if (signalsMissing) {
    reasons.push("Cloudflare federation signals unavailable; using fallback adaptive hints.");
    if (offlineCount) {
      reasons.push(`${offlineCount} MCP server(s) offline.`);
    }
    return {
      mode: "degraded",
      reasons,
      score: Math.max(20, computeCloudflareAdaptiveScore({ ...context, decisionScore: 40 }) - 15),
    };
  }

  const decision = String(context.decision || "caution").toLowerCase();
  const syncStatus = context.syncStatus || "partial";
  const certStatus = context.certificationStatus || "review";
  const activeLoops =
    context.automationActiveCount ??
    Object.values(context.automation?.loops || {}).filter((loop) => loop.active).length;
  const triggers = context.autonomousTriggers || [];
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certificationScore = context.certificationScore ?? 50;
  const executionScore = context.executionScore ?? 50;
  const insightsHealth = context.insightsHealth || "optional";

  const reviewSignals =
    syncStatus === "partial" ||
    syncStatus === "divergent" ||
    certStatus === "review" ||
    certStatus === "incompatible" ||
    activeLoops >= 2 ||
    insightsHealth === "degraded" ||
    insightsHealth === "partial" ||
    executionScore < 50;

  const cautionSignals =
    decision === "caution" ||
    decision === "hold" ||
    orchestrationScore < 60 ||
    crossDivisionScore < 60 ||
    certificationScore < 50 ||
    executionScore < 60 ||
    activeLoops >= 1 ||
    triggers.length > 0;

  const score = computeCloudflareAdaptiveScore(context);

  if (reviewSignals) {
    if (syncStatus === "divergent") {
      reasons.push("Cross-division sync divergent; emphasize reconciliation advisories.");
    } else if (syncStatus === "partial") {
      reasons.push("Cross-division sync partial; review federation alignment.");
    }
    if (certStatus === "incompatible" || certStatus === "review") {
      reasons.push(`Marketplace certification status: ${certStatus}.`);
    }
    if (activeLoops >= 2) {
      reasons.push(`${activeLoops} automation loops active; review loop advisories.`);
    }
    if (insightsHealth === "degraded" || insightsHealth === "partial") {
      reasons.push(`Insights health ${insightsHealth}; review observability advisories.`);
    }
    if (executionScore < 50) {
      reasons.push(`Execution score ${executionScore} below advisory threshold.`);
    }
    if (triggers.length) {
      reasons.push(`${triggers.length} autonomous trigger(s) active.`);
    }
    return { mode: "review", reasons, score };
  }

  if (cautionSignals) {
    if (decision === "hold") {
      reasons.push("Cloudflare decision is HOLD; highlight caution badges.");
    } else if (decision === "caution") {
      reasons.push("Cloudflare decision is CAUTION; dim risky modules.");
    }
    if (orchestrationScore < 60) {
      reasons.push(`Orchestration score ${orchestrationScore} below advisory threshold.`);
    }
    if (executionScore < 60) {
      reasons.push(`Execution score ${executionScore} below advisory threshold.`);
    }
    if (activeLoops >= 1) {
      reasons.push(`${activeLoops} automation loop(s) active.`);
    }
    return { mode: "caution", reasons, score };
  }

  if (decision === "proceed" && orchestrationScore >= 70 && crossDivisionScore >= 70 && certificationScore >= 70 && executionScore >= 70) {
    reasons.push("Federation signals stable; normal UI hints.");
    return { mode: "steady", reasons, score };
  }

  reasons.push("Mixed federation signals; defaulting to caution guidance.");
  return { mode: "caution", reasons, score };
}

function buildAdaptiveUiHints(mode, context = {}) {
  const hints = [];
  if (mode === "steady") {
    hints.push({ surface: "operator", hint: "Normal operator console layout; optional Cloudflare badges only.", priority: "low" });
    hints.push({ surface: "marketplace", hint: "Standard module cards; no adaptive dimming.", priority: "low" });
    hints.push({ surface: "os", hint: "OS dashboard at standard emphasis.", priority: "low" });
    return hints;
  }
  if (mode === "caution") {
    hints.push({ surface: "operator", hint: "Highlight caution badges and decision advisories.", priority: "high" });
    hints.push({ surface: "marketplace", hint: "Dim modules with HOLD decision, incompatible certification, or high risk.", priority: "high" });
    hints.push({ surface: "os", hint: "Elevate decision, orchestration, and execution telemetry cards.", priority: "medium" });
    if (context.executionScore != null && context.executionScore < 60) {
      hints.push({ surface: "operator", hint: "Execution score below threshold; surface execution plan advisories.", priority: "high" });
    }
    if (context.decision === "hold") {
      hints.push({ surface: "mission", hint: "Mission strip should reflect HOLD advisory.", priority: "high" });
    }
    return hints;
  }
  if (mode === "review") {
    hints.push({ surface: "operator", hint: "Emphasize cross-division sync, certification, automation, and execution panels.", priority: "high" });
    hints.push({ surface: "marketplace", hint: "Highlight modules with sync or certification advisories.", priority: "high" });
    hints.push({ surface: "os", hint: "Show sync, certification, and automation warnings prominently.", priority: "high" });
    if ((context.automationActiveCount || 0) >= 2) {
      hints.push({ surface: "operator", hint: "Surface active automation loop recommendations.", priority: "medium" });
    }
    return hints;
  }
  hints.push({ surface: "operator", hint: "Cloudflare signals unavailable; show fallback advisory banner.", priority: "high" });
  hints.push({ surface: "marketplace", hint: "Use ADAPT_REVIEW badge; avoid blocking module access.", priority: "medium" });
  hints.push({ surface: "os", hint: "Display degraded adaptive health with optional federation copy.", priority: "medium" });
  return hints;
}

function buildAdaptiveOperatorGuidance(mode, context = {}) {
  const guidance = [];
  if (mode === "steady") {
    guidance.push("Continue normal operator workflows; Cloudflare federation is advisory-only.");
    return guidance;
  }
  if (mode === "caution") {
    guidance.push("Review Cloudflare decision advisories before promotion or release actions.");
    if (context.decision === "hold") {
      guidance.push("HOLD advisory active; defer high-impact pipeline steps until signals improve.");
    }
    if ((context.automationActiveCount || 0) > 0) {
      guidance.push("Active automation loops detected; review loop recommendations in the automation panel.");
    }
    if (context.executionScore != null && context.executionScore < 60) {
      guidance.push(`Execution score ${context.executionScore} is low; review execution plan before autonomous actions.`);
    }
    return guidance;
  }
  if (mode === "review") {
    guidance.push("Prioritize cross-division sync, certification, and automation loop review.");
    if (context.syncStatus === "divergent" || context.syncStatus === "partial") {
      guidance.push("Reconcile operator-shell and marketplace-backend federation metadata.");
    }
    if (context.certificationStatus === "incompatible" || context.certificationStatus === "review") {
      guidance.push("Review marketplace module certification before binding new modules.");
    }
    if ((context.autonomousTriggers || []).length) {
      guidance.push("Autonomous triggers fired; inspect autonomous signals before chaining agents.");
    }
    if (context.executionScore != null && context.executionScore < 50) {
      guidance.push(`Execution score ${context.executionScore} degraded; defer promotion until execution advisories clear.`);
    }
    return guidance;
  }
  guidance.push("Cloudflare MCP or upstream signals unavailable; federation remains optional.");
  guidance.push("Complete OAuth for Cloudflare MCP servers when ready; no operator actions are blocked.");
  return guidance;
}

export function buildCloudflareAdaptiveRuntime(context = {}) {
  const adaptive = computeCloudflareAdaptiveMode(context);
  const signalsMissing = adaptive.mode === "degraded";
  const adaptiveHealth = deriveAdaptiveHealth(adaptive.score, signalsMissing);
  const mode = ADAPTIVE_MODES.includes(adaptive.mode) ? adaptive.mode : "caution";

  return {
    adaptiveState: {
      mode,
      reasons: adaptive.reasons,
      score: adaptive.score,
    },
    uiHints: buildAdaptiveUiHints(mode, context),
    operatorGuidance: buildAdaptiveOperatorGuidance(mode, context),
    adaptiveScore: adaptive.score,
    adaptiveHealth,
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export function buildCloudflareAdaptiveFromSignals({
  orchestration = {},
  crossDivision = {},
  certification = {},
  decision = {},
  execution = {},
  automation = {},
  insights = {},
  autonomous = {},
  reachability = null,
  signalsMissing = false,
} = {}) {
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || autonomous.triggers || [];
  const context = {
    executionScore: execution.executionScore ?? null,
    orchestrationScore: orchestration.orchestrationScore ?? null,
    crossDivisionScore: crossDivision.cloudflareCrossDivisionScore ?? crossDivision.crossDivisionScore ?? null,
    certificationScore: certification.aggregate?.score ?? certification.cloudflareCertificationScore ?? null,
    certificationStatus: certification.aggregate?.status ?? "review",
    decision: decision.decision,
    decisionScore: decision.score ?? null,
    syncStatus: crossDivision.syncStatus || "partial",
    automation,
    automationActiveCount: automation.activeCount ?? 0,
    insightsHealth: insights.health ?? insights.cloudflareInsightsHealth,
    autonomousTriggers: triggers,
    reachability,
    signalsMissing,
  };
  return buildCloudflareAdaptiveRuntime(context);
}

export async function getCloudflareAdaptiveRuntime(governance = {}, env = {}, options = {}) {
  try {
    const moduleIds = options.moduleIds || null;
    const [orchestration, crossDivision, certification, decision, execution, automation, insights, autonomous, reachability] =
      await Promise.all([
        getCloudflareOrchestration(governance, env, { moduleIds }),
        getCloudflareCrossDivisionSync(governance, env),
        getMarketplaceCloudflareCertification(governance, moduleIds),
        getCloudflareDecision(governance),
        getCloudflareExecution(governance, env, { moduleIds }),
        getCloudflareAutomationLoops(governance),
        getCloudflareInsights(governance),
        getCloudflareAutonomousSnapshot(governance),
        getCloudflareApiReachability(),
      ]);
    return buildCloudflareAdaptiveFromSignals({
      orchestration,
      crossDivision,
      certification,
      decision,
      execution,
      automation,
      insights,
      autonomous,
      reachability,
    });
  } catch (error) {
    return buildCloudflareAdvisoryFallback("adaptive", error);
  }
}

export function buildCloudflareSafetyAdaptiveFactor(adaptiveSnapshot = {}) {
  const state = adaptiveSnapshot.adaptiveState || adaptiveSnapshot;
  return {
    health: adaptiveSnapshot.adaptiveHealth || deriveAdaptiveHealth(state.score, state.mode === "degraded"),
    score: adaptiveSnapshot.adaptiveScore ?? state.score ?? null,
    mode: state.mode || "caution",
    reasons: state.reasons || [],
    advisoryOnly: true,
    checkedAt: adaptiveSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleAdaptiveBadge(mode) {
  const normalized = ADAPTIVE_MODES.includes(mode) ? mode : "caution";
  if (normalized === "steady") {
    return "ADAPT_STEADY";
  }
  if (normalized === "review" || normalized === "degraded") {
    return "ADAPT_REVIEW";
  }
  return "ADAPT_CAUTION";
}

export function computeModuleAdaptiveFields(adaptiveRuntime = {}, moduleFields = {}) {
  const globalMode = adaptiveRuntime.adaptiveState?.mode || "caution";
  const cfDecision = moduleFields.cloudflareDecision || "optional";
  const cfCertStatus = moduleFields.cloudflareCertification?.status || "review";
  const cfSyncStatus = moduleFields.cloudflareSyncStatus || "partial";
  let emphasis = globalMode;
  if (globalMode === "caution" && (cfDecision === "hold" || cfCertStatus === "incompatible")) {
    emphasis = "caution";
  } else if (globalMode === "review" && (cfSyncStatus === "partial" || cfSyncStatus === "divergent" || cfCertStatus === "review")) {
    emphasis = "review";
  }
  return {
    cloudflareAdaptiveBadge: getModuleAdaptiveBadge(emphasis),
    cloudflareAdaptiveMode: globalMode,
    cloudflareAdaptiveEmphasis: emphasis,
    cloudflareAdaptiveDim: globalMode === "caution" && (cfDecision === "hold" || cfCertStatus === "incompatible"),
    cloudflareAdaptiveHighlight: globalMode === "review" && (cfSyncStatus === "partial" || cfSyncStatus === "divergent" || cfCertStatus === "review"),
  };
}

const PREDICTIVE_FORECAST_MODES = ["stable", "watch", "alert", "fallback"];

export function derivePredictiveHealth(forecastScore, signalsMissing = false) {
  if (signalsMissing || forecastScore == null) {
    return "degraded";
  }
  if (forecastScore >= 80) {
    return "healthy";
  }
  if (forecastScore >= 50) {
    return "advisory";
  }
  return "degraded";
}

function countHighRiskModules(certification = {}) {
  const moduleCerts = certification.certifications || {};
  return Object.values(moduleCerts).filter(
    (entry) => entry.status === "incompatible" || (entry.score ?? 100) < 50,
  ).length;
}

export function computePredictiveForecastScore(context = {}) {
  const adaptiveScore = context.adaptiveScore ?? 50;
  const executionScore = context.executionScore ?? 50;
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certificationScore = context.certificationScore ?? 50;
  const decisionScore = context.decisionScore ?? 50;
  const automationPenalty = (context.automationActiveCount ?? 0) * 8;
  const insightsPenalty =
    context.insightsHealth === "degraded" ? 20 : context.insightsHealth === "partial" ? 10 : 0;
  const triggerPenalty = (context.autonomousTriggers || []).length * 10;
  const moduleRiskPenalty = (context.highRiskModuleCount ?? 0) * 5;
  const weighted = Math.round(
    adaptiveScore * 0.15 +
      executionScore * 0.12 +
      orchestrationScore * 0.12 +
      crossDivisionScore * 0.15 +
      certificationScore * 0.12 +
      decisionScore * 0.18 +
      50 * 0.16,
  );
  return Math.max(0, Math.min(100, weighted - automationPenalty - insightsPenalty - triggerPenalty - moduleRiskPenalty));
}

export function computePredictiveForecastMode(context = {}) {
  const reasons = [];
  const offlineCount = (context.reachability?.servers || []).filter((server) => server.status === "offline").length;
  const signalsMissing =
    context.signalsMissing === true ||
    offlineCount >= 3 ||
    context.adaptiveMode === "degraded" ||
    (context.reachability?.health === "offline" && offlineCount > 0);

  if (signalsMissing) {
    reasons.push("Insufficient Cloudflare signals for forecasting; using fallback mode.");
    if (offlineCount) {
      reasons.push(`${offlineCount} MCP server(s) offline.`);
    }
    return {
      mode: "fallback",
      reasons,
      score: Math.max(25, computePredictiveForecastScore({ ...context, decisionScore: 40 }) - 20),
    };
  }

  const syncStatus = context.syncStatus || "partial";
  const decision = String(context.decision || "caution").toLowerCase();
  const adaptiveMode = context.adaptiveMode || "caution";
  const executionScore = context.executionScore ?? 50;
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certStatus = context.certificationStatus || "review";
  const activeLoops = context.automationActiveCount ?? 0;
  const triggers = context.autonomousTriggers || [];
  const highRiskModules = context.highRiskModuleCount ?? 0;
  const score = computePredictiveForecastScore(context);

  const alertSignals =
    syncStatus === "divergent" ||
    certStatus === "incompatible" ||
    decision === "hold" ||
    adaptiveMode === "degraded" ||
    executionScore < 45 ||
    orchestrationScore < 45 ||
    triggers.length >= 2 ||
    highRiskModules >= 3;

  if (alertSignals) {
    if (syncStatus === "divergent") {
      reasons.push("Predicted sync divergence escalation without reconciliation.");
    }
    if (certStatus === "incompatible") {
      reasons.push("Forecast module certification degradation across federation.");
    }
    if (decision === "hold") {
      reasons.push("HOLD decision may escalate into pipeline blocking advisories.");
    }
    if (highRiskModules >= 3) {
      reasons.push(`${highRiskModules} high-risk module patterns detected.`);
    }
    if (triggers.length >= 2) {
      reasons.push(`${triggers.length} autonomous triggers may compound federation drift.`);
    }
    return { mode: "alert", reasons, score };
  }

  const watchSignals =
    syncStatus === "partial" ||
    decision === "caution" ||
    adaptiveMode === "review" ||
    adaptiveMode === "caution" ||
    activeLoops >= 1 ||
    triggers.length >= 1 ||
    crossDivisionScore < 65 ||
    executionScore < 60 ||
    orchestrationScore < 60 ||
    highRiskModules >= 1;

  if (watchSignals) {
    if (syncStatus === "partial") {
      reasons.push("Cross-division sync drift likely without preemptive review.");
    }
    if (activeLoops >= 1) {
      reasons.push(`${activeLoops} automation loop(s) may increase advisory surface area.`);
    }
    if (highRiskModules >= 1) {
      reasons.push(`${highRiskModules} module(s) show rising risk patterns.`);
    }
    if (executionScore < 60 || orchestrationScore < 60) {
      reasons.push("Execution or orchestration scores trending below advisory threshold.");
    }
    return { mode: "watch", reasons, score };
  }

  if (decision === "proceed" && adaptiveMode === "steady" && score >= 75) {
    reasons.push("Federation signals stable; no major changes forecast.");
    return { mode: "stable", reasons, score };
  }

  reasons.push("Mixed federation signals; monitoring recommended.");
  return { mode: "watch", reasons, score };
}

function buildPredictiveForecastItems(context = {}, mode = "watch") {
  const predictions = [];
  if (mode === "fallback") {
    predictions.push({
      type: "signal_gap",
      severity: "medium",
      forecast: "OAuth or upstream repos may limit forecast accuracy.",
      confidence: 0.5,
    });
    return predictions;
  }
  if (context.syncStatus === "partial" || context.syncStatus === "divergent") {
    predictions.push({
      type: "sync_drift",
      severity: context.syncStatus === "divergent" ? "high" : "medium",
      forecast:
        context.syncStatus === "divergent"
          ? "Cross-division sync divergence may persist without reconciliation."
          : "Cross-division sync may drift toward partial divergence.",
      confidence: context.syncStatus === "divergent" ? 0.82 : 0.68,
    });
  }
  if ((context.highRiskModuleCount ?? 0) > 0) {
    predictions.push({
      type: "module_risk",
      severity: (context.highRiskModuleCount ?? 0) >= 3 ? "high" : "medium",
      forecast: `${context.highRiskModuleCount} module(s) show elevated risk patterns.`,
      confidence: 0.7,
    });
  }
  if (context.decision === "hold" || context.decision === "caution") {
    predictions.push({
      type: "pipeline_advisory",
      severity: context.decision === "hold" ? "high" : "medium",
      forecast: `Pipeline promotions may face ${String(context.decision).toUpperCase()} advisories.`,
      confidence: 0.75,
    });
  }
  if ((context.automationActiveCount ?? 0) >= 2) {
    predictions.push({
      type: "automation_loop",
      severity: "medium",
      forecast: "Active automation loops may compound federation drift.",
      confidence: 0.65,
    });
  }
  if ((context.autonomousTriggers || []).length >= 1) {
    predictions.push({
      type: "autonomous_trigger",
      severity: "medium",
      forecast: "Autonomous triggers may escalate advisory volume.",
      confidence: 0.62,
    });
  }
  if (mode === "stable" && predictions.length === 0) {
    predictions.push({
      type: "federation_stable",
      severity: "low",
      forecast: "No major federation changes forecast in the current window.",
      confidence: 0.8,
    });
  }
  return predictions;
}

function buildPredictivePreemptiveActions(mode = "watch", context = {}, predictions = []) {
  const actions = [];
  if (mode === "fallback") {
    actions.push("Complete Cloudflare MCP OAuth when ready to improve forecast accuracy.");
    actions.push("Continue advisory-only workflows; predictive modeling does not block operations.");
    return actions;
  }
  if (mode === "alert") {
    actions.push("Review cross-division sync and reconcile divergent federation metadata.");
    actions.push("Defer high-impact pipeline steps until certification and execution scores improve.");
  }
  if (mode === "watch") {
    actions.push("Monitor automation loops and autonomous triggers for escalation.");
    if (context.syncStatus === "partial") {
      actions.push("Schedule marketplace sync review before the next promotion window.");
    }
  }
  if (mode === "stable") {
    actions.push("No preemptive actions required; continue normal advisory federation workflows.");
  }
  predictions
    .filter((entry) => entry.severity === "high")
    .forEach((entry) => {
      if (entry.type === "sync_drift") {
        actions.push("Preemptively reconcile operator-shell and marketplace-backend sync payloads.");
      }
      if (entry.type === "module_risk") {
        actions.push("Review high-risk module certification before binding new modules.");
      }
    });
  return [...new Set(actions)];
}

export function buildCloudflarePredictiveRuntime(context = {}) {
  const forecast = computePredictiveForecastMode(context);
  const signalsMissing = forecast.mode === "fallback";
  const predictiveHealth = derivePredictiveHealth(forecast.score, signalsMissing);
  const mode = PREDICTIVE_FORECAST_MODES.includes(forecast.mode) ? forecast.mode : "watch";
  const predictions = buildPredictiveForecastItems(context, mode);
  const recommendedPreemptiveActions = buildPredictivePreemptiveActions(mode, context, predictions);

  return {
    predictiveState: {
      forecastMode: mode,
      forecastScore: forecast.score,
      forecastReasons: forecast.reasons,
    },
    predictions,
    recommendedPreemptiveActions,
    predictiveScore: forecast.score,
    predictiveHealth,
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export function buildCloudflarePredictiveFromSignals({
  adaptive = {},
  orchestration = {},
  crossDivision = {},
  certification = {},
  decision = {},
  execution = {},
  automation = {},
  insights = {},
  autonomous = {},
  reachability = null,
} = {}) {
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || autonomous.triggers || [];
  const highRiskModuleCount = countHighRiskModules(certification);
  const context = {
    adaptiveMode: adaptive.adaptiveState?.mode,
    adaptiveScore: adaptive.adaptiveScore ?? adaptive.adaptiveState?.score,
    executionScore: execution.executionScore ?? null,
    orchestrationScore: orchestration.orchestrationScore ?? null,
    crossDivisionScore: crossDivision.cloudflareCrossDivisionScore ?? crossDivision.crossDivisionScore ?? null,
    certificationScore: certification.aggregate?.score ?? certification.cloudflareCertificationScore ?? null,
    certificationStatus: certification.aggregate?.status ?? "review",
    decision: decision.decision,
    decisionScore: decision.score ?? null,
    syncStatus: crossDivision.syncStatus || "partial",
    automationActiveCount:
      automation.activeCount ?? Object.values(automation.loops || {}).filter((loop) => loop.active).length,
    insightsHealth: insights.health ?? insights.cloudflareInsightsHealth,
    autonomousTriggers: triggers,
    highRiskModuleCount,
    reachability,
    signalsMissing: adaptive.adaptiveState?.mode === "degraded",
  };
  return buildCloudflarePredictiveRuntime(context);
}

export async function getCloudflarePredictiveModeling(governance = {}, env = {}, options = {}) {
  try {
    const moduleIds = options.moduleIds || null;
    const [adaptive, orchestration, crossDivision, certification, decision, execution, automation, insights, autonomous, reachability] =
      await Promise.all([
        getCloudflareAdaptiveRuntime(governance, env, { moduleIds }),
        getCloudflareOrchestration(governance, env, { moduleIds }),
        getCloudflareCrossDivisionSync(governance, env, moduleIds ? { moduleIds } : {}),
        getMarketplaceCloudflareCertification(governance, moduleIds),
        getCloudflareDecision(governance),
        getCloudflareExecution(governance, env, { moduleIds }),
        getCloudflareAutomationLoops(governance),
        getCloudflareInsights(governance),
        getCloudflareAutonomousSnapshot(governance),
        getCloudflareApiReachability(),
      ]);
    return buildCloudflarePredictiveFromSignals({
      adaptive,
      orchestration,
      crossDivision,
      certification,
      decision,
      execution,
      automation,
      insights,
      autonomous,
      reachability,
    });
  } catch (error) {
    return buildCloudflareAdvisoryFallback("predictive", error);
  }
}

export function buildCloudflareSafetyPredictiveFactor(predictiveSnapshot = {}) {
  const state = predictiveSnapshot.predictiveState || predictiveSnapshot;
  return {
    health:
      predictiveSnapshot.predictiveHealth ||
      derivePredictiveHealth(state.forecastScore ?? state.score, state.forecastMode === "fallback"),
    score: predictiveSnapshot.predictiveScore ?? state.forecastScore ?? null,
    mode: state.forecastMode || "watch",
    reasons: state.forecastReasons || [],
    predictionCount: (predictiveSnapshot.predictions || []).length,
    advisoryOnly: true,
    checkedAt: predictiveSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModulePredictiveBadge(mode) {
  const normalized = PREDICTIVE_FORECAST_MODES.includes(mode) ? mode : "watch";
  if (normalized === "stable") {
    return "PREDICT_STABLE";
  }
  if (normalized === "alert" || normalized === "fallback") {
    return "PREDICT_ALERT";
  }
  return "PREDICT_WATCH";
}

export function computeModulePredictiveFields(predictiveRuntime = {}, moduleFields = {}) {
  const globalMode = predictiveRuntime.predictiveState?.forecastMode || "watch";
  const cfDecision = moduleFields.cloudflareDecision || "optional";
  const cfCertStatus = moduleFields.cloudflareCertification?.status || "review";
  const cfModuleRisk = moduleFields.cloudflareModuleRisk || "low";
  const cfSyncStatus = moduleFields.cloudflareSyncStatus || "partial";
  let moduleForecast = globalMode;
  if (globalMode === "watch" && (cfModuleRisk === "high" || cfCertStatus === "incompatible")) {
    moduleForecast = "alert";
  } else if (globalMode === "stable" && (cfModuleRisk === "high" || cfDecision === "hold")) {
    moduleForecast = "watch";
  } else if (globalMode === "alert" && cfModuleRisk === "low" && cfCertStatus === "certified" && cfSyncStatus === "aligned") {
    moduleForecast = "watch";
  }
  const badgeMode = moduleForecast === "fallback" ? "alert" : moduleForecast;
  return {
    cloudflarePredictiveBadge: getModulePredictiveBadge(badgeMode),
    cloudflarePredictiveMode: globalMode,
    cloudflarePredictiveModuleForecast: moduleForecast,
    cloudflarePredictiveDim: badgeMode === "alert" || badgeMode === "fallback",
    cloudflarePredictiveHighlight:
      badgeMode === "watch" && (cfSyncStatus === "partial" || cfSyncStatus === "divergent" || cfCertStatus === "review"),
  };
}

export function deriveStrategicHealth(planScore, signalsMissing = false) {
  if (signalsMissing || planScore == null) {
    return "degraded";
  }
  if (planScore >= 80) {
    return "healthy";
  }
  if (planScore >= 50) {
    return "advisory";
  }
  return "degraded";
}

export function computeStrategicPlanScore(context = {}) {
  const predictiveScore = context.predictiveScore ?? 50;
  const adaptiveScore = context.adaptiveScore ?? 50;
  const executionScore = context.executionScore ?? 50;
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certificationScore = context.certificationScore ?? 50;
  const decisionScore = context.decisionScore ?? 50;
  const loopPenalty = (context.automationActiveCount ?? 0) * 6;
  const triggerPenalty = (context.autonomousTriggers || []).length * 8;
  const riskPenalty = (context.highRiskModuleCount ?? 0) * 4;
  const weighted = Math.round(
    predictiveScore * 0.2 +
      adaptiveScore * 0.15 +
      executionScore * 0.12 +
      orchestrationScore * 0.12 +
      crossDivisionScore * 0.13 +
      certificationScore * 0.13 +
      decisionScore * 0.15,
  );
  return Math.max(0, Math.min(100, weighted - loopPenalty - triggerPenalty - riskPenalty));
}

export function computeStrategicHorizon(context = {}) {
  const signalsMissing =
    context.signalsMissing === true ||
    context.predictiveMode === "fallback" ||
    context.adaptiveMode === "degraded";
  if (signalsMissing) {
    return "short";
  }
  if (
    context.predictiveMode === "stable" &&
    context.adaptiveMode === "steady" &&
    context.decision === "proceed" &&
    (context.planScore ?? 0) >= 75
  ) {
    return "long";
  }
  return "medium";
}

export function computeStrategicStripMode(context = {}) {
  if (
    context.predictiveMode === "alert" ||
    context.predictiveMode === "fallback" ||
    context.adaptiveMode === "degraded" ||
    context.adaptiveMode === "review" ||
    context.decision === "hold" ||
    context.syncStatus === "divergent"
  ) {
    return "prioritize";
  }
  if (
    context.predictiveMode === "watch" ||
    context.adaptiveMode === "caution" ||
    context.decision === "caution" ||
    context.syncStatus === "partial" ||
    (context.automationActiveCount ?? 0) >= 1 ||
    (context.autonomousTriggers || []).length >= 1
  ) {
    return "watch";
  }
  return "stable";
}

function buildStrategicThemes(context = {}) {
  const themes = [];
  if (context.syncStatus === "partial" || context.syncStatus === "divergent") {
    themes.push("stability");
  }
  if (
    (context.highRiskModuleCount ?? 0) > 0 ||
    context.certificationStatus === "incompatible" ||
    context.certificationStatus === "review" ||
    context.decision === "hold"
  ) {
    themes.push("risk_reduction");
  }
  if ((context.executionScore ?? 100) < 70 || (context.orchestrationScore ?? 100) < 70) {
    themes.push("performance");
  }
  if (
    context.insightsHealth === "degraded" ||
    context.insightsHealth === "partial" ||
    (context.automationActiveCount ?? 0) >= 1
  ) {
    themes.push("observability");
  }
  if (!themes.length) {
    themes.push("stability");
  }
  return [...new Set(themes)];
}

function buildStrategicPlan(context = {}, horizon = "medium") {
  const steps = [];
  if (context.signalsMissing || context.predictiveMode === "fallback") {
    steps.push({
      action: "Complete OAuth for Cloudflare MCP servers and refresh federation signals.",
      horizon: "short",
      theme: "observability",
      priority: "high",
    });
    steps.push({
      action: "Run short-horizon advisory review; defer promotion until signals improve.",
      horizon: "short",
      theme: "risk_reduction",
      priority: "high",
    });
    return steps;
  }
  if (context.syncStatus === "partial" || context.syncStatus === "divergent") {
    steps.push({
      action: "Tighten cross-division sync between operator-shell and marketplace-backend.",
      horizon,
      theme: "stability",
      priority: context.syncStatus === "divergent" ? "high" : "medium",
    });
  }
  if (context.certificationStatus === "review" || context.certificationStatus === "incompatible") {
    steps.push({
      action: "Review marketplace module certification and rotate high-risk modules.",
      horizon,
      theme: "risk_reduction",
      priority: "high",
    });
  }
  if ((context.automationActiveCount ?? 0) >= 2) {
    steps.push({
      action: "Address active automation loops before expanding federation campaigns.",
      horizon,
      theme: "observability",
      priority: "medium",
    });
  }
  if (context.decision === "caution" || context.decision === "hold") {
    steps.push({
      action: "Review pipeline advisories and tighten promotion gates for HOLD/CAUTION decisions.",
      horizon,
      theme: "risk_reduction",
      priority: context.decision === "hold" ? "high" : "medium",
    });
  }
  if ((context.executionScore ?? 100) < 65 || (context.orchestrationScore ?? 100) < 65) {
    steps.push({
      action: "Improve execution and orchestration scores via advisory plan review.",
      horizon,
      theme: "performance",
      priority: "medium",
    });
  }
  if (!steps.length) {
    steps.push({
      action: "Maintain steady federation posture; schedule routine observability review.",
      horizon: horizon === "long" ? "long" : "medium",
      theme: "stability",
      priority: "low",
    });
  }
  return steps.slice(0, 8);
}

function buildRecommendedCampaigns(context = {}, themes = []) {
  const campaigns = [];
  if (themes.includes("stability") && (context.syncStatus === "partial" || context.syncStatus === "divergent")) {
    campaigns.push("Sync Hardening Week");
  }
  if (themes.includes("risk_reduction")) {
    campaigns.push("Certification Review Sprint");
  }
  if (themes.includes("observability")) {
    campaigns.push("Observability Loop Triage");
  }
  if (themes.includes("performance") && !campaigns.length) {
    campaigns.push("Orchestration Tune-Up");
  }
  if (!campaigns.length) {
    campaigns.push("Federation Steady-State Check");
  }
  return [...new Set(campaigns)].slice(0, 4);
}

function buildStrategicPlanReasons(context = {}, horizon = "medium", stripMode = "watch") {
  const reasons = [];
  if (context.signalsMissing) {
    reasons.push("Predictive/adaptive signals missing; short-horizon fallback plan.");
  }
  reasons.push(`Strategic horizon: ${horizon} (hours–days advisory window).`);
  reasons.push(`Mission strip alignment: ${stripMode.toUpperCase()}.`);
  if (context.predictiveMode) {
    reasons.push(`Predictive forecast: ${context.predictiveMode} (score ${context.predictiveScore ?? "n/a"}).`);
  }
  if ((context.highRiskModuleCount ?? 0) > 0) {
    reasons.push(`${context.highRiskModuleCount} module(s) show evolving risk patterns.`);
  }
  return reasons;
}

export function buildCloudflareStrategicRuntime(context = {}) {
  const signalsMissing =
    context.signalsMissing === true ||
    context.predictiveMode === "fallback" ||
    context.adaptiveMode === "degraded";
  const planScore = computeStrategicPlanScore(context);
  const horizon = computeStrategicHorizon({ ...context, planScore });
  const stripMode = computeStrategicStripMode(context);
  const strategicThemes = buildStrategicThemes(context);
  const strategicPlan = buildStrategicPlan(context, horizon);
  const recommendedCampaigns = buildRecommendedCampaigns(context, strategicThemes);
  const planReasons = buildStrategicPlanReasons(context, horizon, stripMode);

  return {
    strategicState: {
      horizon,
      planScore,
      planReasons,
      stripMode,
    },
    strategicPlan,
    strategicThemes,
    recommendedCampaigns,
    strategicScore: planScore,
    strategicHealth: deriveStrategicHealth(planScore, signalsMissing),
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export function buildCloudflareStrategicFromSignals({
  predictive = {},
  adaptive = {},
  orchestration = {},
  crossDivision = {},
  certification = {},
  decision = {},
  execution = {},
  automation = {},
  insights = {},
  autonomous = {},
} = {}) {
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || autonomous.triggers || [];
  const highRiskModuleCount = countHighRiskModules(certification);
  const context = {
    predictiveMode: predictive.predictiveState?.forecastMode,
    predictiveScore: predictive.predictiveScore ?? predictive.predictiveState?.forecastScore,
    adaptiveMode: adaptive.adaptiveState?.mode,
    adaptiveScore: adaptive.adaptiveScore ?? adaptive.adaptiveState?.score,
    executionScore: execution.executionScore ?? null,
    orchestrationScore: orchestration.orchestrationScore ?? null,
    crossDivisionScore: crossDivision.cloudflareCrossDivisionScore ?? crossDivision.crossDivisionScore ?? null,
    certificationScore: certification.aggregate?.score ?? null,
    certificationStatus: certification.aggregate?.status ?? "review",
    decision: decision.decision,
    decisionScore: decision.score ?? null,
    syncStatus: crossDivision.syncStatus || "partial",
    automationActiveCount:
      automation.activeCount ?? Object.values(automation.loops || {}).filter((loop) => loop.active).length,
    insightsHealth: insights.health ?? insights.cloudflareInsightsHealth,
    autonomousTriggers: triggers,
    highRiskModuleCount,
    signalsMissing:
      predictive.predictiveState?.forecastMode === "fallback" || adaptive.adaptiveState?.mode === "degraded",
    predictions: predictive.predictions || [],
  };
  return buildCloudflareStrategicRuntime(context);
}

export async function getCloudflareStrategicPlanning(governance = {}, env = {}, options = {}) {
  try {
    const moduleIds = options.moduleIds || null;
    const [predictive, adaptive, orchestration, crossDivision, certification, decision, execution, automation, insights, autonomous] =
      await Promise.all([
        getCloudflarePredictiveModeling(governance, env, { moduleIds }),
        getCloudflareAdaptiveRuntime(governance, env, { moduleIds }),
        getCloudflareOrchestration(governance, env, { moduleIds }),
        getCloudflareCrossDivisionSync(governance, env, moduleIds ? { moduleIds } : {}),
        getMarketplaceCloudflareCertification(governance, moduleIds),
        getCloudflareDecision(governance),
        getCloudflareExecution(governance, env, { moduleIds }),
        getCloudflareAutomationLoops(governance),
        getCloudflareInsights(governance),
        getCloudflareAutonomousSnapshot(governance),
      ]);
    return buildCloudflareStrategicFromSignals({
      predictive,
      adaptive,
      orchestration,
      crossDivision,
      certification,
      decision,
      execution,
      automation,
      insights,
      autonomous,
    });
  } catch (error) {
    return buildCloudflareAdvisoryFallback("strategic", error);
  }
}

export function buildCloudflareSafetyStrategicFactor(strategicSnapshot = {}) {
  const state = strategicSnapshot.strategicState || strategicSnapshot;
  return {
    health:
      strategicSnapshot.strategicHealth ||
      deriveStrategicHealth(state.planScore ?? state.score, state.horizon === "short" && state.planScore < 40),
    score: strategicSnapshot.strategicScore ?? state.planScore ?? null,
    horizon: state.horizon || "medium",
    stripMode: state.stripMode || "watch",
    planSteps: (strategicSnapshot.strategicPlan || []).length,
    campaigns: strategicSnapshot.recommendedCampaigns || [],
    advisoryOnly: true,
    checkedAt: strategicSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleStrategicTag(moduleFields = {}, strategicRuntime = {}) {
  const certStatus = moduleFields.cloudflareCertification?.status || "review";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  const syncStatus = moduleFields.cloudflareSyncStatus || "partial";
  const decision = moduleFields.cloudflareDecision || "optional";
  const stripMode = strategicRuntime.strategicState?.stripMode || "watch";

  if (certStatus === "incompatible" || moduleRisk === "high" || decision === "hold" || stripMode === "prioritize") {
    return "STRAT_REVIEW";
  }
  if (syncStatus === "partial" || syncStatus === "divergent" || certStatus === "review") {
    return "STRAT_STABILIZE";
  }
  if (decision === "proceed" && certStatus === "certified" && moduleRisk === "low" && stripMode === "stable") {
    return "STRAT_PROMOTE";
  }
  return stripMode === "stable" ? "STRAT_PROMOTE" : "STRAT_STABILIZE";
}

export function computeModuleStrategicFields(strategicRuntime = {}, moduleFields = {}, moduleId = null) {
  const tag = getModuleStrategicTag(moduleFields, strategicRuntime);
  const inPlan = (strategicRuntime.strategicPlan || []).some(
    (step) =>
      (step.theme === "risk_reduction" && tag === "STRAT_REVIEW") ||
      (step.theme === "stability" && tag === "STRAT_STABILIZE") ||
      (step.theme === "performance" && tag === "STRAT_PROMOTE"),
  );
  return {
    cloudflareStrategicTag: tag,
    cloudflareStrategicHorizon: strategicRuntime.strategicState?.horizon || "medium",
    cloudflareStrategicStripMode: strategicRuntime.strategicState?.stripMode || "watch",
    cloudflareStrategicHighlight: inPlan || tag === "STRAT_REVIEW",
    cloudflareStrategicInPlan: inPlan,
    cloudflareStrategicModuleId: moduleId,
  };
}

export const UCIP_MODES = ["green", "yellow", "orange", "red"];

export function computeUcipMode(context = {}) {
  const decision = context.decision || "caution";
  const adaptiveMode = context.adaptiveMode || "caution";
  const predictiveMode = context.predictiveMode || "watch";
  const stripMode = context.stripMode || "watch";
  const horizon = context.horizon || "medium";

  if (context.signalsMissing || adaptiveMode === "degraded" || predictiveMode === "fallback") {
    return "red";
  }
  if (decision === "hold" || predictiveMode === "alert" || stripMode === "prioritize" || horizon === "short") {
    return "orange";
  }
  if (
    decision === "caution" ||
    predictiveMode === "watch" ||
    stripMode === "watch" ||
    adaptiveMode === "caution" ||
    adaptiveMode === "review"
  ) {
    return "yellow";
  }
  if (
    decision === "proceed" &&
    adaptiveMode === "steady" &&
    predictiveMode === "stable" &&
    (stripMode === "stable" || horizon === "long")
  ) {
    return "green";
  }
  return "yellow";
}

export function deriveUcipHealth(mode) {
  if (mode === "green") {
    return "healthy";
  }
  if (mode === "red") {
    return "degraded";
  }
  return "advisory";
}

export function computeUcipScore(context = {}) {
  const scores = [
    context.decisionScore,
    context.adaptiveScore,
    context.predictiveScore,
    context.strategicScore,
    context.executionScore,
    context.orchestrationScore,
    context.crossDivisionScore,
    context.certificationScore,
    context.automationScore,
    context.autonomousScore,
    context.insightsScore,
  ].filter((entry) => entry != null && !Number.isNaN(Number(entry)));
  if (!scores.length) {
    return 25;
  }
  const modePenalty = { green: 0, yellow: 5, orange: 12, red: 25 }[context.mode] ?? 8;
  const weighted = Math.round(scores.reduce((sum, entry) => sum + Number(entry), 0) / scores.length);
  return Math.max(0, Math.min(100, weighted - modePenalty));
}

function buildUcipSignals({
  automation = {},
  autonomous = {},
  decision = {},
  certification = {},
  crossDivision = {},
  orchestration = {},
  execution = {},
  adaptive = {},
  predictive = {},
  strategic = {},
  insights = {},
} = {}) {
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || autonomous.triggers || [];
  return {
    automation: {
      activeCount: automation.activeCount ?? 0,
      health: automation.health,
      score: automation.score,
      loops: Object.keys(automation.loops || {}).filter((id) => automation.loops[id]?.active),
    },
    autonomous: {
      triggerCount: triggers.length,
      triggers,
      score: autonomous.cloudflareSafety?.autonomousScore ?? null,
      warnings: autonomous.cloudflareSafety?.autonomousWarnings || [],
    },
    decision: {
      decision: decision.decision,
      score: decision.score,
      reasons: decision.reasons || [],
    },
    certification: {
      status: certification.aggregate?.status,
      score: certification.aggregate?.score,
      reasons: certification.aggregate?.reasons || [],
    },
    sync: {
      syncStatus: crossDivision.syncStatus,
      score: crossDivision.crossDivisionScore ?? crossDivision.cloudflareCrossDivisionScore,
      health: crossDivision.crossDivisionHealth ?? crossDivision.cloudflareCrossDivisionHealth,
    },
    orchestration: {
      score: orchestration.orchestrationScore,
      health: orchestration.orchestrationHealth,
      planCount: (orchestration.plan || []).length,
    },
    execution: {
      score: execution.executionScore,
      health: execution.executionHealth,
      nextActions: (execution.nextActions || []).slice(0, 3),
    },
    adaptive: {
      mode: adaptive.adaptiveState?.mode,
      score: adaptive.adaptiveScore,
      hints: (adaptive.uiHints || []).length,
      guidance: (adaptive.operatorGuidance || []).slice(0, 2),
    },
    predictive: {
      forecastMode: predictive.predictiveState?.forecastMode,
      score: predictive.predictiveScore,
      predictions: (predictive.predictions || []).length,
      preemptiveActions: (predictive.recommendedPreemptiveActions || []).slice(0, 2),
    },
    strategic: {
      horizon: strategic.strategicState?.horizon,
      stripMode: strategic.strategicState?.stripMode,
      score: strategic.strategicScore,
      planCount: (strategic.strategicPlan || []).length,
    },
    insights: {
      score: insights.cloudflareInsightsScore,
      health: insights.health,
    },
  };
}

function buildUcipRecommendedActions(context = {}, signals = {}) {
  const actions = [];
  if (signals.execution?.nextActions?.length) {
    actions.push(...signals.execution.nextActions);
  }
  if (signals.predictive?.preemptiveActions?.length) {
    actions.push(...signals.predictive.preemptiveActions);
  }
  if (context.strategicPlan?.length) {
    actions.push(...context.strategicPlan.slice(0, 3).map((step) => step.action));
  }
  if (signals.orchestration?.planCount > 0 && signals.orchestration.health !== "healthy") {
    actions.push("Review orchestration plan advisories.");
  }
  if (signals.sync?.syncStatus === "divergent" || signals.sync?.syncStatus === "partial") {
    actions.push("Reconcile cross-division Cloudflare sync.");
  }
  if (signals.automation?.activeCount >= 2) {
    actions.push("Address active automation loops before promotion.");
  }
  if (!actions.length) {
    actions.push("Maintain advisory federation steady-state; optional OAuth when ready.");
  }
  return [...new Set(actions)].slice(0, 8);
}

export function buildCloudflareUcipFromSignals({
  automation = {},
  autonomous = {},
  decision = {},
  certification = {},
  crossDivision = {},
  orchestration = {},
  execution = {},
  adaptive = {},
  predictive = {},
  strategic = {},
  insights = {},
} = {}) {
  const strategicPlan = strategic.strategicPlan || [];
  const horizon = strategic.strategicState?.horizon || "medium";
  const stripMode = strategic.strategicState?.stripMode || "watch";
  const signalsMissing =
    adaptive.adaptiveState?.mode === "degraded" || predictive.predictiveState?.forecastMode === "fallback";
  const context = {
    decision: decision.decision,
    adaptiveMode: adaptive.adaptiveState?.mode,
    predictiveMode: predictive.predictiveState?.forecastMode,
    stripMode,
    horizon,
    signalsMissing,
    decisionScore: decision.score,
    adaptiveScore: adaptive.adaptiveScore,
    predictiveScore: predictive.predictiveScore,
    strategicScore: strategic.strategicScore,
    executionScore: execution.executionScore,
    orchestrationScore: orchestration.orchestrationScore,
    crossDivisionScore: crossDivision.crossDivisionScore ?? crossDivision.cloudflareCrossDivisionScore,
    certificationScore: certification.aggregate?.score,
    automationScore: automation.score ?? (automation.activeCount != null ? 100 - automation.activeCount * 15 : null),
    autonomousScore: autonomous.cloudflareSafety?.autonomousScore,
    insightsScore: insights.cloudflareInsightsScore,
    strategicPlan,
  };
  const mode = computeUcipMode(context);
  context.mode = mode;
  const score = computeUcipScore(context);
  const health = deriveUcipHealth(mode);
  const ucipSignals = buildUcipSignals({
    automation,
    autonomous,
    decision,
    certification,
    crossDivision,
    orchestration,
    execution,
    adaptive,
    predictive,
    strategic,
    insights,
  });
  const ucipReasons = [
    `UCIP mode: ${mode} (synthesized across ${CLOUDFLARE_UCIP.layers.length} federation layers).`,
    ...(decision.reasons || []).slice(0, 2),
    ...(adaptive.adaptiveState?.reasons || []).slice(0, 1),
    ...(predictive.predictiveState?.forecastReasons || []).slice(0, 1),
    ...(strategic.strategicState?.planReasons || []).slice(0, 1),
  ].filter(Boolean);
  const ucipRecommendedActions = buildUcipRecommendedActions(
    { ...context, strategicPlan },
    ucipSignals,
  );
  const ucipCampaigns = strategic.recommendedCampaigns || [];

  return {
    ucipState: {
      mode,
      score,
      health,
      horizon,
      stripMode,
    },
    ucipReasons,
    ucipSignals,
    ucipRecommendedActions,
    ucipCampaigns,
    ucipHealth: health,
    ucipScore: score,
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareUcip(governance = {}, env = {}, options = {}) {
  const moduleIds = options.moduleIds || null;
  return runAdvisoryGuarded(
    async () => {
      const [automation, autonomous, decision, certification, crossDivision, orchestration, execution, adaptive, predictive, strategic, insights] =
        await Promise.all([
          getCloudflareAutomationLoops(governance),
          getCloudflareAutonomousSnapshot(governance),
          getCloudflareDecision(governance),
          getMarketplaceCloudflareCertification(governance, moduleIds),
          getCloudflareCrossDivisionSync(governance, env, moduleIds ? { moduleIds } : {}),
          getCloudflareOrchestration(governance, env, { moduleIds }),
          getCloudflareExecution(governance, env, { moduleIds }),
          getCloudflareAdaptiveRuntime(governance, env, { moduleIds }),
          getCloudflarePredictiveModeling(governance, env, { moduleIds }),
          getCloudflareStrategicPlanning(governance, env, { moduleIds }),
          getCloudflareInsights(governance),
        ]);
      return buildCloudflareUcipFromSignals({
        automation,
        autonomous,
        decision,
        certification,
        crossDivision,
        orchestration,
        execution,
        adaptive,
        predictive,
        strategic,
        insights,
      });
    },
    "ucip",
    { cacheKeySuffix: metaAdvisoryCacheSuffix({ moduleIds }), timeoutMs: ADVISORY_HEAVY_TIMEOUT_MS },
  );
}

export function buildCloudflareSafetyUcipFactor(ucipSnapshot = {}) {
  const state = ucipSnapshot.ucipState || ucipSnapshot;
  return {
    health: ucipSnapshot.ucipHealth || state.health || deriveUcipHealth(state.mode),
    score: ucipSnapshot.ucipScore ?? state.score ?? null,
    mode: state.mode || "red",
    horizon: state.horizon || "short",
    stripMode: state.stripMode || "prioritize",
    actionCount: (ucipSnapshot.ucipRecommendedActions || []).length,
    campaigns: ucipSnapshot.ucipCampaigns || [],
    advisoryOnly: true,
    checkedAt: ucipSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleUcipTag(ucipMode = "yellow", moduleFields = {}) {
  const certStatus = moduleFields.cloudflareCertification?.status || "review";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  const decision = moduleFields.cloudflareDecision || "optional";
  let mode = ucipMode;
  if (certStatus === "incompatible" || moduleRisk === "high" || decision === "hold") {
    mode = "red";
  } else if (moduleRisk === "medium" && mode === "green") {
    mode = "yellow";
  }
  return `UCIP_${mode.toUpperCase()}`;
}

export function computeModuleUcipFields(ucipRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = ucipRuntime.ucipState?.mode || "yellow";
  const tag = getModuleUcipTag(mode, moduleFields);
  const risk =
    tag === "UCIP_RED" || moduleFields.cloudflareModuleRisk === "high"
      ? "high"
      : tag === "UCIP_ORANGE" || moduleFields.cloudflareModuleRisk === "medium"
        ? "medium"
        : "low";
  const highlight = tag === "UCIP_RED" || tag === "UCIP_ORANGE" || moduleFields.cloudflareStrategicHighlight;
  return {
    cloudflareUCIPTag: tag,
    cloudflareUCIPMode: mode,
    cloudflareUCIPRisk: risk,
    cloudflareUCIPHighlight: highlight,
    cloudflareUCIPScore: ucipRuntime.ucipScore ?? ucipRuntime.ucipState?.score ?? null,
    cloudflareUCIPModuleId: moduleId,
  };
}

export const AMG_MODES = ["govern_green", "govern_yellow", "govern_orange", "govern_red"];

const UCIP_TO_AMG_MODE = {
  green: "govern_green",
  yellow: "govern_yellow",
  orange: "govern_orange",
  red: "govern_red",
};

export function computeAmgMode(ucipMode = "yellow") {
  return UCIP_TO_AMG_MODE[String(ucipMode || "yellow").toLowerCase()] || "govern_yellow";
}

export function deriveAmgHealth(mode) {
  if (mode === "govern_green") {
    return "healthy";
  }
  if (mode === "govern_red") {
    return "degraded";
  }
  return "advisory";
}

export function computeAmgScore(ucipSnapshot = {}, mode = "govern_yellow") {
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const modePenalty = {
    govern_green: 0,
    govern_yellow: 5,
    govern_orange: 12,
    govern_red: 25,
  };
  return Math.max(0, Math.min(100, Number(ucipScore) - (modePenalty[mode] ?? 8)));
}

function buildAmgRules(mode, ucip = {}) {
  const rules = [
    {
      id: "amg-advisory-only",
      rule: "AMG guidance is advisory-only; it does not execute pipelines, deployments, or governance blocks.",
      surface: "os",
      priority: "baseline",
    },
  ];
  if (mode === "govern_green") {
    rules.push(
      { id: "amg-proceed", rule: "UCIP stable: continue normal operator workflows with optional federation review.", surface: "operator", priority: "low" },
      { id: "amg-promote", rule: "Marketplace module promotion permitted with standard certification advisories.", surface: "marketplace", priority: "low" },
      { id: "amg-mission-steady", rule: "Mission board may proceed; no elevated governance nudges required.", surface: "mission", priority: "low" },
    );
  } else if (mode === "govern_yellow") {
    rules.push(
      { id: "amg-review", rule: "Review UCIP advisories before promotion or autonomous actions.", surface: "operator", priority: "medium" },
      { id: "amg-cert-check", rule: "Verify module certification and sync alignment before marketplace highlights.", surface: "marketplace", priority: "medium" },
      { id: "amg-mission-watch", rule: "Mission board: monitor UCIP reasons and top recommended actions.", surface: "mission", priority: "medium" },
    );
  } else if (mode === "govern_orange") {
    rules.push(
      { id: "amg-hold-promote", rule: "Defer module promotion until UCIP orange signals clear.", surface: "marketplace", priority: "high" },
      { id: "amg-operator-focus", rule: "Operator: prioritize UCIP recommended actions over new deployments.", surface: "operator", priority: "high" },
      { id: "amg-mission-alert", rule: "Mission board: treat UCIP campaigns and hold advisories as active.", surface: "mission", priority: "high" },
    );
  } else {
    rules.push(
      { id: "amg-fallback", rule: "UCIP degraded: use minimal advisory payload; restore OAuth or MCP signals.", surface: "os", priority: "critical" },
      { id: "amg-no-promote", rule: "Do not promote marketplace modules until UCIP recovers from red.", surface: "marketplace", priority: "critical" },
      { id: "amg-operator-recover", rule: "Operator: focus on signal recovery before governance escalation.", surface: "operator", priority: "critical" },
    );
  }
  if ((ucip.ucipCampaigns || []).length) {
    rules.push({
      id: "amg-campaign",
      rule: `Active UCIP campaigns: ${(ucip.ucipCampaigns || []).slice(0, 2).join("; ")}`,
      surface: "mission",
      priority: mode === "govern_red" ? "critical" : "medium",
    });
  }
  return rules.slice(0, 8);
}

function buildAmgOperatorNudges(mode, ucip = {}) {
  const nudges = (ucip.ucipRecommendedActions || []).slice(0, 4).map((action) => ({
    surface: "operator",
    nudge: action,
    priority: mode === "govern_red" ? "critical" : "medium",
  }));
  if (mode === "govern_green") {
    nudges.push({ surface: "operator", nudge: "Federation steady-state: optional OAuth hardening when convenient.", priority: "low" });
  } else if (mode === "govern_red") {
    nudges.push({ surface: "operator", nudge: "Restore Cloudflare MCP OAuth or upstream signals before acting on governance hints.", priority: "critical" });
  } else if (mode === "govern_orange") {
    nudges.push({ surface: "operator", nudge: "Review UCIP hold/alert posture before pipeline promotion.", priority: "high" });
  } else {
    nudges.push({ surface: "operator", nudge: "Scan UCIP reasons on the mission board before operator execution.", priority: "medium" });
  }
  return nudges.slice(0, 6);
}

function buildAmgPolicyHints(mode, ucip = {}) {
  const hints = [
    {
      surface: "mission",
      hint:
        mode === "govern_green"
          ? "Maintain UCIP steady-state; AMG requires no elevated mission posture."
          : `AMG ${mode}: align mission strip with UCIP and review top rules.`,
    },
    {
      surface: "marketplace",
      hint:
        mode === "govern_green"
          ? "Module badges may show AMG_OK when UCIP and module risk are low."
          : mode === "govern_red"
            ? "Marketplace: defer promotion; expect AMG_CAUTION on modules."
            : "Marketplace: review AMG tags alongside UCIP badges before promotion.",
    },
    {
      surface: "operator",
      hint:
        mode === "govern_orange" || mode === "govern_red"
          ? "Operator console: prioritize AMG nudges over per-layer federation panels."
          : "Operator console: AMG consolidates UCIP into governance rules and nudges.",
    },
  ];
  (ucip.ucipCampaigns || []).slice(0, 2).forEach((campaign) => {
    hints.push({ surface: "marketplace", hint: `Campaign advisory: ${campaign}` });
  });
  if ((ucip.ucipReasons || []).length) {
    hints.push({ surface: "os", hint: `UCIP context: ${(ucip.ucipReasons || []).slice(0, 1).join("")}` });
  }
  return hints.slice(0, 8);
}

export function buildCloudflareAmgFromUcip(ucipSnapshot = {}) {
  const ucipState = ucipSnapshot.ucipState || {};
  const ucipMode = ucipState.mode || "red";
  const signalsMissing = ucipMode === "red" && (ucipSnapshot.ucipHealth === "degraded" || !ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length);
  const mode = signalsMissing ? "govern_red" : computeAmgMode(ucipMode);
  const score = computeAmgScore(ucipSnapshot, mode);
  const health = deriveAmgHealth(mode);
  const amgRules = buildAmgRules(mode, ucipSnapshot);
  const amgOperatorNudges = buildAmgOperatorNudges(mode, ucipSnapshot);
  const amgPolicyHints = buildAmgPolicyHints(mode, ucipSnapshot);
  const amgReasons = [
    `AMG mode: ${mode} (derived from UCIP ${ucipMode}).`,
    ...(ucipSnapshot.ucipReasons || []).slice(0, 3),
    signalsMissing ? "UCIP degraded; AMG using minimal governance fallback." : null,
  ].filter(Boolean);

  return {
    amgState: { mode, score, health },
    amgRules,
    amgOperatorNudges,
    amgPolicyHints,
    amgReasons,
    amgHealth: health,
    amgScore: score,
    ucipUpstream: {
      mode: ucipMode,
      score: ucipSnapshot.ucipScore ?? ucipState.score ?? null,
      health: ucipSnapshot.ucipHealth || ucipState.health || "optional",
    },
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCloudflareAmg(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || (await getCloudflareUcip(governance, env, options));
      return buildCloudflareAmgFromUcip(ucip);
    },
    "amg",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) },
  );
}

export function buildCloudflareSafetyAmgFactor(amgSnapshot = {}) {
  const state = amgSnapshot.amgState || amgSnapshot;
  return {
    health: amgSnapshot.amgHealth || state.health || deriveAmgHealth(state.mode),
    score: amgSnapshot.amgScore ?? state.score ?? null,
    mode: state.mode || "govern_red",
    reasons: amgSnapshot.amgReasons || [],
    ruleCount: (amgSnapshot.amgRules || []).length,
    nudgeCount: (amgSnapshot.amgOperatorNudges || []).length,
    advisoryOnly: true,
    checkedAt: amgSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleAmgTag(amgMode = "govern_yellow", moduleFields = {}) {
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  if (amgMode === "govern_red" || amgMode === "govern_orange" || moduleRisk === "high" || ucipTag === "UCIP_RED") {
    return "AMG_CAUTION";
  }
  if (amgMode === "govern_yellow" || moduleRisk === "medium" || ucipTag === "UCIP_ORANGE" || ucipTag === "UCIP_YELLOW") {
    return "AMG_REVIEW";
  }
  return "AMG_OK";
}

export function computeModuleAmgFields(amgRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = amgRuntime.amgState?.mode || "govern_yellow";
  const tag = getModuleAmgTag(mode, moduleFields);
  const risk =
    tag === "AMG_CAUTION" || moduleFields.cloudflareModuleRisk === "high"
      ? "high"
      : tag === "AMG_REVIEW" || moduleFields.cloudflareModuleRisk === "medium"
        ? "medium"
        : "low";
  const highlight = tag === "AMG_CAUTION" || (tag === "AMG_REVIEW" && moduleFields.cloudflareUCIPHighlight);
  return {
    cloudflareAMGTag: tag,
    cloudflareAMGMode: mode,
    cloudflareAMGRisk: risk,
    cloudflareAMGHighlight: highlight,
    cloudflareAMGScore: amgRuntime.amgScore ?? amgRuntime.amgState?.score ?? null,
    cloudflareAMGModuleId: moduleId,
  };
}

export const CBA_MODES = ["behavior_green", "behavior_yellow", "behavior_orange", "behavior_red"];

function deriveCbaBehaviorContext(ucipSnapshot = {}, amgSnapshot = {}, context = {}) {
  const signals = ucipSnapshot.ucipSignals || {};
  const heartbeat = context.heartbeat || {};
  const moduleStats = context.moduleStats || {};
  const operatorPosture = {
    governanceHealth: heartbeat.governanceHealth || "optional",
    pipelineHealth: heartbeat.pipelineEngineHealth || "idle",
    safetyHealth: heartbeat.safetyHealth || "optional",
    decision: signals.decision?.decision || heartbeat.cloudflareDecision || "optional",
  };
  const osIndicators = {
    automationLoops: signals.automation?.activeCount ?? 0,
    syncStatus: signals.sync?.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial",
    orchestrationHealth: signals.orchestration?.health || heartbeat.cloudflareOrchestrationHealth || "optional",
    executionHealth: signals.execution?.health || heartbeat.cloudflareExecutionHealth || "optional",
    autonomousTriggers: signals.autonomous?.triggerCount ?? 0,
  };
  const marketplaceIndicators = {
    highRiskModules: moduleStats.highRiskCount ?? 0,
    driftModules: moduleStats.driftCount ?? 0,
    totalModules: moduleStats.totalModules ?? 0,
  };
  return { operatorPosture, osIndicators, marketplaceIndicators, heartbeat, moduleStats };
}

function computeBehaviorDriftScore(behaviorContext = {}, ucipSnapshot = {}, amgSnapshot = {}) {
  let drift = 0;
  const { operatorPosture, osIndicators, marketplaceIndicators } = behaviorContext;
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";

  if (osIndicators.syncStatus === "divergent") {
    drift += 2;
  } else if (osIndicators.syncStatus === "partial") {
    drift += 1;
  }
  if (osIndicators.automationLoops >= 2) {
    drift += 1;
  }
  if (osIndicators.autonomousTriggers >= 2) {
    drift += 1;
  }
  if (operatorPosture.decision === "hold" && amgMode === "govern_green") {
    drift += 2;
  }
  if (operatorPosture.decision === "caution" && ucipMode === "green") {
    drift += 1;
  }
  if (osIndicators.orchestrationHealth === "deferred" || osIndicators.executionHealth === "deferred") {
    drift += 1;
  }
  if (marketplaceIndicators.highRiskModules >= 2) {
    drift += 1;
  }
  if (marketplaceIndicators.driftModules >= 3) {
    drift += 1;
  }
  if (amgMode === "govern_red" || ucipMode === "red") {
    drift += 3;
  } else if (amgMode === "govern_orange" || ucipMode === "orange") {
    drift += 2;
  }
  return drift;
}

export function computeCbaMode(amgSnapshot = {}, ucipSnapshot = {}, behaviorContext = {}) {
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing =
    amgMode === "govern_red" &&
    (amgSnapshot.amgHealth === "degraded" || ucipSnapshot.ucipHealth === "degraded" || !ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length);
  if (signalsMissing) {
    return "behavior_red";
  }
  const drift = computeBehaviorDriftScore(behaviorContext, ucipSnapshot, amgSnapshot);
  if (amgMode === "govern_red" || ucipMode === "red" || drift >= 5) {
    return "behavior_red";
  }
  if (amgMode === "govern_orange" || ucipMode === "orange" || drift >= 3) {
    return "behavior_orange";
  }
  if (amgMode === "govern_yellow" || ucipMode === "yellow" || drift >= 1) {
    return "behavior_yellow";
  }
  return "behavior_green";
}

export function deriveCbaHealth(mode) {
  if (mode === "behavior_green") {
    return "healthy";
  }
  if (mode === "behavior_red") {
    return "degraded";
  }
  return "advisory";
}

export function computeCbaScore(amgSnapshot = {}, ucipSnapshot = {}, mode = "behavior_yellow", drift = 0) {
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(amgScore) + Number(ucipScore)) / 2);
  const modePenalty = {
    behavior_green: 0,
    behavior_yellow: 6,
    behavior_orange: 14,
    behavior_red: 28,
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - drift * 2));
}

function buildCbaBehaviorPatterns(mode, behaviorContext = {}, ucipSnapshot = {}, amgSnapshot = {}) {
  const patterns = [];
  const { operatorPosture, osIndicators, marketplaceIndicators } = behaviorContext;
  patterns.push({
    id: "cba-advisory-only",
    pattern: "CBA observes behavior patterns only; it does not execute operator or system actions.",
    surface: "os",
  });
  if (operatorPosture.pipelineHealth === "online" && operatorPosture.governanceHealth === "online") {
    patterns.push({ id: "cba-operator-steady", pattern: "Operator surfaces show steady governance and pipeline posture.", surface: "operator" });
  }
  if (osIndicators.automationLoops > 0) {
    patterns.push({ id: "cba-automation-active", pattern: `${osIndicators.automationLoops} active automation loop(s) detected in federation signals.`, surface: "os" });
  }
  if (osIndicators.syncStatus === "aligned") {
    patterns.push({ id: "cba-sync-aligned", pattern: "Cross-division sync appears aligned with marketplace-backend.", surface: "marketplace" });
  }
  if (marketplaceIndicators.highRiskModules > 0) {
    patterns.push({ id: "cba-module-risk", pattern: `${marketplaceIndicators.highRiskModules} module(s) flagged with elevated risk in catalog.`, surface: "marketplace" });
  }
  if (amgSnapshot.amgRules?.length) {
    patterns.push({ id: "cba-amg-rules", pattern: `AMG active with ${amgSnapshot.amgRules.length} governance rule(s).`, surface: "operator" });
  }
  if (mode === "behavior_green") {
    patterns.push({ id: "cba-aligned", pattern: "Operator, OS, and marketplace behavior align with UCIP + AMG posture.", surface: "mission" });
  }
  return patterns.slice(0, 8);
}

function buildCbaBehaviorDriftWarnings(mode, behaviorContext = {}, ucipSnapshot = {}, amgSnapshot = {}) {
  const warnings = [];
  const { operatorPosture, osIndicators, marketplaceIndicators } = behaviorContext;
  if (osIndicators.syncStatus === "divergent" || osIndicators.syncStatus === "partial") {
    warnings.push(`Sync drift detected (${osIndicators.syncStatus}); reconcile cross-division alignment.`);
  }
  if (operatorPosture.decision === "hold" && amgSnapshot.amgState?.mode === "govern_green") {
    warnings.push("Decision posture HOLD conflicts with AMG govern_green — review operator behavior.");
  }
  if (osIndicators.automationLoops >= 2) {
    warnings.push("Multiple automation loops active while behavioral posture may not reflect loop load.");
  }
  if (marketplaceIndicators.driftModules >= 2) {
    warnings.push(`${marketplaceIndicators.driftModules} marketplace module(s) show behavioral drift indicators.`);
  }
  if (ucipSnapshot.ucipState?.mode === "orange" && amgSnapshot.amgState?.mode === "govern_green") {
    warnings.push("UCIP orange conflicts with AMG govern_green — governance/behavior mismatch.");
  }
  if (mode === "behavior_red") {
    warnings.push("Severe behavioral drift or degraded upstream AMG/UCIP signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant behavioral drift warnings at this time.");
  }
  return warnings.slice(0, 6);
}

function buildCbaOperatorBehaviorHints(mode, behaviorContext = {}, amgSnapshot = {}) {
  const hints = (amgSnapshot.amgOperatorNudges || []).slice(0, 3).map((entry) =>
    typeof entry === "string" ? entry : entry.nudge || "",
  );
  if (mode === "behavior_green") {
    hints.push("Maintain current operator cadence; behavioral signals align with AMG guidance.");
  } else if (mode === "behavior_red") {
    hints.push("Pause promotion workflows; restore UCIP/AMG signals before changing operator behavior.");
  } else if (mode === "behavior_orange") {
    hints.push("Reduce concurrent operator actions; prioritize drift warnings on mission board.");
  } else {
    hints.push("Review mission UCIP/AMG strips before executing new operator intents.");
  }
  return [...new Set(hints.filter(Boolean))].slice(0, 6);
}

function buildCbaSystemBehaviorHints(mode, behaviorContext = {}, ucipSnapshot = {}, amgSnapshot = {}) {
  const hints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`,
  );
  const { osIndicators } = behaviorContext;
  if (osIndicators.syncStatus !== "aligned") {
    hints.push(`OS sync posture: ${osIndicators.syncStatus} — monitor execution and orchestration loops.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP suggests: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "behavior_red") {
    hints.push("System behavior fallback: use minimal advisory payload until AMG/UCIP recover.");
  }
  return [...new Set(hints.filter(Boolean))].slice(0, 6);
}

export function buildCloudflareCbaFromAmg(amgSnapshot = {}, ucipSnapshot = {}, behaviorContext = {}) {
  const context = deriveCbaBehaviorContext(ucipSnapshot, amgSnapshot, behaviorContext);
  const drift = computeBehaviorDriftScore(context, ucipSnapshot, amgSnapshot);
  const mode = computeCbaMode(amgSnapshot, ucipSnapshot, context);
  const score = computeCbaScore(amgSnapshot, ucipSnapshot, mode, drift);
  const health = deriveCbaHealth(mode);
  const cbaBehaviorPatterns = buildCbaBehaviorPatterns(mode, context, ucipSnapshot, amgSnapshot);
  const cbaBehaviorDriftWarnings = buildCbaBehaviorDriftWarnings(mode, context, ucipSnapshot, amgSnapshot);
  const cbaOperatorBehaviorHints = buildCbaOperatorBehaviorHints(mode, context, amgSnapshot);
  const cbaSystemBehaviorHints = buildCbaSystemBehaviorHints(mode, context, ucipSnapshot, amgSnapshot);
  const cbaReasons = [
    `CBA mode: ${mode} (derived from AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Behavioral drift score: ${drift}.`,
    ...(amgSnapshot.amgReasons || []).slice(0, 2),
    mode === "behavior_red" && drift >= 5 ? "Severe behavioral drift or degraded upstream signals." : null,
  ].filter(Boolean);

  return {
    cbaState: { mode, score, health },
    cbaBehaviorPatterns,
    cbaBehaviorDriftWarnings,
    cbaOperatorBehaviorHints,
    cbaSystemBehaviorHints,
    cbaReasons,
    cbaHealth: health,
    cbaScore: score,
    behaviorDriftScore: drift,
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null,
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null,
    },
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function buildCbaBehaviorContextFromEnv(governance = {}, env = {}, options = {}) {
  const moduleIds = options.moduleIds || [];
  let heartbeat = options.heartbeat || null;
  if (!heartbeat && env.HEARTBEAT) {
    try {
      heartbeat = await env.HEARTBEAT.get("division-heartbeat", "json");
    } catch {
      heartbeat = {};
    }
  }
  let moduleStats = { highRiskCount: 0, driftCount: 0, totalModules: moduleIds.length };
  if (moduleIds.length) {
    try {
      const certification = await getMarketplaceCloudflareCertification(governance, moduleIds);
      const crossDivision = await getCloudflareCrossDivisionSync(governance, env, { moduleIds });
      moduleStats = moduleIds.reduce(
        (acc, id) => {
          const cert = certification.certifications?.[id];
          const risk = cert?.status === "incompatible" ? "high" : cert?.status === "review" ? "medium" : "low";
          if (risk === "high") {
            acc.highRiskCount += 1;
          }
          if (crossDivision.syncStatus === "partial" || crossDivision.syncStatus === "divergent") {
            acc.driftCount += 1;
          }
          return acc;
        },
        { highRiskCount: 0, driftCount: 0, totalModules: moduleIds.length },
      );
    } catch {
      moduleStats = { highRiskCount: 0, driftCount: 0, totalModules: moduleIds.length };
    }
  }
  return { heartbeat: heartbeat || {}, moduleStats };
}

export async function getCloudflareCba(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || (await getCloudflareUcip(governance, env, options));
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const behavioralContext =
        options.behavioralContext || (await buildCbaBehaviorContextFromEnv(governance, env, options));
      return buildCloudflareCbaFromAmg(amg, ucip, behavioralContext);
    },
    "cba",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) },
  );
}

export function buildCloudflareSafetyCbaFactor(cbaSnapshot = {}) {
  const state = cbaSnapshot.cbaState || cbaSnapshot;
  return {
    health: cbaSnapshot.cbaHealth || state.health || deriveCbaHealth(state.mode),
    score: cbaSnapshot.cbaScore ?? state.score ?? null,
    mode: state.mode || "behavior_red",
    reasons: cbaSnapshot.cbaReasons || [],
    driftWarningCount: (cbaSnapshot.cbaBehaviorDriftWarnings || []).length,
    patternCount: (cbaSnapshot.cbaBehaviorPatterns || []).length,
    advisoryOnly: true,
    checkedAt: cbaSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleCbaTag(cbaMode = "behavior_yellow", moduleFields = {}) {
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (cbaMode === "behavior_red" || cbaMode === "behavior_orange" || moduleRisk === "high" || amgTag === "AMG_CAUTION" || ucipTag === "UCIP_RED") {
    return "CBA_RISK";
  }
  if (cbaMode === "behavior_yellow" || moduleRisk === "medium" || amgTag === "AMG_REVIEW" || ucipTag === "UCIP_ORANGE" || ucipTag === "UCIP_YELLOW") {
    return "CBA_DRIFT";
  }
  return "CBA_STABLE";
}

export function computeModuleCbaFields(cbaRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = cbaRuntime.cbaState?.mode || "behavior_yellow";
  const tag = getModuleCbaTag(mode, moduleFields);
  const risk =
    tag === "CBA_RISK" || moduleFields.cloudflareModuleRisk === "high"
      ? "high"
      : tag === "CBA_DRIFT" || moduleFields.cloudflareModuleRisk === "medium"
        ? "medium"
        : "low";
  const highlight = tag === "CBA_RISK" || (tag === "CBA_DRIFT" && moduleFields.cloudflareAMGHighlight);
  return {
    cloudflareCBATag: tag,
    cloudflareCBAMode: mode,
    cloudflareCBARisk: risk,
    cloudflareCBAHighlight: highlight,
    cloudflareCBAScore: cbaRuntime.cbaScore ?? cbaRuntime.cbaState?.score ?? null,
    cloudflareCBAModuleId: moduleId,
  };
}

export const CAL_MODES = ["align_green", "align_yellow", "align_orange", "align_red"];

function deriveCalAlignmentContext(cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, context = {}) {
  const behaviorContext = deriveCbaBehaviorContext(ucipSnapshot, amgSnapshot, context);
  const heartbeat = context.heartbeat || {};
  const missionTrajectory = {
    ucipMode: ucipSnapshot.ucipState?.mode || heartbeat.cloudflareUCIPMode || "yellow",
    amgMode: amgSnapshot.amgState?.mode || heartbeat.cloudflareAMGMode || "govern_yellow",
    cbaMode: cbaSnapshot.cbaState?.mode || heartbeat.cloudflareCBAMode || "behavior_yellow",
    strategicStrip: heartbeat.cloudflareStrategicStripMode || "watch",
    decision: behaviorContext.operatorPosture.decision,
  };
  const operatorIntent = {
    governanceHealth: heartbeat.governanceHealth || "optional",
    pipelineHealth: heartbeat.pipelineEngineHealth || "idle",
    safetyHealth: heartbeat.safetyHealth || "optional",
    intentCount: context.intentCount ?? 0,
  };
  const marketplacePosture = {
    ...behaviorContext.marketplaceIndicators,
    cbaDriftWarnings: (cbaSnapshot.cbaBehaviorDriftWarnings || []).length,
    cbaPatterns: (cbaSnapshot.cbaBehaviorPatterns || []).length,
  };
  const osCognitivePosture = {
    ...behaviorContext.osIndicators,
    behaviorDriftScore: cbaSnapshot.behaviorDriftScore ?? 0,
    amgRuleCount: (amgSnapshot.amgRules || []).length,
    ucipSignalLayers: Object.keys(ucipSnapshot.ucipSignals || {}).length,
  };
  return {
    ...behaviorContext,
    missionTrajectory,
    operatorIntent,
    marketplacePosture,
    osCognitivePosture,
    heartbeat,
  };
}

function computeCognitiveMisalignmentScore(alignmentContext = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  let misalignment = 0;
  const { missionTrajectory, operatorPosture, marketplacePosture, osCognitivePosture } = alignmentContext;
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";

  if (cbaMode === "behavior_green" && amgMode === "govern_orange") {
    misalignment += 2;
  }
  if (cbaMode === "behavior_yellow" && amgMode === "govern_green" && ucipMode === "green") {
    misalignment += 1;
  }
  if (cbaMode === "behavior_orange" && (amgMode === "govern_green" || ucipMode === "green")) {
    misalignment += 2;
  }
  if (missionTrajectory.ucipMode === "orange" && missionTrajectory.amgMode === "govern_green") {
    misalignment += 2;
  }
  if (missionTrajectory.cbaMode === "behavior_red" && missionTrajectory.amgMode !== "govern_red") {
    misalignment += 2;
  }
  if (operatorPosture.decision === "hold" && cbaMode === "behavior_green") {
    misalignment += 2;
  }
  if (operatorPosture.decision === "proceed" && (cbaMode === "behavior_orange" || cbaMode === "behavior_red")) {
    misalignment += 1;
  }
  if (marketplacePosture.cbaDriftWarnings >= 2) {
    misalignment += 1;
  }
  if (marketplacePosture.highRiskModules >= 2 && cbaMode === "behavior_green") {
    misalignment += 1;
  }
  if (osCognitivePosture.syncStatus === "divergent") {
    misalignment += 2;
  } else if (osCognitivePosture.syncStatus === "partial") {
    misalignment += 1;
  }
  if (osCognitivePosture.behaviorDriftScore >= 3) {
    misalignment += 1;
  }
  if (cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red") {
    misalignment += 3;
  } else if (cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange") {
    misalignment += 2;
  }
  if (
    cbaSnapshot.cbaHealth === "degraded" ||
    amgSnapshot.amgHealth === "degraded" ||
    ucipSnapshot.ucipHealth === "degraded"
  ) {
    misalignment += 2;
  }
  return misalignment;
}

export function computeCalMode(cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, alignmentContext = {}) {
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing =
    (cbaMode === "behavior_red" && cbaSnapshot.cbaHealth === "degraded") ||
    (amgMode === "govern_red" && amgSnapshot.amgHealth === "degraded") ||
    (ucipMode === "red" && ucipSnapshot.ucipHealth === "degraded") ||
    !ucipSnapshot.ucipSignals ||
    !Object.keys(ucipSnapshot.ucipSignals || {}).length;
  if (signalsMissing) {
    return "align_red";
  }
  const misalignment = computeCognitiveMisalignmentScore(alignmentContext, cbaSnapshot, amgSnapshot, ucipSnapshot);
  if (cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red" || misalignment >= 6) {
    return "align_red";
  }
  if (cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange" || misalignment >= 4) {
    return "align_orange";
  }
  if (cbaMode === "behavior_yellow" || amgMode === "govern_yellow" || ucipMode === "yellow" || misalignment >= 2) {
    return "align_yellow";
  }
  return "align_green";
}

export function deriveCalHealth(mode) {
  if (mode === "align_green") {
    return "healthy";
  }
  if (mode === "align_red") {
    return "degraded";
  }
  return "advisory";
}

export function computeCalScore(cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, mode = "align_yellow", misalignment = 0) {
  const cbaScore = cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? 20;
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(cbaScore) + Number(amgScore) + Number(ucipScore)) / 3);
  const modePenalty = {
    align_green: 0,
    align_yellow: 5,
    align_orange: 12,
    align_red: 25,
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - misalignment * 2));
}

function buildCalAlignmentFindings(mode, alignmentContext = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const findings = [];
  const { missionTrajectory, operatorIntent, marketplacePosture, osCognitivePosture } = alignmentContext;

  findings.push({
    id: "cal-advisory-only",
    finding: "CAL evaluates cognitive alignment only; it does not execute operator or system actions.",
    surface: "os",
    aligned: true,
  });

  if (missionTrajectory.ucipMode === missionTrajectory.amgMode?.replace("govern_", "") || mode === "align_green") {
    findings.push({
      id: "cal-mission-ucip-amg",
      finding: "Mission trajectory UCIP and AMG strips show coherent governance posture.",
      surface: "mission",
      aligned: true,
    });
  } else {
    findings.push({
      id: "cal-mission-mismatch",
      finding: `Mission trajectory mismatch: UCIP ${missionTrajectory.ucipMode} vs AMG ${missionTrajectory.amgMode}.`,
      surface: "mission",
      aligned: false,
    });
  }

  if (cbaSnapshot.cbaState?.mode === "behavior_green" && mode === "align_green") {
    findings.push({
      id: "cal-cba-aligned",
      finding: "CBA behavioral patterns align with cognitive alignment posture.",
      surface: "operator",
      aligned: true,
    });
  }

  if (operatorIntent.governanceHealth === "online" && operatorIntent.pipelineHealth === "online") {
    findings.push({
      id: "cal-operator-steady",
      finding: "Operator intent surfaces show steady governance and pipeline posture.",
      surface: "operator",
      aligned: true,
    });
  }

  if (osCognitivePosture.syncStatus === "aligned") {
    findings.push({
      id: "cal-os-sync",
      finding: "OS cognitive posture: cross-division sync aligned with federation signals.",
      surface: "os",
      aligned: true,
    });
  }

  if (marketplacePosture.highRiskModules > 0) {
    findings.push({
      id: "cal-marketplace-risk",
      finding: `${marketplacePosture.highRiskModules} module(s) elevate marketplace cognitive risk.`,
      surface: "marketplace",
      aligned: marketplacePosture.highRiskModules < 2,
    });
  }

  if ((amgSnapshot.amgRules || []).length) {
    findings.push({
      id: "cal-amg-rules",
      finding: `AMG active with ${amgSnapshot.amgRules.length} governance rule(s) informing alignment.`,
      surface: "operator",
      aligned: amgSnapshot.amgState?.mode !== "govern_red",
    });
  }

  if (mode === "align_red") {
    findings.push({
      id: "cal-severe-misalignment",
      finding: "Severe cognitive misalignment or degraded CBA/AMG/UCIP upstream signals.",
      surface: "os",
      aligned: false,
    });
  }

  return findings.slice(0, 8);
}

function buildCalAlignmentWarnings(mode, alignmentContext = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const warnings = [];
  const { missionTrajectory, operatorPosture, marketplacePosture, osCognitivePosture } = alignmentContext;
  const driftWarnings = cbaSnapshot.cbaBehaviorDriftWarnings || [];

  if (driftWarnings.length) {
    warnings.push(...driftWarnings.slice(0, 2).map((entry) => `CBA drift: ${entry}`));
  }
  if (missionTrajectory.ucipMode === "orange" && missionTrajectory.cbaMode === "behavior_green") {
    warnings.push("UCIP orange conflicts with CBA behavior_green — cognitive/governance mismatch.");
  }
  if (missionTrajectory.amgMode === "govern_green" && cbaSnapshot.cbaState?.mode === "behavior_orange") {
    warnings.push("AMG govern_green conflicts with CBA behavior_orange — review operator alignment.");
  }
  if (operatorPosture.decision === "hold" && mode === "align_green") {
    warnings.push("Decision posture HOLD conflicts with CAL align_green — operator intent may diverge.");
  }
  if (osCognitivePosture.syncStatus === "divergent" || osCognitivePosture.syncStatus === "partial") {
    warnings.push(`OS sync drift (${osCognitivePosture.syncStatus}) may indicate cognitive misalignment.`);
  }
  if (marketplacePosture.cbaDriftWarnings >= 2) {
    warnings.push("Multiple CBA behavioral drift warnings affect marketplace cognitive posture.");
  }
  if (mode === "align_red") {
    warnings.push("Severe cognitive misalignment or degraded CBA/AMG/UCIP signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant cognitive misalignment warnings at this time.");
  }
  return warnings.slice(0, 6);
}

function buildCalOperatorAlignmentHints(mode, alignmentContext = {}, cbaSnapshot = {}, amgSnapshot = {}) {
  const hints = (cbaSnapshot.cbaOperatorBehaviorHints || []).slice(0, 2);
  const nudges = (amgSnapshot.amgOperatorNudges || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : entry.nudge || "",
  );
  if (mode === "align_green") {
    hints.push("Maintain current operator cadence; cognitive alignment matches UCIP + AMG + CBA.");
  } else if (mode === "align_red") {
    hints.push("Pause promotion workflows; restore CBA/AMG/UCIP signals before changing operator posture.");
  } else if (mode === "align_orange") {
    hints.push("Reduce concurrent operator actions; prioritize alignment warnings on mission board.");
  } else {
    hints.push("Review mission UCIP/AMG/CBA strips before executing new operator intents.");
  }
  return [...new Set([...hints, ...nudges].filter(Boolean))].slice(0, 6);
}

function buildCalSystemAlignmentHints(mode, alignmentContext = {}, ucipSnapshot = {}, amgSnapshot = {}, cbaSnapshot = {}) {
  const hints = (cbaSnapshot.cbaSystemBehaviorHints || []).slice(0, 2);
  const policyHints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`,
  );
  const { osCognitivePosture } = alignmentContext;
  if (osCognitivePosture.syncStatus !== "aligned") {
    hints.push(`OS sync posture: ${osCognitivePosture.syncStatus} — reconcile cognitive alignment across divisions.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP suggests: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "align_red") {
    hints.push("System alignment fallback: use minimal advisory payload until CBA/AMG/UCIP recover.");
  }
  return [...new Set([...hints, ...policyHints].filter(Boolean))].slice(0, 6);
}

export function buildCloudflareCalFromCba(
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  alignmentContext = {},
) {
  const context = deriveCalAlignmentContext(cbaSnapshot, amgSnapshot, ucipSnapshot, alignmentContext);
  const misalignment = computeCognitiveMisalignmentScore(context, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const mode = computeCalMode(cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const score = computeCalScore(cbaSnapshot, amgSnapshot, ucipSnapshot, mode, misalignment);
  const health = deriveCalHealth(mode);
  const calAlignmentFindings = buildCalAlignmentFindings(mode, context, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const calAlignmentWarnings = buildCalAlignmentWarnings(mode, context, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const calOperatorAlignmentHints = buildCalOperatorAlignmentHints(mode, context, cbaSnapshot, amgSnapshot);
  const calSystemAlignmentHints = buildCalSystemAlignmentHints(mode, context, ucipSnapshot, amgSnapshot, cbaSnapshot);
  const calReasons = [
    `CAL mode: ${mode} (derived from CBA ${cbaSnapshot.cbaState?.mode || "behavior_yellow"} + AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Cognitive misalignment score: ${misalignment}.`,
    ...(cbaSnapshot.cbaReasons || []).slice(0, 1),
    ...(amgSnapshot.amgReasons || []).slice(0, 1),
    mode === "align_red" && misalignment >= 6 ? "Severe cognitive misalignment or degraded upstream signals." : null,
  ].filter(Boolean);

  return {
    calState: { mode, score, health },
    calAlignmentFindings,
    calAlignmentWarnings,
    calOperatorAlignmentHints,
    calSystemAlignmentHints,
    calReasons,
    calHealth: health,
    calScore: score,
    cognitiveMisalignmentScore: misalignment,
    cbaUpstream: {
      mode: cbaSnapshot.cbaState?.mode,
      score: cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? null,
    },
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null,
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null,
    },
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function buildCalAlignmentContextFromEnv(governance = {}, env = {}, options = {}) {
  const behavioralContext = await buildCbaBehaviorContextFromEnv(governance, env, options);
  let intentCount = 0;
  if (env.OPERATOR_INTENTS) {
    try {
      const intents = await env.OPERATOR_INTENTS.list({ limit: 20 });
      intentCount = intents.keys?.length ?? 0;
    } catch {
      intentCount = 0;
    }
  }
  return { ...behavioralContext, intentCount };
}

export async function getCloudflareCal(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || (await getCloudflareUcip(governance, env, options));
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const cba = options.cba || buildCloudflareCbaFromAmg(amg, ucip, options.behavioralContext);
      const alignmentContext =
        options.alignmentContext || (await buildCalAlignmentContextFromEnv(governance, env, options));
      return buildCloudflareCalFromCba(cba, amg, ucip, alignmentContext);
    },
    "cal",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) },
  );
}

export function buildCloudflareSafetyCalFactor(calSnapshot = {}) {
  const state = calSnapshot.calState || calSnapshot;
  return {
    health: calSnapshot.calHealth || state.health || deriveCalHealth(state.mode),
    score: calSnapshot.calScore ?? state.score ?? null,
    mode: state.mode || "align_red",
    reasons: calSnapshot.calReasons || [],
    warningCount: (calSnapshot.calAlignmentWarnings || []).length,
    findingCount: (calSnapshot.calAlignmentFindings || []).length,
    advisoryOnly: true,
    checkedAt: calSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleCalTag(calMode = "align_yellow", moduleFields = {}) {
  const cbaTag = moduleFields.cloudflareCBATag || "";
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (
    calMode === "align_red" ||
    calMode === "align_orange" ||
    moduleRisk === "high" ||
    cbaTag === "CBA_RISK" ||
    amgTag === "AMG_CAUTION" ||
    ucipTag === "UCIP_RED"
  ) {
    return "CAL_MISALIGNED";
  }
  if (
    calMode === "align_yellow" ||
    moduleRisk === "medium" ||
    cbaTag === "CBA_DRIFT" ||
    amgTag === "AMG_REVIEW" ||
    ucipTag === "UCIP_ORANGE" ||
    ucipTag === "UCIP_YELLOW"
  ) {
    return "CAL_PARTIAL";
  }
  return "CAL_ALIGNED";
}

export function computeModuleCalFields(calRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = calRuntime.calState?.mode || "align_yellow";
  const tag = getModuleCalTag(mode, moduleFields);
  const risk =
    tag === "CAL_MISALIGNED" || moduleFields.cloudflareModuleRisk === "high"
      ? "high"
      : tag === "CAL_PARTIAL" || moduleFields.cloudflareModuleRisk === "medium"
        ? "medium"
        : "low";
  const highlight =
    tag === "CAL_MISALIGNED" || (tag === "CAL_PARTIAL" && moduleFields.cloudflareCBAHighlight);
  return {
    cloudflareCALTag: tag,
    cloudflareCALMode: mode,
    cloudflareCALRisk: risk,
    cloudflareCALHighlight: highlight,
    cloudflareCALScore: calRuntime.calScore ?? calRuntime.calState?.score ?? null,
    cloudflareCALModuleId: moduleId,
  };
}

export const IHL_MODES = ["intent_green", "intent_yellow", "intent_orange", "intent_red"];

function deriveIhlIntentContext(
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  context = {},
) {
  const alignmentContext = deriveCalAlignmentContext(cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const heartbeat = context.heartbeat || {};
  const missionIntent = {
    ucipMode: ucipSnapshot.ucipState?.mode || heartbeat.cloudflareUCIPMode || "yellow",
    amgMode: amgSnapshot.amgState?.mode || heartbeat.cloudflareAMGMode || "govern_yellow",
    cbaMode: cbaSnapshot.cbaState?.mode || heartbeat.cloudflareCBAMode || "behavior_yellow",
    calMode: calSnapshot.calState?.mode || heartbeat.cloudflareCALMode || "align_yellow",
    decision: alignmentContext.operatorPosture?.decision || heartbeat.cloudflareDecision || "optional",
  };
  const operatorIntent = {
    governanceHealth: heartbeat.governanceHealth || "optional",
    pipelineHealth: heartbeat.pipelineEngineHealth || "idle",
    safetyHealth: heartbeat.safetyHealth || "optional",
    intentCount: context.intentCount ?? 0,
    calHints: (calSnapshot.calOperatorAlignmentHints || []).length,
    cbaHints: (cbaSnapshot.cbaOperatorBehaviorHints || []).length,
  };
  const marketplaceIntent = {
    ...alignmentContext.marketplaceIndicators,
    calWarnings: (calSnapshot.calAlignmentWarnings || []).length,
    cbaDriftWarnings: (cbaSnapshot.cbaBehaviorDriftWarnings || []).length,
    highRiskModules: alignmentContext.marketplaceIndicators?.highRiskModules ?? 0,
  };
  const osIntentPosture = {
    ...alignmentContext.osIndicators,
    cognitiveMisalignmentScore: calSnapshot.cognitiveMisalignmentScore ?? 0,
    behaviorDriftScore: cbaSnapshot.behaviorDriftScore ?? 0,
    calFindings: (calSnapshot.calAlignmentFindings || []).length,
    amgRuleCount: (amgSnapshot.amgRules || []).length,
  };
  return {
    ...alignmentContext,
    missionIntent,
    operatorIntent,
    marketplaceIntent,
    osIntentPosture,
    heartbeat,
  };
}

function computeIntentMisalignmentScore(
  intentContext = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
) {
  let misalignment = 0;
  const { missionIntent, operatorPosture, marketplaceIntent, osIntentPosture } = intentContext;
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";

  if (calMode === "align_green" && cbaMode === "behavior_orange") {
    misalignment += 2;
  }
  if (calMode === "align_yellow" && cbaMode === "behavior_green" && amgMode === "govern_green") {
    misalignment += 1;
  }
  if (missionIntent.calMode === "align_orange" && missionIntent.cbaMode === "behavior_green") {
    misalignment += 2;
  }
  if (missionIntent.ucipMode === "orange" && missionIntent.calMode === "align_green") {
    misalignment += 2;
  }
  if (operatorPosture?.decision === "hold" && calMode === "align_green") {
    misalignment += 2;
  }
  if (operatorPosture?.decision === "proceed" && (calMode === "align_orange" || calMode === "align_red")) {
    misalignment += 1;
  }
  if (marketplaceIntent.calWarnings >= 2 || marketplaceIntent.cbaDriftWarnings >= 2) {
    misalignment += 1;
  }
  if (marketplaceIntent.highRiskModules >= 2 && calMode === "align_green") {
    misalignment += 1;
  }
  if (osIntentPosture.syncStatus === "divergent") {
    misalignment += 2;
  } else if (osIntentPosture.syncStatus === "partial") {
    misalignment += 1;
  }
  if (osIntentPosture.cognitiveMisalignmentScore >= 4 || osIntentPosture.behaviorDriftScore >= 4) {
    misalignment += 1;
  }
  if (calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red") {
    misalignment += 3;
  } else if (calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange") {
    misalignment += 2;
  }
  if (
    calSnapshot.calHealth === "degraded" ||
    cbaSnapshot.cbaHealth === "degraded" ||
    amgSnapshot.amgHealth === "degraded" ||
    ucipSnapshot.ucipHealth === "degraded"
  ) {
    misalignment += 2;
  }
  return misalignment;
}

export function computeIhlMode(
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  intentContext = {},
) {
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing =
    (calMode === "align_red" && calSnapshot.calHealth === "degraded") ||
    (cbaMode === "behavior_red" && cbaSnapshot.cbaHealth === "degraded") ||
    (amgMode === "govern_red" && amgSnapshot.amgHealth === "degraded") ||
    (ucipMode === "red" && ucipSnapshot.ucipHealth === "degraded") ||
    !ucipSnapshot.ucipSignals ||
    !Object.keys(ucipSnapshot.ucipSignals || {}).length;
  if (signalsMissing) {
    return "intent_red";
  }
  const misalignment = computeIntentMisalignmentScore(intentContext, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  if (calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red" || misalignment >= 7) {
    return "intent_red";
  }
  if (calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange" || misalignment >= 5) {
    return "intent_orange";
  }
  if (calMode === "align_yellow" || cbaMode === "behavior_yellow" || amgMode === "govern_yellow" || ucipMode === "yellow" || misalignment >= 2) {
    return "intent_yellow";
  }
  return "intent_green";
}

export function deriveIhlHealth(mode) {
  if (mode === "intent_green") {
    return "healthy";
  }
  if (mode === "intent_red") {
    return "degraded";
  }
  return "advisory";
}

export function computeIhlScore(
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  mode = "intent_yellow",
  misalignment = 0,
) {
  const calScore = calSnapshot.calScore ?? calSnapshot.calState?.score ?? 20;
  const cbaScore = cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? 20;
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(calScore) + Number(cbaScore) + Number(amgScore) + Number(ucipScore)) / 4);
  const modePenalty = {
    intent_green: 0,
    intent_yellow: 4,
    intent_orange: 10,
    intent_red: 22,
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - misalignment * 2));
}

function buildIhlIntentFindings(mode, intentContext = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const findings = [];
  const { missionIntent, operatorIntent, marketplaceIntent, osIntentPosture } = intentContext;

  findings.push({
    id: "ihl-advisory-only",
    finding: "IHL evaluates intent harmonization only; it does not execute operator or system actions.",
    surface: "os",
    harmonized: true,
  });

  if (missionIntent.calMode === missionIntent.cbaMode?.replace("behavior_", "align_") || mode === "intent_green") {
    findings.push({
      id: "ihl-mission-cal-cba",
      finding: "Mission intent trajectory shows coherent CAL + CBA posture.",
      surface: "mission",
      harmonized: true,
    });
  } else {
    findings.push({
      id: "ihl-mission-mismatch",
      finding: `Mission intent mismatch: CAL ${missionIntent.calMode} vs CBA ${missionIntent.cbaMode}.`,
      surface: "mission",
      harmonized: false,
    });
  }

  if (calSnapshot.calState?.mode === "align_green" && mode === "intent_green") {
    findings.push({
      id: "ihl-cal-aligned",
      finding: "CAL cognitive alignment supports intent harmonization posture.",
      surface: "operator",
      harmonized: true,
    });
  }

  if (operatorIntent.governanceHealth === "online" && operatorIntent.pipelineHealth === "online") {
    findings.push({
      id: "ihl-operator-steady",
      finding: "Operator intent surfaces show steady governance and pipeline posture.",
      surface: "operator",
      harmonized: true,
    });
  }

  if (osIntentPosture.syncStatus === "aligned") {
    findings.push({
      id: "ihl-os-sync",
      finding: "OS intent posture: cross-division sync aligned with federation signals.",
      surface: "os",
      harmonized: true,
    });
  }

  if (marketplaceIntent.highRiskModules > 0) {
    findings.push({
      id: "ihl-marketplace-risk",
      finding: `${marketplaceIntent.highRiskModules} module(s) elevate marketplace intent conflict risk.`,
      surface: "marketplace",
      harmonized: marketplaceIntent.highRiskModules < 2,
    });
  }

  if ((amgSnapshot.amgRules || []).length) {
    findings.push({
      id: "ihl-amg-rules",
      finding: `AMG active with ${amgSnapshot.amgRules.length} governance rule(s) informing intent harmonization.`,
      surface: "operator",
      harmonized: amgSnapshot.amgState?.mode !== "govern_red",
    });
  }

  if (mode === "intent_red") {
    findings.push({
      id: "ihl-severe-conflict",
      finding: "Severe intent misalignment or degraded CAL/CBA/AMG/UCIP upstream signals.",
      surface: "os",
      harmonized: false,
    });
  }

  return findings.slice(0, 8);
}

function buildIhlIntentWarnings(mode, intentContext = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const warnings = [];
  const { missionIntent, operatorPosture, marketplaceIntent, osIntentPosture } = intentContext;
  const calWarnings = calSnapshot.calAlignmentWarnings || [];
  const cbaWarnings = cbaSnapshot.cbaBehaviorDriftWarnings || [];

  if (calWarnings.length) {
    warnings.push(...calWarnings.slice(0, 2).map((entry) => `CAL alignment: ${entry}`));
  }
  if (cbaWarnings.length) {
    warnings.push(...cbaWarnings.slice(0, 1).map((entry) => `CBA drift: ${entry}`));
  }
  if (missionIntent.calMode === "align_orange" && missionIntent.cbaMode === "behavior_green") {
    warnings.push("CAL align_orange conflicts with CBA behavior_green — intent harmonization mismatch.");
  }
  if (missionIntent.amgMode === "govern_green" && calSnapshot.calState?.mode === "align_orange") {
    warnings.push("AMG govern_green conflicts with CAL align_orange — review operator intent alignment.");
  }
  if (operatorPosture?.decision === "hold" && mode === "intent_green") {
    warnings.push("Decision posture HOLD conflicts with IHL intent_green — operator intent may diverge.");
  }
  if (osIntentPosture.syncStatus === "divergent" || osIntentPosture.syncStatus === "partial") {
    warnings.push(`OS sync drift (${osIntentPosture.syncStatus}) may indicate intent misalignment.`);
  }
  if (marketplaceIntent.calWarnings >= 2 || marketplaceIntent.cbaDriftWarnings >= 2) {
    warnings.push("Multiple CAL/CBA warnings affect marketplace intent posture.");
  }
  if (mode === "intent_red") {
    warnings.push("Severe intent misalignment or degraded CAL/CBA/AMG/UCIP signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant intent misalignment warnings at this time.");
  }
  return warnings.slice(0, 6);
}

function buildIhlOperatorIntentHints(mode, intentContext = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}) {
  const hints = (calSnapshot.calOperatorAlignmentHints || []).slice(0, 2);
  const cbaHints = (cbaSnapshot.cbaOperatorBehaviorHints || []).slice(0, 2);
  const nudges = (amgSnapshot.amgOperatorNudges || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : entry.nudge || "",
  );
  if (mode === "intent_green") {
    hints.push("Maintain current operator cadence; intent harmonized with UCIP + AMG + CBA + CAL.");
  } else if (mode === "intent_red") {
    hints.push("Pause promotion workflows; restore CAL/CBA/AMG/UCIP signals before changing operator intent.");
  } else if (mode === "intent_orange") {
    hints.push("Reduce concurrent operator actions; prioritize intent warnings on mission board.");
  } else {
    hints.push("Review mission UCIP/AMG/CBA/CAL strips before executing new operator intents.");
  }
  return [...new Set([...hints, ...cbaHints, ...nudges].filter(Boolean))].slice(0, 6);
}

function buildIhlSystemIntentHints(mode, intentContext = {}, ucipSnapshot = {}, amgSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}) {
  const hints = (calSnapshot.calSystemAlignmentHints || []).slice(0, 2);
  const cbaHints = (cbaSnapshot.cbaSystemBehaviorHints || []).slice(0, 1);
  const policyHints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`,
  );
  const { osIntentPosture } = intentContext;
  if (osIntentPosture.syncStatus !== "aligned") {
    hints.push(`OS sync posture: ${osIntentPosture.syncStatus} — reconcile intent harmonization across divisions.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP suggests: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "intent_red") {
    hints.push("System intent fallback: use minimal advisory payload until CAL/CBA/AMG/UCIP recover.");
  }
  return [...new Set([...hints, ...cbaHints, ...policyHints].filter(Boolean))].slice(0, 6);
}

export function buildCloudflareIhlFromCal(
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  intentContext = {},
) {
  const context = deriveIhlIntentContext(calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, intentContext);
  const misalignment = computeIntentMisalignmentScore(context, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const mode = computeIhlMode(calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const score = computeIhlScore(calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, mode, misalignment);
  const health = deriveIhlHealth(mode);
  const ihlIntentFindings = buildIhlIntentFindings(mode, context, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const ihlIntentWarnings = buildIhlIntentWarnings(mode, context, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const ihlOperatorIntentHints = buildIhlOperatorIntentHints(mode, context, calSnapshot, cbaSnapshot, amgSnapshot);
  const ihlSystemIntentHints = buildIhlSystemIntentHints(mode, context, ucipSnapshot, amgSnapshot, calSnapshot, cbaSnapshot);
  const ihlReasons = [
    `IHL mode: ${mode} (derived from CAL ${calSnapshot.calState?.mode || "align_yellow"} + CBA ${cbaSnapshot.cbaState?.mode || "behavior_yellow"} + AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Intent misalignment score: ${misalignment}.`,
    ...(calSnapshot.calReasons || []).slice(0, 1),
    ...(cbaSnapshot.cbaReasons || []).slice(0, 1),
    mode === "intent_red" && misalignment >= 7 ? "Severe intent misalignment or degraded upstream signals." : null,
  ].filter(Boolean);

  return {
    ihlState: { mode, score, health },
    ihlIntentFindings,
    ihlIntentWarnings,
    ihlOperatorIntentHints,
    ihlSystemIntentHints,
    ihlReasons,
    ihlHealth: health,
    ihlScore: score,
    intentMisalignmentScore: misalignment,
    calUpstream: {
      mode: calSnapshot.calState?.mode,
      score: calSnapshot.calScore ?? calSnapshot.calState?.score ?? null,
    },
    cbaUpstream: {
      mode: cbaSnapshot.cbaState?.mode,
      score: cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? null,
    },
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null,
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null,
    },
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function buildIhlIntentContextFromEnv(governance = {}, env = {}, options = {}) {
  return buildCalAlignmentContextFromEnv(governance, env, options);
}

export async function getCloudflareIhl(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || (await getCloudflareUcip(governance, env, options));
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const intentContext = options.intentContext || (await buildIhlIntentContextFromEnv(governance, env, options));
      const cba = options.cba || buildCloudflareCbaFromAmg(amg, ucip, intentContext);
      const cal = options.cal || buildCloudflareCalFromCba(cba, amg, ucip, intentContext);
      return buildCloudflareIhlFromCal(cal, cba, amg, ucip, intentContext);
    },
    "ihl",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) },
  );
}

export function buildCloudflareSafetyIhlFactor(ihlSnapshot = {}) {
  const state = ihlSnapshot.ihlState || ihlSnapshot;
  return {
    health: ihlSnapshot.ihlHealth || state.health || deriveIhlHealth(state.mode),
    score: ihlSnapshot.ihlScore ?? state.score ?? null,
    mode: state.mode || "intent_red",
    reasons: ihlSnapshot.ihlReasons || [],
    warningCount: (ihlSnapshot.ihlIntentWarnings || []).length,
    findingCount: (ihlSnapshot.ihlIntentFindings || []).length,
    advisoryOnly: true,
    checkedAt: ihlSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleIhlTag(ihlMode = "intent_yellow", moduleFields = {}) {
  const calTag = moduleFields.cloudflareCALTag || "";
  const cbaTag = moduleFields.cloudflareCBATag || "";
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (
    ihlMode === "intent_red" ||
    ihlMode === "intent_orange" ||
    moduleRisk === "high" ||
    calTag === "CAL_MISALIGNED" ||
    cbaTag === "CBA_RISK" ||
    amgTag === "AMG_CAUTION" ||
    ucipTag === "UCIP_RED"
  ) {
    return "IHL_CONFLICT";
  }
  if (
    ihlMode === "intent_yellow" ||
    moduleRisk === "medium" ||
    calTag === "CAL_PARTIAL" ||
    cbaTag === "CBA_DRIFT" ||
    amgTag === "AMG_REVIEW" ||
    ucipTag === "UCIP_ORANGE" ||
    ucipTag === "UCIP_YELLOW"
  ) {
    return "IHL_PARTIAL";
  }
  return "IHL_ALIGNED";
}

export function computeModuleIhlFields(ihlRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = ihlRuntime.ihlState?.mode || "intent_yellow";
  const tag = getModuleIhlTag(mode, moduleFields);
  const risk =
    tag === "IHL_CONFLICT" || moduleFields.cloudflareModuleRisk === "high"
      ? "high"
      : tag === "IHL_PARTIAL" || moduleFields.cloudflareModuleRisk === "medium"
        ? "medium"
        : "low";
  const highlight =
    tag === "IHL_CONFLICT" || (tag === "IHL_PARTIAL" && moduleFields.cloudflareCALHighlight);
  return {
    cloudflareIHLTag: tag,
    cloudflareIHLMode: mode,
    cloudflareIHLRisk: risk,
    cloudflareIHLHighlight: highlight,
    cloudflareIHLScore: ihlRuntime.ihlScore ?? ihlRuntime.ihlState?.score ?? null,
    cloudflareIHLModuleId: moduleId,
  };
}

export const IARL_MODES = ["resonance_green", "resonance_yellow", "resonance_orange", "resonance_red"];

function deriveIarlResonanceContext(
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  context = {},
) {
  const intentContext = deriveIhlIntentContext(calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const heartbeat = context.heartbeat || {};
  const missionActionTrajectory = {
    intendedUcip: intentContext.missionIntent?.ucipMode || heartbeat.cloudflareUCIPMode || "yellow",
    intendedIhl: ihlSnapshot.ihlState?.mode || heartbeat.cloudflareIHLMode || "intent_yellow",
    actualDecision: intentContext.operatorPosture?.decision || heartbeat.cloudflareDecision || "optional",
    pipelineHealth: heartbeat.pipelineEngineHealth || "idle",
    governanceHealth: heartbeat.governanceHealth || "optional",
  };
  const operatorActions = {
    intentCount: context.intentCount ?? 0,
    actionLogSignals: context.actionLogCount ?? 0,
    ihlWarnings: (ihlSnapshot.ihlIntentWarnings || []).length,
    calWarnings: (calSnapshot.calAlignmentWarnings || []).length,
    cbaDrift: (cbaSnapshot.cbaBehaviorDriftWarnings || []).length,
  };
  const marketplaceActionPosture = {
    ...intentContext.marketplaceIntent,
    highRiskModules: intentContext.marketplaceIntent?.highRiskModules ?? 0,
    moduleUsageDrift: context.moduleUsageDrift ?? 0,
  };
  const osActionPosture = {
    ...intentContext.osIntentPosture,
    automationLoops: intentContext.osIndicators?.automationLoops ?? 0,
    syncStatus: intentContext.osIndicators?.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial",
    executionHealth: intentContext.osIndicators?.executionHealth || heartbeat.cloudflareExecutionHealth || "optional",
    intentMisalignmentScore: ihlSnapshot.intentMisalignmentScore ?? 0,
  };
  return {
    ...intentContext,
    missionActionTrajectory,
    operatorActions,
    marketplaceActionPosture,
    osActionPosture,
    heartbeat,
  };
}

function computeResonanceMismatchScore(
  resonanceContext = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
) {
  let mismatch = 0;
  const { missionActionTrajectory, operatorPosture, operatorActions, marketplaceActionPosture, osActionPosture } = resonanceContext;
  const ihlMode = ihlSnapshot.ihlState?.mode || "intent_yellow";
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";

  if (ihlMode === "intent_green" && operatorPosture?.decision === "hold") {
    mismatch += 2;
  }
  if (ihlMode === "intent_red" && operatorPosture?.decision === "proceed") {
    mismatch += 2;
  }
  if (missionActionTrajectory.intendedIhl === "intent_green" && calMode === "align_orange") {
    mismatch += 2;
  }
  if (missionActionTrajectory.actualDecision === "proceed" && (ihlMode === "intent_orange" || ihlMode === "intent_red")) {
    mismatch += 2;
  }
  if (missionActionTrajectory.actualDecision === "caution" && ihlMode === "intent_green" && calMode === "align_green") {
    mismatch += 1;
  }
  if (operatorActions.ihlWarnings >= 2 && operatorActions.intentCount > 0) {
    mismatch += 1;
  }
  if (operatorActions.cbaDrift >= 2 && missionActionTrajectory.pipelineHealth === "online") {
    mismatch += 1;
  }
  if (osActionPosture.automationLoops >= 2 && ihlMode === "intent_green") {
    mismatch += 1;
  }
  if (osActionPosture.syncStatus === "divergent") {
    mismatch += 2;
  } else if (osActionPosture.syncStatus === "partial") {
    mismatch += 1;
  }
  if (marketplaceActionPosture.highRiskModules >= 2 && ihlMode === "intent_green") {
    mismatch += 1;
  }
  if (osActionPosture.intentMisalignmentScore >= 5) {
    mismatch += 1;
  }
  if (ihlMode === "intent_red" || calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red") {
    mismatch += 3;
  } else if (ihlMode === "intent_orange" || calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange") {
    mismatch += 2;
  }
  if (
    ihlSnapshot.ihlHealth === "degraded" ||
    calSnapshot.calHealth === "degraded" ||
    cbaSnapshot.cbaHealth === "degraded" ||
    amgSnapshot.amgHealth === "degraded" ||
    ucipSnapshot.ucipHealth === "degraded"
  ) {
    mismatch += 2;
  }
  return mismatch;
}

export function computeIarlMode(
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  resonanceContext = {},
) {
  const ihlMode = ihlSnapshot.ihlState?.mode || "intent_yellow";
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing =
    (ihlMode === "intent_red" && ihlSnapshot.ihlHealth === "degraded") ||
    (calMode === "align_red" && calSnapshot.calHealth === "degraded") ||
    (cbaMode === "behavior_red" && cbaSnapshot.cbaHealth === "degraded") ||
    (amgMode === "govern_red" && amgSnapshot.amgHealth === "degraded") ||
    (ucipMode === "red" && ucipSnapshot.ucipHealth === "degraded") ||
    !ucipSnapshot.ucipSignals ||
    !Object.keys(ucipSnapshot.ucipSignals || {}).length;
  if (signalsMissing) {
    return "resonance_red";
  }
  const mismatch = computeResonanceMismatchScore(resonanceContext, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  if (ihlMode === "intent_red" || calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red" || mismatch >= 8) {
    return "resonance_red";
  }
  if (ihlMode === "intent_orange" || calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange" || mismatch >= 6) {
    return "resonance_orange";
  }
  if (ihlMode === "intent_yellow" || calMode === "align_yellow" || cbaMode === "behavior_yellow" || amgMode === "govern_yellow" || ucipMode === "yellow" || mismatch >= 3) {
    return "resonance_yellow";
  }
  return "resonance_green";
}

export function deriveIarlHealth(mode) {
  if (mode === "resonance_green") {
    return "healthy";
  }
  if (mode === "resonance_red") {
    return "degraded";
  }
  return "advisory";
}

export function computeIarlScore(
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  mode = "resonance_yellow",
  mismatch = 0,
) {
  const ihlScore = ihlSnapshot.ihlScore ?? ihlSnapshot.ihlState?.score ?? 20;
  const calScore = calSnapshot.calScore ?? calSnapshot.calState?.score ?? 20;
  const cbaScore = cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? 20;
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(ihlScore) + Number(calScore) + Number(cbaScore) + Number(amgScore) + Number(ucipScore)) / 5);
  const modePenalty = {
    resonance_green: 0,
    resonance_yellow: 4,
    resonance_orange: 9,
    resonance_red: 20,
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - mismatch * 2));
}

function buildIarlResonanceFindings(
  mode,
  resonanceContext = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
) {
  const findings = [];
  const { missionActionTrajectory, operatorActions, marketplaceActionPosture, osActionPosture } = resonanceContext;

  findings.push({
    id: "iarl-advisory-only",
    finding: "IARL evaluates intent-to-action resonance only; it does not execute operator or system actions.",
    surface: "os",
    resonant: true,
  });

  if (missionActionTrajectory.intendedIhl === "intent_green" && missionActionTrajectory.actualDecision !== "hold") {
    findings.push({
      id: "iarl-mission-resonant",
      finding: "Mission intent trajectory resonates with operator decision posture.",
      surface: "mission",
      resonant: true,
    });
  } else if (missionActionTrajectory.actualDecision === "hold" && ihlSnapshot.ihlState?.mode === "intent_green") {
    findings.push({
      id: "iarl-mission-mismatch",
      finding: "Operator HOLD action conflicts with IHL intent_green — intent/action mismatch.",
      surface: "mission",
      resonant: false,
    });
  }

  if (ihlSnapshot.ihlState?.mode === "intent_green" && mode === "resonance_green") {
    findings.push({
      id: "iarl-ihl-resonant",
      finding: "IHL intent harmonization supports intent-to-action resonance.",
      surface: "operator",
      resonant: true,
    });
  }

  if (operatorActions.intentCount > 0 && operatorActions.ihlWarnings === 0) {
    findings.push({
      id: "iarl-operator-actions",
      finding: `${operatorActions.intentCount} operator intent signal(s) with no IHL warnings — actions appear resonant.`,
      surface: "operator",
      resonant: true,
    });
  }

  if (osActionPosture.syncStatus === "aligned") {
    findings.push({
      id: "iarl-os-sync",
      finding: "OS action posture: cross-division sync aligned with federation execution signals.",
      surface: "os",
      resonant: true,
    });
  }

  if (marketplaceActionPosture.highRiskModules > 0) {
    findings.push({
      id: "iarl-marketplace-usage",
      finding: `${marketplaceActionPosture.highRiskModules} high-risk module(s) may diverge from intended marketplace posture.`,
      surface: "marketplace",
      resonant: marketplaceActionPosture.highRiskModules < 2,
    });
  }

  if ((amgSnapshot.amgRules || []).length) {
    findings.push({
      id: "iarl-amg-rules",
      finding: `AMG active with ${amgSnapshot.amgRules.length} rule(s) informing action resonance.`,
      surface: "operator",
      resonant: amgSnapshot.amgState?.mode !== "govern_red",
    });
  }

  if (mode === "resonance_red") {
    findings.push({
      id: "iarl-severe-mismatch",
      finding: "Severe intent-to-action mismatch or degraded IHL/CAL/CBA/AMG/UCIP upstream signals.",
      surface: "os",
      resonant: false,
    });
  }

  return findings.slice(0, 8);
}

function buildIarlResonanceWarnings(
  mode,
  resonanceContext = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
) {
  const warnings = [];
  const { missionActionTrajectory, operatorPosture, operatorActions, osActionPosture } = resonanceContext;
  const ihlWarnings = ihlSnapshot.ihlIntentWarnings || [];
  const calWarnings = calSnapshot.calAlignmentWarnings || [];

  if (ihlWarnings.length) {
    warnings.push(...ihlWarnings.slice(0, 2).map((entry) => `IHL intent: ${entry}`));
  }
  if (calWarnings.length) {
    warnings.push(...calWarnings.slice(0, 1).map((entry) => `CAL alignment: ${entry}`));
  }
  if (missionActionTrajectory.actualDecision === "proceed" && ihlSnapshot.ihlState?.mode === "intent_orange") {
    warnings.push("Operator PROCEED conflicts with IHL intent_orange — action/intent resonance mismatch.");
  }
  if (missionActionTrajectory.actualDecision === "hold" && mode === "resonance_green") {
    warnings.push("Decision HOLD conflicts with IARL resonance_green — review operator action cadence.");
  }
  if (operatorPosture?.decision === "caution" && (cbaSnapshot.cbaState?.mode === "behavior_orange" || cbaSnapshot.cbaState?.mode === "behavior_red")) {
    warnings.push("CAUTION decision with elevated CBA behavioral drift — action may not match intent.");
  }
  if (osActionPosture.syncStatus === "divergent" || osActionPosture.syncStatus === "partial") {
    warnings.push(`OS sync drift (${osActionPosture.syncStatus}) may indicate action/intent resonance gap.`);
  }
  if (operatorActions.ihlWarnings >= 2 && operatorActions.intentCount > 0) {
    warnings.push("Operator actions active while IHL reports multiple intent warnings.");
  }
  if (mode === "resonance_red") {
    warnings.push("Severe intent-to-action mismatch or degraded upstream federation signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant intent-to-action resonance warnings at this time.");
  }
  return warnings.slice(0, 6);
}

function buildIarlOperatorResonanceHints(
  mode,
  resonanceContext = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
) {
  const hints = (ihlSnapshot.ihlOperatorIntentHints || []).slice(0, 2);
  const calHints = (calSnapshot.calOperatorAlignmentHints || []).slice(0, 2);
  const nudges = (amgSnapshot.amgOperatorNudges || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : entry.nudge || "",
  );
  if (mode === "resonance_green") {
    hints.push("Maintain current operator cadence; intent and actions resonate with IHL + CAL + CBA.");
  } else if (mode === "resonance_red") {
    hints.push("Pause new operator actions; restore IHL/CAL/CBA/AMG/UCIP signals before proceeding.");
  } else if (mode === "resonance_orange") {
    hints.push("Reduce concurrent operator actions; prioritize resonance warnings on mission board.");
  } else {
    hints.push("Review mission IHL/CAL/CBA strips before executing new operator actions.");
  }
  return [...new Set([...hints, ...calHints, ...nudges].filter(Boolean))].slice(0, 6);
}

function buildIarlSystemResonanceHints(
  mode,
  resonanceContext = {},
  ucipSnapshot = {},
  amgSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
) {
  const hints = (ihlSnapshot.ihlSystemIntentHints || []).slice(0, 2);
  const calHints = (calSnapshot.calSystemAlignmentHints || []).slice(0, 1);
  const policyHints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`,
  );
  const { osActionPosture } = resonanceContext;
  if (osActionPosture.syncStatus !== "aligned") {
    hints.push(`OS sync posture: ${osActionPosture.syncStatus} — reconcile action resonance across divisions.`);
  }
  if (osActionPosture.automationLoops > 0) {
    hints.push(`${osActionPosture.automationLoops} automation loop(s) active — verify actions match IHL intent.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP suggests: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "resonance_red") {
    hints.push("System resonance fallback: use minimal advisory payload until IHL/CAL/CBA/AMG/UCIP recover.");
  }
  return [...new Set([...hints, ...calHints, ...policyHints].filter(Boolean))].slice(0, 6);
}

export function buildCloudflareIarlFromIhl(
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  resonanceContext = {},
) {
  const context = deriveIarlResonanceContext(ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, resonanceContext);
  const mismatch = computeResonanceMismatchScore(context, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const mode = computeIarlMode(ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const score = computeIarlScore(ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, mode, mismatch);
  const health = deriveIarlHealth(mode);
  const iarlResonanceFindings = buildIarlResonanceFindings(mode, context, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const iarlResonanceWarnings = buildIarlResonanceWarnings(mode, context, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const iarlOperatorResonanceHints = buildIarlOperatorResonanceHints(mode, context, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot);
  const iarlSystemResonanceHints = buildIarlSystemResonanceHints(mode, context, ucipSnapshot, amgSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot);
  const iarlReasons = [
    `IARL mode: ${mode} (derived from IHL ${ihlSnapshot.ihlState?.mode || "intent_yellow"} + CAL ${calSnapshot.calState?.mode || "align_yellow"} + CBA ${cbaSnapshot.cbaState?.mode || "behavior_yellow"} + AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Resonance mismatch score: ${mismatch}.`,
    ...(ihlSnapshot.ihlReasons || []).slice(0, 1),
    ...(calSnapshot.calReasons || []).slice(0, 1),
    mode === "resonance_red" && mismatch >= 8 ? "Severe intent-to-action mismatch or degraded upstream signals." : null,
  ].filter(Boolean);

  return {
    iarlState: { mode, score, health },
    iarlResonanceFindings,
    iarlResonanceWarnings,
    iarlOperatorResonanceHints,
    iarlSystemResonanceHints,
    iarlReasons,
    iarlHealth: health,
    iarlScore: score,
    resonanceMismatchScore: mismatch,
    ihlUpstream: {
      mode: ihlSnapshot.ihlState?.mode,
      score: ihlSnapshot.ihlScore ?? ihlSnapshot.ihlState?.score ?? null,
    },
    calUpstream: {
      mode: calSnapshot.calState?.mode,
      score: calSnapshot.calScore ?? calSnapshot.calState?.score ?? null,
    },
    cbaUpstream: {
      mode: cbaSnapshot.cbaState?.mode,
      score: cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? null,
    },
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null,
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null,
    },
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function buildIarlResonanceContextFromEnv(governance = {}, env = {}, options = {}) {
  const intentContext = await buildIhlIntentContextFromEnv(governance, env, options);
  let actionLogCount = 0;
  if (env.AUDIT) {
    try {
      const audit = await env.AUDIT.list({ prefix: "operator-", limit: 20 });
      actionLogCount = audit.keys?.length ?? 0;
    } catch {
      actionLogCount = 0;
    }
  }
  return { ...intentContext, actionLogCount };
}

export async function getCloudflareIarl(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || (await getCloudflareUcip(governance, env, options));
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const resonanceContext = options.resonanceContext || (await buildIarlResonanceContextFromEnv(governance, env, options));
      const cba = options.cba || buildCloudflareCbaFromAmg(amg, ucip, resonanceContext);
      const cal = options.cal || buildCloudflareCalFromCba(cba, amg, ucip, resonanceContext);
      const ihl = options.ihl || buildCloudflareIhlFromCal(cal, cba, amg, ucip, resonanceContext);
      return buildCloudflareIarlFromIhl(ihl, cal, cba, amg, ucip, resonanceContext);
    },
    "iarl",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) },
  );
}

export function buildCloudflareSafetyIarlFactor(iarlSnapshot = {}) {
  const state = iarlSnapshot.iarlState || iarlSnapshot;
  return {
    health: iarlSnapshot.iarlHealth || state.health || deriveIarlHealth(state.mode),
    score: iarlSnapshot.iarlScore ?? state.score ?? null,
    mode: state.mode || "resonance_red",
    reasons: iarlSnapshot.iarlReasons || [],
    warningCount: (iarlSnapshot.iarlResonanceWarnings || []).length,
    findingCount: (iarlSnapshot.iarlResonanceFindings || []).length,
    advisoryOnly: true,
    checkedAt: iarlSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleIarlTag(iarlMode = "resonance_yellow", moduleFields = {}) {
  const ihlTag = moduleFields.cloudflareIHLTag || "";
  const calTag = moduleFields.cloudflareCALTag || "";
  const cbaTag = moduleFields.cloudflareCBATag || "";
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (
    iarlMode === "resonance_red" ||
    iarlMode === "resonance_orange" ||
    moduleRisk === "high" ||
    ihlTag === "IHL_CONFLICT" ||
    calTag === "CAL_MISALIGNED" ||
    cbaTag === "CBA_RISK" ||
    amgTag === "AMG_CAUTION" ||
    ucipTag === "UCIP_RED"
  ) {
    return "IARL_MISMATCH";
  }
  if (
    iarlMode === "resonance_yellow" ||
    moduleRisk === "medium" ||
    ihlTag === "IHL_PARTIAL" ||
    calTag === "CAL_PARTIAL" ||
    cbaTag === "CBA_DRIFT" ||
    amgTag === "AMG_REVIEW" ||
    ucipTag === "UCIP_ORANGE" ||
    ucipTag === "UCIP_YELLOW"
  ) {
    return "IARL_PARTIAL";
  }
  return "IARL_ALIGNED";
}

export function computeModuleIarlFields(iarlRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = iarlRuntime.iarlState?.mode || "resonance_yellow";
  const tag = getModuleIarlTag(mode, moduleFields);
  const risk =
    tag === "IARL_MISMATCH" || moduleFields.cloudflareModuleRisk === "high"
      ? "high"
      : tag === "IARL_PARTIAL" || moduleFields.cloudflareModuleRisk === "medium"
        ? "medium"
        : "low";
  const highlight =
    tag === "IARL_MISMATCH" || (tag === "IARL_PARTIAL" && moduleFields.cloudflareIHLHighlight);
  return {
    cloudflareIARLTag: tag,
    cloudflareIARLMode: mode,
    cloudflareIARLRisk: risk,
    cloudflareIARLHighlight: highlight,
    cloudflareIARLScore: iarlRuntime.iarlScore ?? iarlRuntime.iarlState?.score ?? null,
    cloudflareIARLModuleId: moduleId,
  };
}

export const ACL_MODES = ["coherence_green", "coherence_yellow", "coherence_orange", "coherence_red"];

function deriveAclCoherenceContext(
  iarlSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  context = {},
) {
  const resonanceContext = deriveIarlResonanceContext(ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const heartbeat = context.heartbeat || resonanceContext.heartbeat || {};
  const operatorCoherencePosture = {
    decision: resonanceContext.operatorPosture?.decision || heartbeat.cloudflareDecision || "optional",
    iarlMode: iarlSnapshot.iarlState?.mode || heartbeat.cloudflareIARLMode || "resonance_yellow",
    ihlMode: ihlSnapshot.ihlState?.mode || heartbeat.cloudflareIHLMode || "intent_yellow",
    intentCount: resonanceContext.operatorActions?.intentCount ?? context.intentCount ?? 0,
    resonanceWarnings: (iarlSnapshot.iarlResonanceWarnings || []).length,
    intentWarnings: (ihlSnapshot.ihlIntentWarnings || []).length,
  };
  const missionCoherencePosture = {
    ...resonanceContext.missionActionTrajectory,
    calMode: calSnapshot.calState?.mode || heartbeat.cloudflareCALMode || "align_yellow",
    executionHealth: resonanceContext.osActionPosture?.executionHealth || heartbeat.cloudflareExecutionHealth || "optional",
  };
  const marketplaceCoherencePosture = {
    ...resonanceContext.marketplaceActionPosture,
    highRiskModules: resonanceContext.marketplaceActionPosture?.highRiskModules ?? 0,
    moduleUsageDrift: context.moduleUsageDrift ?? 0,
  };
  const osCoherencePosture = {
    ...resonanceContext.osActionPosture,
    automationLoops: resonanceContext.osActionPosture?.automationLoops ?? 0,
    syncStatus: resonanceContext.osActionPosture?.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial",
    ucipMode: ucipSnapshot.ucipState?.mode || heartbeat.cloudflareUCIPMode || "yellow",
    amgMode: amgSnapshot.amgState?.mode || heartbeat.cloudflareAMGMode || "govern_yellow",
    fragmentationScore: iarlSnapshot.resonanceMismatchScore ?? 0,
  };
  return {
    ...resonanceContext,
    operatorCoherencePosture,
    missionCoherencePosture,
    marketplaceCoherencePosture,
    osCoherencePosture,
    heartbeat,
  };
}

function computeCoherenceFragmentationScore(
  coherenceContext = {},
  iarlSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
) {
  let fragmentation = 0;
  const { operatorCoherencePosture, missionCoherencePosture, marketplaceCoherencePosture, osCoherencePosture } = coherenceContext;
  const iarlMode = iarlSnapshot.iarlState?.mode || "resonance_yellow";
  const ihlMode = ihlSnapshot.ihlState?.mode || "intent_yellow";
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";

  const layerModes = [iarlMode, ihlMode, calMode, cbaMode, amgMode, ucipMode];
  const redCount = layerModes.filter((m) => m.includes("red") || m === "red").length;
  const orangeCount = layerModes.filter((m) => m.includes("orange") || m === "orange").length;
  fragmentation += redCount * 2;
  fragmentation += orangeCount;

  if (iarlMode === "resonance_green" && (ihlMode === "intent_orange" || ihlMode === "intent_red")) {
    fragmentation += 2;
  }
  if (ihlMode === "intent_green" && calMode === "align_orange") {
    fragmentation += 1;
  }
  if (operatorCoherencePosture.resonanceWarnings >= 2 && operatorCoherencePosture.intentWarnings >= 2) {
    fragmentation += 2;
  }
  if (missionCoherencePosture.actualDecision === "proceed" && (iarlMode === "resonance_orange" || iarlMode === "resonance_red")) {
    fragmentation += 2;
  }
  if (osCoherencePosture.syncStatus === "divergent") {
    fragmentation += 2;
  } else if (osCoherencePosture.syncStatus === "partial") {
    fragmentation += 1;
  }
  if (marketplaceCoherencePosture.highRiskModules >= 2 && iarlMode === "resonance_green") {
    fragmentation += 1;
  }
  if (osCoherencePosture.automationLoops >= 2) {
    fragmentation += 1;
  }
  if (
    iarlSnapshot.iarlHealth === "degraded" ||
    ihlSnapshot.ihlHealth === "degraded" ||
    calSnapshot.calHealth === "degraded" ||
    cbaSnapshot.cbaHealth === "degraded" ||
    amgSnapshot.amgHealth === "degraded" ||
    ucipSnapshot.ucipHealth === "degraded"
  ) {
    fragmentation += 3;
  }
  if (!ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length) {
    fragmentation += 2;
  }
  return fragmentation;
}

export function computeAclMode(
  iarlSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  coherenceContext = {},
) {
  const iarlMode = iarlSnapshot.iarlState?.mode || "resonance_yellow";
  const ihlMode = ihlSnapshot.ihlState?.mode || "intent_yellow";
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing =
    (iarlMode === "resonance_red" && iarlSnapshot.iarlHealth === "degraded") ||
    (ihlMode === "intent_red" && ihlSnapshot.ihlHealth === "degraded") ||
    (calMode === "align_red" && calSnapshot.calHealth === "degraded") ||
    (cbaMode === "behavior_red" && cbaSnapshot.cbaHealth === "degraded") ||
    (amgMode === "govern_red" && amgSnapshot.amgHealth === "degraded") ||
    (ucipMode === "red" && ucipSnapshot.ucipHealth === "degraded") ||
    !ucipSnapshot.ucipSignals ||
    !Object.keys(ucipSnapshot.ucipSignals || {}).length;
  if (signalsMissing) {
    return "coherence_red";
  }
  const fragmentation = computeCoherenceFragmentationScore(coherenceContext, iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  if (
    iarlMode === "resonance_red" ||
    ihlMode === "intent_red" ||
    calMode === "align_red" ||
    cbaMode === "behavior_red" ||
    amgMode === "govern_red" ||
    ucipMode === "red" ||
    fragmentation >= 10
  ) {
    return "coherence_red";
  }
  if (
    iarlMode === "resonance_orange" ||
    ihlMode === "intent_orange" ||
    calMode === "align_orange" ||
    cbaMode === "behavior_orange" ||
    amgMode === "govern_orange" ||
    ucipMode === "orange" ||
    fragmentation >= 7
  ) {
    return "coherence_orange";
  }
  if (
    iarlMode === "resonance_yellow" ||
    ihlMode === "intent_yellow" ||
    calMode === "align_yellow" ||
    cbaMode === "behavior_yellow" ||
    amgMode === "govern_yellow" ||
    ucipMode === "yellow" ||
    fragmentation >= 4
  ) {
    return "coherence_yellow";
  }
  return "coherence_green";
}

export function deriveAclHealth(mode) {
  if (mode === "coherence_green") {
    return "healthy";
  }
  if (mode === "coherence_red") {
    return "degraded";
  }
  return "advisory";
}

export function computeAclScore(
  iarlSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  mode = "coherence_yellow",
  fragmentation = 0,
) {
  const iarlScore = iarlSnapshot.iarlScore ?? iarlSnapshot.iarlState?.score ?? 20;
  const ihlScore = ihlSnapshot.ihlScore ?? ihlSnapshot.ihlState?.score ?? 20;
  const calScore = calSnapshot.calScore ?? calSnapshot.calState?.score ?? 20;
  const cbaScore = cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? 20;
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(iarlScore) + Number(ihlScore) + Number(calScore) + Number(cbaScore) + Number(amgScore) + Number(ucipScore)) / 6);
  const modePenalty = {
    coherence_green: 0,
    coherence_yellow: 4,
    coherence_orange: 9,
    coherence_red: 20,
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - fragmentation * 2));
}

function buildAclCoherenceFindings(
  mode,
  coherenceContext = {},
  iarlSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
) {
  const findings = [];
  const { operatorCoherencePosture, missionCoherencePosture, marketplaceCoherencePosture, osCoherencePosture } = coherenceContext;

  findings.push({
    id: "acl-advisory-only",
    finding: "ACL evaluates OS-wide coherence only; it does not execute operator or system actions.",
    surface: "os",
    coherent: true,
  });

  if (mode === "coherence_green") {
    findings.push({
      id: "acl-layers-aligned",
      finding: "IARL + IHL + CAL + CBA + AMG + UCIP layers show coherent alignment.",
      surface: "os",
      coherent: true,
    });
  }

  if (operatorCoherencePosture.iarlMode === "resonance_green" && operatorCoherencePosture.ihlMode === "intent_green") {
    findings.push({
      id: "acl-operator-coherent",
      finding: "Operator intent, action resonance, and harmonization are coherently aligned.",
      surface: "operator",
      coherent: true,
    });
  }

  if (missionCoherencePosture.executionHealth === "online" || missionCoherencePosture.pipelineHealth === "online") {
    findings.push({
      id: "acl-mission-execution",
      finding: "Mission trajectory and execution posture appear coherent with federation signals.",
      surface: "mission",
      coherent: mode !== "coherence_red",
    });
  }

  if (osCoherencePosture.syncStatus === "aligned") {
    findings.push({
      id: "acl-os-sync",
      finding: "OS cross-division sync aligned — system coherence supported.",
      surface: "os",
      coherent: true,
    });
  }

  if (marketplaceCoherencePosture.highRiskModules > 0) {
    findings.push({
      id: "acl-marketplace-mix",
      finding: `${marketplaceCoherencePosture.highRiskModules} high-risk module(s) may fragment marketplace coherence.`,
      surface: "marketplace",
      coherent: marketplaceCoherencePosture.highRiskModules < 2,
    });
  }

  if ((amgSnapshot.amgRules || []).length && amgSnapshot.amgState?.mode !== "govern_red") {
    findings.push({
      id: "acl-amg-governance",
      finding: `AMG governance (${amgSnapshot.amgRules.length} rule(s)) supports meta-intelligence coherence.`,
      surface: "operator",
      coherent: true,
    });
  }

  if (mode === "coherence_red") {
    findings.push({
      id: "acl-severe-fragmentation",
      finding: "Severe OS fragmentation or degraded IARL/IHL/CAL/CBA/AMG/UCIP upstream signals.",
      surface: "os",
      coherent: false,
    });
  }

  return findings.slice(0, 8);
}

function buildAclCoherenceWarnings(
  mode,
  coherenceContext = {},
  iarlSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
) {
  const warnings = [];
  const { operatorCoherencePosture, osCoherencePosture } = coherenceContext;
  const iarlWarnings = iarlSnapshot.iarlResonanceWarnings || [];
  const ihlWarnings = ihlSnapshot.ihlIntentWarnings || [];
  const calWarnings = calSnapshot.calAlignmentWarnings || [];

  if (iarlWarnings.length) {
    warnings.push(...iarlWarnings.slice(0, 2).map((entry) => `IARL resonance: ${entry}`));
  }
  if (ihlWarnings.length) {
    warnings.push(...ihlWarnings.slice(0, 1).map((entry) => `IHL intent: ${entry}`));
  }
  if (calWarnings.length) {
    warnings.push(...calWarnings.slice(0, 1).map((entry) => `CAL alignment: ${entry}`));
  }
  if (operatorCoherencePosture.iarlMode !== operatorCoherencePosture.ihlMode?.replace("intent_", "resonance_")) {
    if (operatorCoherencePosture.iarlMode === "resonance_green" && operatorCoherencePosture.ihlMode === "intent_orange") {
      warnings.push("IARL/IHL mode divergence — operator coherence fragmentation detected.");
    }
  }
  if (osCoherencePosture.syncStatus === "divergent" || osCoherencePosture.syncStatus === "partial") {
    warnings.push(`OS sync drift (${osCoherencePosture.syncStatus}) fragments cross-layer coherence.`);
  }
  if ((cbaSnapshot.cbaBehaviorDriftWarnings || []).length >= 2) {
    warnings.push("Elevated CBA behavioral drift warnings reduce OS coherence.");
  }
  if (mode === "coherence_red") {
    warnings.push("Severe OS fragmentation or degraded upstream federation signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant coherence warnings at this time.");
  }
  return warnings.slice(0, 6);
}

function buildAclOperatorCoherenceHints(
  mode,
  coherenceContext = {},
  iarlSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  amgSnapshot = {},
) {
  const hints = (iarlSnapshot.iarlOperatorResonanceHints || []).slice(0, 2);
  const ihlHints = (ihlSnapshot.ihlOperatorIntentHints || []).slice(0, 2);
  const calHints = (calSnapshot.calOperatorAlignmentHints || []).slice(0, 1);
  const nudges = (amgSnapshot.amgOperatorNudges || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : entry.nudge || "",
  );
  if (mode === "coherence_green") {
    hints.push("Maintain current operator cadence; all federation layers show coherent alignment.");
  } else if (mode === "coherence_red") {
    hints.push("Pause operator actions; restore IARL/IHL/CAL/CBA/AMG/UCIP before proceeding.");
  } else if (mode === "coherence_orange") {
    hints.push("Reduce concurrent actions; prioritize coherence warnings across mission strips.");
  } else {
    hints.push("Review mission IARL/IHL/CAL strips before new operator actions.");
  }
  return [...new Set([...hints, ...ihlHints, ...calHints, ...nudges].filter(Boolean))].slice(0, 6);
}

function buildAclSystemCoherenceHints(
  mode,
  coherenceContext = {},
  ucipSnapshot = {},
  amgSnapshot = {},
  iarlSnapshot = {},
  ihlSnapshot = {},
  cbaSnapshot = {},
) {
  const hints = (iarlSnapshot.iarlSystemResonanceHints || []).slice(0, 2);
  const ihlHints = (ihlSnapshot.ihlSystemIntentHints || []).slice(0, 1);
  const cbaHints = (cbaSnapshot.cbaSystemBehaviorHints || []).slice(0, 1);
  const policyHints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`,
  );
  const { osCoherencePosture } = coherenceContext;
  if (osCoherencePosture.syncStatus !== "aligned") {
    hints.push(`OS sync: ${osCoherencePosture.syncStatus} — reconcile coherence across divisions.`);
  }
  if (osCoherencePosture.automationLoops > 0) {
    hints.push(`${osCoherencePosture.automationLoops} automation loop(s) — verify layer coherence before promotion.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP meta-intelligence: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "coherence_red") {
    hints.push("ACL fallback: minimal advisory payload until IARL/IHL/CAL/CBA/AMG/UCIP recover.");
  }
  return [...new Set([...hints, ...ihlHints, ...cbaHints, ...policyHints].filter(Boolean))].slice(0, 6);
}

export function buildCloudflareAclFromIarl(
  iarlSnapshot = {},
  ihlSnapshot = {},
  calSnapshot = {},
  cbaSnapshot = {},
  amgSnapshot = {},
  ucipSnapshot = {},
  coherenceContext = {},
) {
  const context = deriveAclCoherenceContext(iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, coherenceContext);
  const fragmentation = computeCoherenceFragmentationScore(context, iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const mode = computeAclMode(iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const score = computeAclScore(iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, mode, fragmentation);
  const health = deriveAclHealth(mode);
  const aclCoherenceFindings = buildAclCoherenceFindings(mode, context, iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const aclCoherenceWarnings = buildAclCoherenceWarnings(mode, context, iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const aclOperatorCoherenceHints = buildAclOperatorCoherenceHints(mode, context, iarlSnapshot, ihlSnapshot, calSnapshot, amgSnapshot);
  const aclSystemCoherenceHints = buildAclSystemCoherenceHints(mode, context, ucipSnapshot, amgSnapshot, iarlSnapshot, ihlSnapshot, cbaSnapshot);
  const aclReasons = [
    `ACL mode: ${mode} (derived from IARL ${iarlSnapshot.iarlState?.mode || "resonance_yellow"} + IHL ${ihlSnapshot.ihlState?.mode || "intent_yellow"} + CAL ${calSnapshot.calState?.mode || "align_yellow"} + CBA ${cbaSnapshot.cbaState?.mode || "behavior_yellow"} + AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Coherence fragmentation score: ${fragmentation}.`,
    ...(iarlSnapshot.iarlReasons || []).slice(0, 1),
    ...(ihlSnapshot.ihlReasons || []).slice(0, 1),
    mode === "coherence_red" && fragmentation >= 10 ? "Severe OS fragmentation or degraded upstream signals." : null,
  ].filter(Boolean);

  return {
    aclState: { mode, score, health },
    aclCoherenceFindings,
    aclCoherenceWarnings,
    aclOperatorCoherenceHints,
    aclSystemCoherenceHints,
    aclReasons,
    aclHealth: health,
    aclScore: score,
    coherenceFragmentationScore: fragmentation,
    iarlUpstream: {
      mode: iarlSnapshot.iarlState?.mode,
      score: iarlSnapshot.iarlScore ?? iarlSnapshot.iarlState?.score ?? null,
    },
    ihlUpstream: {
      mode: ihlSnapshot.ihlState?.mode,
      score: ihlSnapshot.ihlScore ?? ihlSnapshot.ihlState?.score ?? null,
    },
    calUpstream: {
      mode: calSnapshot.calState?.mode,
      score: calSnapshot.calScore ?? calSnapshot.calState?.score ?? null,
    },
    cbaUpstream: {
      mode: cbaSnapshot.cbaState?.mode,
      score: cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? null,
    },
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null,
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null,
    },
    advisoryOnly: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function buildAclCoherenceContextFromEnv(governance = {}, env = {}, options = {}) {
  return buildIarlResonanceContextFromEnv(governance, env, options);
}

export async function getCloudflareAcl(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || (await getCloudflareUcip(governance, env, options));
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const coherenceContext = options.coherenceContext || (await buildAclCoherenceContextFromEnv(governance, env, options));
      const cba = options.cba || buildCloudflareCbaFromAmg(amg, ucip, coherenceContext);
      const cal = options.cal || buildCloudflareCalFromCba(cba, amg, ucip, coherenceContext);
      const ihl = options.ihl || buildCloudflareIhlFromCal(cal, cba, amg, ucip, coherenceContext);
      const iarl = options.iarl || buildCloudflareIarlFromIhl(ihl, cal, cba, amg, ucip, coherenceContext);
      return buildCloudflareAclFromIarl(iarl, ihl, cal, cba, amg, ucip, coherenceContext);
    },
    "acl",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) },
  );
}

export function buildCloudflareSafetyAclFactor(aclSnapshot = {}) {
  const state = aclSnapshot.aclState || aclSnapshot;
  return {
    health: aclSnapshot.aclHealth || state.health || deriveAclHealth(state.mode),
    score: aclSnapshot.aclScore ?? state.score ?? null,
    mode: state.mode || "coherence_red",
    reasons: aclSnapshot.aclReasons || [],
    warningCount: (aclSnapshot.aclCoherenceWarnings || []).length,
    findingCount: (aclSnapshot.aclCoherenceFindings || []).length,
    advisoryOnly: true,
    checkedAt: aclSnapshot.checkedAt || new Date().toISOString(),
  };
}

export function getModuleAclTag(aclMode = "coherence_yellow", moduleFields = {}) {
  const iarlTag = moduleFields.cloudflareIARLTag || "";
  const ihlTag = moduleFields.cloudflareIHLTag || "";
  const calTag = moduleFields.cloudflareCALTag || "";
  const cbaTag = moduleFields.cloudflareCBATag || "";
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (
    aclMode === "coherence_red" ||
    aclMode === "coherence_orange" ||
    moduleRisk === "high" ||
    iarlTag === "IARL_MISMATCH" ||
    ihlTag === "IHL_CONFLICT" ||
    calTag === "CAL_MISALIGNED" ||
    cbaTag === "CBA_RISK" ||
    amgTag === "AMG_CAUTION" ||
    ucipTag === "UCIP_RED"
  ) {
    return "ACL_FRAGMENTED";
  }
  if (
    aclMode === "coherence_yellow" ||
    moduleRisk === "medium" ||
    iarlTag === "IARL_PARTIAL" ||
    ihlTag === "IHL_PARTIAL" ||
    calTag === "CAL_PARTIAL" ||
    cbaTag === "CBA_DRIFT" ||
    amgTag === "AMG_REVIEW" ||
    ucipTag === "UCIP_ORANGE" ||
    ucipTag === "UCIP_YELLOW"
  ) {
    return "ACL_PARTIAL";
  }
  return "ACL_ALIGNED";
}

export function computeModuleAclFields(aclRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = aclRuntime.aclState?.mode || "coherence_yellow";
  const tag = getModuleAclTag(mode, moduleFields);
  const risk =
    tag === "ACL_FRAGMENTED" || moduleFields.cloudflareModuleRisk === "high"
      ? "high"
      : tag === "ACL_PARTIAL" || moduleFields.cloudflareModuleRisk === "medium"
        ? "medium"
        : "low";
  const highlight =
    tag === "ACL_FRAGMENTED" || (tag === "ACL_PARTIAL" && moduleFields.cloudflareIARLHighlight);
  return {
    cloudflareACLTag: tag,
    cloudflareACLMode: mode,
    cloudflareACLRisk: risk,
    cloudflareACLHighlight: highlight,
    cloudflareACLScore: aclRuntime.aclScore ?? aclRuntime.aclState?.score ?? null,
    cloudflareACLModuleId: moduleId,
  };
}
