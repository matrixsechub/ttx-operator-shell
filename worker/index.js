import store from "./data/store.js";
import contracts from "./data/contracts.js";
import validators from "./data/validate.js";
import serviceSelector from "./data/serviceSelector.js";
import auditLite from "./data/auditLite.js";
import promptInjectionScanner from "./data/promptInjectionScanner.js";
import agentReadinessChecker from "./data/agentReadinessChecker.js";
import automationRoiCalculator from "./data/automationRoiCalculator.js";
import ragRiskAnalyzer from "./data/ragRiskAnalyzer.js";
import intakeAgent from "./agents/intakeAgent.js";
import securityIntakeAgent from "./agents/securityIntakeAgent.js";
import cloudflareSecurityAudit from "./data/cloudflareSecurityAudit.js";
import handleDoctrineRequest from "./doctrine/index.js";
import { INTAKE_DEMO_MODE_MESSAGE, isIntakeDemoMode } from "./data/intakeDemoMode.js";
import publicRegister from "./data/publicRegister.js";
import {
  collectAutonomousSignalInputs,
  buildAutonomousGovernanceSignals,
  buildCloudflareAdaptiveFromSignals,
  buildCloudflarePredictiveFromSignals,
  buildCloudflareStrategicFromSignals,
  buildCloudflareUcipFromSignals,
  buildCloudflareAmgFromUcip,
  buildCloudflareCbaFromAmg,
  buildCloudflareCalFromCba,
  buildCloudflareIhlFromCal,
  buildCloudflareIarlFromIhl,
  buildCloudflareAclFromIarl,
  buildCalAlignmentContextFromEnv,
  buildCloudflareSafetyAdaptiveFactor,
  buildCloudflareSafetyPredictiveFactor,
  buildCloudflareSafetyStrategicFactor,
  buildCloudflareSafetyAutomationFactor,
  buildCloudflareSafetyCertificationFactor,
  buildCloudflareSafetyCrossDivisionFactor,
  buildCloudflareSafetyExecutionFactor,
  buildCloudflareSafetyOrchestrationFactor,
  certifyModuleForCloudflare,
  computeModuleCrossDivisionSync,
  computeModuleExecutionFields,
  computeModuleOrchestrationFields,
  computeModuleAdaptiveFields,
  computeModulePredictiveFields,
  computeModuleStrategicFields,
  computeModuleUcipFields,
  computeModuleAmgFields,
  computeModuleCbaFields,
  computeModuleCalFields,
  computeModuleIhlFields,
  computeModuleIarlFields,
  computeModuleAclFields,
  deriveAutonomousHealth,
  deriveAutomationHealth,
  deriveCertificationHealth,
  deriveDecisionHealth,
  deriveEventsHealth,
  deriveInsightsHealth,
  evaluateCloudflareSafetyFactor,
  getCloudflareAdaptiveRuntime,
  getCloudflarePredictiveModeling,
  getCloudflareStrategicPlanning,
  getCloudflareUcip,
  getCloudflareAmg,
  getCloudflareCba,
  getCloudflareCal,
  getCloudflareIhl,
  getCloudflareIarl,
  getCloudflareAcl,
  buildCloudflareSafetyUcipFactor,
  buildCloudflareSafetyAmgFactor,
  buildCloudflareSafetyCbaFactor,
  buildCloudflareSafetyCalFactor,
  buildCloudflareSafetyIhlFactor,
  buildCloudflareSafetyIarlFactor,
  buildCloudflareSafetyAclFactor,
  getCloudflareActionHealthSummary,
  getCloudflareActionsHealth,
  getCloudflareApiReachability,
  getCloudflareAutonomousSnapshot,
  getCloudflareAutomationLoops,
  getCloudflareBindingHealth,
  getCloudflareBindingsInspection,
  getCloudflareBuildPreview,
  getCloudflareBuildStatus,
  getCloudflareCrossDivisionFederation,
  getCloudflareCrossDivisionSync,
  getCloudflareDecision,
  getCloudflareFederationActions,
  getCloudflareFederationHeartbeat,
  getCloudflareFederationReadiness,
  getCloudflareFederationSnapshot,
  getCloudflareGovernanceHealth,
  getCloudflareGovernanceDecisioning,
  getCloudflareGovernanceSignals,
  getCloudflareHeartbeatDeep,
  getCloudflareIdentityFederation,
  getCloudflareInsights,
  getCloudflareExecution,
  getCloudflareExecutionSignals,
  getCloudflareOrchestration,
  getCloudflareAgentSignals,
  getCloudflarePipelineExecutionFields,
  getCloudflarePipelineOrchestrationFields,
  getCloudflareIntegrationSnapshot,
  getCloudflarePipelineDecision,
  getCloudflareSafetySnapshot,
  getExpandedFederationScore,
  getModuleCloudflareDecisionFields,
  simulateCloudflareEventHooks,
  getCloudflareLogs,
  getCloudflareMetrics,
  getCloudflareMcpMetadata,
  getCloudflareVersionHealth,
  getDocsQuickActions,
  getMarketplaceCfMetadata,
  getMarketplaceCloudflareCertification,
  getModuleCfCompatibility,
  getOperatorMarketplaceCrossDivisionFields,
  postFetchCloudflareLogs,
  postFetchCloudflareMetrics,
  postQueryCloudflareDocs,
  postRunCloudflareBuild,
  postValidateCloudflareBindings,
  postValidateCloudflareBindingsAction,
  runCloudflareBuild,
  searchCloudflareDocs,
  validateCloudflareBindings,
} from "./cloudflare-integration.js";
import {
  ADVISORY_CACHE_TTL_MS,
  ADVISORY_HEAVY_TIMEOUT_MS,
  ADVISORY_TIMEOUT_MS,
  buildCloudflareAdvisoryFallback,
  buildAdvisoryHeartbeatFallback,
  buildCloudflareCatalogFederationBlock,
  buildCloudflareHeartbeatFields,
  buildCloudflareVersionHealthFallback,
  flattenCloudflareVersionHealthResponse,
  getCloudflareFederationDocumentation,
  getCloudflareFederationRouteCatalog,
  normalizeCrossDivisionFields,
  resolveCloudflareAdvisoryCall,
  resolveCloudflareFederationRoute,
} from "./cloudflare-federation-utils.js";

const META_CLOUDFLARE_ADVISORY_DOMAINS = new Set(["ucip", "amg", "cba", "cal", "ihl", "iarl", "acl"]);

async function resolveMetaIntelligenceStack(governance, env, inputs = {}, cacheSuffix = "default") {
  const { cloudflareUcip, moduleIds, heartbeat } = inputs;
  const resolved = await resolveCloudflareAdvisoryCall(
    async () => {
      const alignmentContext = await buildCalAlignmentContextFromEnv(governance, env, {
        moduleIds: moduleIds || modules.map((entry) => entry.id),
        heartbeat,
      });
      const cloudflareAmg = buildCloudflareAmgFromUcip(cloudflareUcip);
      const cloudflareCba = buildCloudflareCbaFromAmg(cloudflareAmg, cloudflareUcip, alignmentContext);
      const cloudflareCal = buildCloudflareCalFromCba(cloudflareCba, cloudflareAmg, cloudflareUcip, alignmentContext);
      const cloudflareIhl = buildCloudflareIhlFromCal(cloudflareCal, cloudflareCba, cloudflareAmg, cloudflareUcip, alignmentContext);
      const cloudflareIarl = buildCloudflareIarlFromIhl(cloudflareIhl, cloudflareCal, cloudflareCba, cloudflareAmg, cloudflareUcip, alignmentContext);
      const cloudflareAcl = buildCloudflareAclFromIarl(cloudflareIarl, cloudflareIhl, cloudflareCal, cloudflareCba, cloudflareAmg, cloudflareUcip, alignmentContext);
      return { cloudflareAmg, cloudflareCba, cloudflareCal, cloudflareIhl, cloudflareIarl, cloudflareAcl };
    },
    "meta-stack",
    { cacheKeySuffix: cacheSuffix, timeoutMs: ADVISORY_HEAVY_TIMEOUT_MS },
  );
  return resolved;
}

const {
  moduleRegistry,
  modules,
  packages,
  deliverables,
  deliverableDownloads,
  engagements,
  identities,
  createId,
  createIdentityId,
  getModuleRoute,
  getModuleStaticPath,
} = store;
const { deploymentReference } = contracts;
const { validateIdentityRecord } = validators;
const {
  serviceCatalog,
  normalizeSelectorAnswers,
  computeServiceSelectorResult,
  recordServiceSelectorSubmission,
  attachEngagementToSelector,
  listServiceIntakeQueue,
  getServiceSelectorSubmission,
  getEngagementById,
  persistIntakeAgentRecord,
  persistSecurityIntakeRecord,
  updateServiceIntakeStatus,
  serviceMarketplaceModules,
} = serviceSelector;
const {
  auditLiteMarketplaceModule,
  normalizeAuditLiteAnswers,
  computeAuditLiteResult,
  recordAuditLiteSubmission,
  attachEngagementToAuditLite,
  getAuditLiteLifecycle,
  getAuditLiteOperatorSnapshot,
  getAuditLiteMarketplaceSummary,
} = auditLite;
const {
  publicRegisterMarketplaceModule,
  normalizePublicRegisterAnswers,
  computePublicRegisterResult,
  recordPublicRegisterSubmission,
  getPublicRegisterLifecycle,
  getPublicRegisterSecurityPlane,
  getPublicRegisterQueuePreview,
  getPublicRegisterOperatorSnapshot,
  getPublicRegisterMarketplaceSummary,
  buildPublicRegisterMarketplacePayload,
} = publicRegister;
const {
  promptInjectionMarketplaceModule,
  normalizePromptInjectionAnswers,
  computePromptInjectionResult,
  recordPromptInjectionSubmission,
  attachEngagementToPromptInjectionScan,
  listPromptInjectionScanQueue,
} = promptInjectionScanner;
const {
  agentReadinessMarketplaceModule,
  normalizeAgentReadinessAnswers,
  computeAgentReadinessResult,
  recordAgentReadinessSubmission,
  attachEngagementToAgentReadiness,
  listAgentReadinessQueue,
} = agentReadinessChecker;
const {
  automationRoiMarketplaceModule,
  normalizeAutomationRoiAnswers,
  computeAutomationRoiResult,
  recordAutomationRoiSubmission,
  attachEngagementToAutomationRoi,
  listAutomationRoiQueue,
} = automationRoiCalculator;
const {
  ragRiskMarketplaceModule,
  normalizeRagRiskAnswers,
  computeRagRiskResult,
  recordRagRiskSubmission,
  attachEngagementToRagRisk,
  listRagRiskQueue,
} = ragRiskAnalyzer;
const {
  isOperatorSurfaceRequest,
  startSecurityAudit,
  applySecurityAuditWebhook,
} = cloudflareSecurityAudit;

const DEFAULT_HEADERS = { ...deploymentReference.headers };
const STORE_CONFIG = {
  PAYLOADS: { envKey: "PAYLOADS", indexKey: "payload:index", prefix: "payload", limit: 250 },
  ESCALATIONS: { envKey: "ESCALATIONS", indexKey: "escalation:index", prefix: "escalation", limit: 250 },
  MODULES: { envKey: "MODULES", indexKey: "module:index", prefix: "module", limit: 250 },
  ROUTING_LOGS: { envKey: "ROUTING_LOGS", indexKey: "routing:index", prefix: "routing", limit: 500 },
  SEARCH_LOGS: { envKey: "SEARCH_LOGS", indexKey: "search:index", prefix: "search", limit: 250 },
  EVENTS: { envKey: "EVENTS", indexKey: "event:index", prefix: "event", limit: 500 },
  AUTONOMY_LOGS: { envKey: "AUTONOMY_LOGS", indexKey: "autonomy:index", prefix: "autonomy", limit: 250 },
  ECOSYSTEM: { envKey: "ECOSYSTEM", indexKey: "ecosystem:index", prefix: "ecosystem", limit: 100 },
  NOTIFICATIONS: { envKey: "NOTIFICATIONS", indexKey: "notification:index", prefix: "notification", limit: 250 },
  AUDIT: { envKey: "AUDIT", indexKey: "audit:index", prefix: "audit", limit: 500 },
  SCENARIOS: { envKey: "SCENARIOS", indexKey: "scenario:index", prefix: "scenario", limit: 100 },
  HEARTBEAT: { envKey: "HEARTBEAT", indexKey: "heartbeat:index", prefix: "heartbeat", limit: 20 },
  OS_ROUTING: { envKey: "OS_ROUTING", indexKey: "os-routing:index", prefix: "os-routing", limit: 250 },
  DIVISION_MEMORY: { envKey: "DIVISION_MEMORY", indexKey: "division-memory:index", prefix: "division-memory", limit: 500 },
  OPERATOR_INTENTS: { envKey: "OPERATOR_INTENTS", indexKey: "operator-intent:index", prefix: "operator-intent", limit: 250 },
  PIPELINES: { envKey: "PIPELINES", indexKey: "pipeline:index", prefix: "pipeline", limit: 250 },
  SANDBOX_LOGS: { envKey: "SANDBOX_LOGS", indexKey: "sandbox:index", prefix: "sandbox", limit: 250 },
  OS_CONFIG: { envKey: "OS_CONFIG", indexKey: "os-config:index", prefix: "os-config", limit: 100 },
  PUBLIC_SCENARIOS: { envKey: "PUBLIC_SCENARIOS", indexKey: "public-scenario:index", prefix: "public-scenario", limit: 100 },
  GOVERNANCE: { envKey: "GOVERNANCE", indexKey: "governance:index", prefix: "governance", limit: 250 },
  RELEASES: { envKey: "RELEASES", indexKey: "release:index", prefix: "release", limit: 250 },
  INTEGRATIONS: { envKey: "INTEGRATIONS", indexKey: "integration:index", prefix: "integration", limit: 250 },
  CERTIFICATION: { envKey: "CERTIFICATION", indexKey: "certification:index", prefix: "certification", limit: 250 },
};
const MEMORY_DATA = Object.fromEntries(Object.keys(STORE_CONFIG).map((key) => [key, new Map()]));
const MEMORY_INDEX = Object.fromEntries(Object.keys(STORE_CONFIG).map((key) => [key, []]));
const AGENTS = ["route-advisory", "payload-generator", "operator-sentinel", "marketplace-sync"];

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const redirectRule = getRedirect(url.pathname);

      if (redirectRule) {
        return redirect(redirectRule.location, redirectRule.status);
      }

      if (url.pathname.startsWith("/doctrine/")) {
        return handleDoctrineRequest(request, env, url);
      }

      if (url.pathname === "/marketplace/ecosystem") {
        return json(await computeEcosystemData(env));
      }

      if (url.pathname === "/marketplace/search") {
        return handleMarketplaceSearch(request, env, url, true);
      }

      if (url.pathname === "/" || url.pathname === "/index.html") {
        return serveStatic(request, env, "/index.html");
      }

      if (url.pathname === "/services" || url.pathname === "/services/") {
        return serveStatic(request, env, "/services.html");
      }

      if (url.pathname === "/apps/ai-security-audit" || url.pathname === "/apps/ai-security-audit/") {
        return serveStatic(request, env, "/ai-security-audit.html");
      }

      if (url.pathname === "/apps/prompt-injection-scanner" || url.pathname === "/apps/prompt-injection-scanner/") {
        return serveStatic(request, env, "/prompt-injection-scanner.html");
      }

      if (url.pathname === "/apps/ai-agent-readiness-checker" || url.pathname === "/apps/ai-agent-readiness-checker/") {
        return serveStatic(request, env, "/ai-agent-readiness-checker.html");
      }

      if (url.pathname === "/apps/automation-roi-calculator" || url.pathname === "/apps/automation-roi-calculator/") {
        return serveStatic(request, env, "/automation-roi-calculator.html");
      }

      if (url.pathname === "/apps/rag-risk-analyzer" || url.pathname === "/apps/rag-risk-analyzer/") {
        return serveStatic(request, env, "/rag-risk-analyzer.html");
      }

      if (url.pathname === "/operator" || url.pathname === "/operator/") {
        return serveStatic(request, env, "/operator.html");
      }

      if (url.pathname === "/operator/service-intake" || url.pathname === "/operator/service-intake/") {
        return serveStatic(request, env, "/service-intake.html");
      }

      if (url.pathname === "/operator/audit-lite" || url.pathname === "/operator/audit-lite/") {
        return serveStatic(request, env, "/audit-lite-operator.html");
      }

      if (url.pathname === "/operator/register-intake" || url.pathname === "/operator/register-intake/") {
        return serveStatic(request, env, "/operator/register-intake.html");
      }

      if (url.pathname === "/operator/prompt-injection-scans" || url.pathname === "/operator/prompt-injection-scans/") {
        return serveStatic(request, env, "/prompt-injection-scans-operator.html");
      }

      if (url.pathname === "/operator/agent-readiness" || url.pathname === "/operator/agent-readiness/") {
        return serveStatic(request, env, "/agent-readiness-operator.html");
      }

      if (url.pathname === "/operator/automation-roi" || url.pathname === "/operator/automation-roi/") {
        return serveStatic(request, env, "/automation-roi-operator.html");
      }

      if (url.pathname === "/operator/rag-risk" || url.pathname === "/operator/rag-risk/") {
        return serveStatic(request, env, "/rag-risk-operator.html");
      }

      if (url.pathname === "/operator/agents/intake" || url.pathname === "/operator/agents/intake/") {
        return serveStatic(request, env, "/operator-agents-intake.html");
      }

      if (url.pathname === "/operator/agents/security-intake" || url.pathname === "/operator/agents/security-intake/") {
        return serveStatic(request, env, "/operator-agents-security-intake.html");
      }

      if (url.pathname === "/enter" || url.pathname === "/enter/") {
        return serveStatic(request, env, "/enter.html");
      }

      if (url.pathname === "/register" || url.pathname === "/register/") {
        return serveStatic(request, env, "/register.html");
      }

      if (url.pathname === "/marketplace" || url.pathname === "/marketplace/") {
        const wantsJson =
          url.searchParams.get("format") === "json" ||
          (request.headers.get("accept") || "").includes("application/json");
        if (!wantsJson) {
          return serveStatic(request, env, "/marketplace.html");
        }
        return handleMarketplaceIndex(request, env, url);
      }

      if (url.pathname === "/api-explorer" || url.pathname === "/api-explorer/") {
        return serveStatic(request, env, "/api-explorer.html");
      }

      const dynamicModuleMatch = url.pathname.match(/^\/marketplace\/([a-z0-9-]+)$/);
      if (dynamicModuleMatch) {
        return renderDynamicModulePage(env, dynamicModuleMatch[1]);
      }

      if (url.pathname.startsWith("/api/")) {
        return handleApi(request, env, url);
      }

      return serveStatic(request, env, url.pathname);
    } catch (error) {
      const url = new URL(request.url);
      const isApi = url.pathname.startsWith("/api/");
      const message = error instanceof Error ? error.message : "Unexpected worker error";
      console.error("worker-fetch-failed", request.method, url.pathname, message);
      if (isApi) {
        return json({ error: "Worker request failed", message }, 500, { "Cache-Control": "no-store" });
      }
      return html(
        `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>MSHOPS.NET | Worker Error</title></head><body><main><h1>Temporary Worker Error</h1><p>The request could not be completed in the Worker runtime.</p></main></body></html>`,
        500,
        { "Cache-Control": "no-store" },
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const actions = await runAutonomyLoopV2(env, event.cron);
        await updateHeartbeatSnapshot(env, {
          lastAutonomyLoopRun: new Date().toISOString(),
          autonomyActionCount: actions.length,
          cron: event.cron,
        });
        const osHeartbeat = await computeOsHeartbeat(env);
        await putRecord(env, "HEARTBEAT", "os-heartbeat", {
          id: "os-heartbeat",
          updatedAt: new Date().toISOString(),
          ...osHeartbeat,
        });
      })(),
    );
  },
};

function getRedirect(pathname) {
  if (pathname === "/home") {
    return { status: 301, location: deploymentReference.redirects["/home"] };
  }

  if (pathname === "/book") {
    return { status: 302, location: deploymentReference.redirects["/book"] };
  }

  if (pathname === "/report") {
    return { status: 302, location: deploymentReference.redirects["/report"] };
  }

  return null;
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

async function jsonCloudflareRoute(handler, domain, options = {}) {
  try {
    const advisoryOptions = META_CLOUDFLARE_ADVISORY_DOMAINS.has(domain)
      ? { timeoutMs: ADVISORY_HEAVY_TIMEOUT_MS, cacheTtlMs: ADVISORY_CACHE_TTL_MS, ...options }
      : { timeoutMs: ADVISORY_TIMEOUT_MS, cacheTtlMs: ADVISORY_CACHE_TTL_MS, ...options };
    const payload = META_CLOUDFLARE_ADVISORY_DOMAINS.has(domain)
      ? await handler()
      : await resolveCloudflareFederationRoute(handler, domain, advisoryOptions);
    return json({
      ...(payload || {}),
      advisoryOnly: payload?.advisoryOnly !== false,
    });
  } catch (error) {
    return json(buildCloudflareAdvisoryFallback(domain, error));
  }
}

function html(payload, status = 200, headers = {}) {
  return new Response(payload, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      ...headers,
    },
  });
}

function text(payload, status = 200, headers = {}) {
  return new Response(payload, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      ...headers,
    },
  });
}

function redirect(location, status) {
  return new Response(null, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      Location: location,
    },
  });
}

function notFound() {
  return json({ error: "Not found" }, 404);
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullable(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeAnnotationPayload(payload) {
  return {
    annotation: normalizeText(payload.annotation || payload.note),
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return table[character];
  });
}

function resolveStaticPath(requestPath) {
  const normalizedRequestPath = String(requestPath || "/").replace(/\\/g, "/");
  if (normalizedRequestPath === "/" || normalizedRequestPath === "/index.html") {
    return "/index.html";
  }

  if (normalizedRequestPath === "/services" || normalizedRequestPath === "/services/") {
    return "/services.html";
  }

  if (normalizedRequestPath === "/apps/ai-security-audit" || normalizedRequestPath === "/apps/ai-security-audit/") {
    return "/ai-security-audit.html";
  }

  if (normalizedRequestPath === "/apps/prompt-injection-scanner" || normalizedRequestPath === "/apps/prompt-injection-scanner/") {
    return "/prompt-injection-scanner.html";
  }

  if (normalizedRequestPath === "/apps/ai-agent-readiness-checker" || normalizedRequestPath === "/apps/ai-agent-readiness-checker/") {
    return "/ai-agent-readiness-checker.html";
  }

  if (normalizedRequestPath === "/apps/automation-roi-calculator" || normalizedRequestPath === "/apps/automation-roi-calculator/") {
    return "/automation-roi-calculator.html";
  }

  if (normalizedRequestPath === "/apps/rag-risk-analyzer" || normalizedRequestPath === "/apps/rag-risk-analyzer/") {
    return "/rag-risk-analyzer.html";
  }

  if (normalizedRequestPath === "/operator" || normalizedRequestPath === "/operator/") {
    return "/operator.html";
  }

  if (normalizedRequestPath === "/operator/service-intake" || normalizedRequestPath === "/operator/service-intake/") {
    return "/service-intake.html";
  }

  if (normalizedRequestPath === "/operator/audit-lite" || normalizedRequestPath === "/operator/audit-lite/") {
    return "/audit-lite-operator.html";
  }

  if (normalizedRequestPath === "/operator/register-intake" || normalizedRequestPath === "/operator/register-intake/") {
    return "/operator/register-intake.html";
  }

  if (normalizedRequestPath === "/operator/prompt-injection-scans" || normalizedRequestPath === "/operator/prompt-injection-scans/") {
    return "/prompt-injection-scans-operator.html";
  }

  if (normalizedRequestPath === "/operator/agent-readiness" || normalizedRequestPath === "/operator/agent-readiness/") {
    return "/agent-readiness-operator.html";
  }

  if (normalizedRequestPath === "/operator/automation-roi" || normalizedRequestPath === "/operator/automation-roi/") {
    return "/automation-roi-operator.html";
  }

  if (normalizedRequestPath === "/operator/rag-risk" || normalizedRequestPath === "/operator/rag-risk/") {
    return "/rag-risk-operator.html";
  }

  if (normalizedRequestPath === "/operator/agents/intake" || normalizedRequestPath === "/operator/agents/intake/") {
    return "/operator-agents-intake.html";
  }

  if (normalizedRequestPath === "/operator/agents/security-intake" || normalizedRequestPath === "/operator/agents/security-intake/") {
    return "/operator-agents-security-intake.html";
  }

  if (normalizedRequestPath === "/enter" || normalizedRequestPath === "/enter/") {
    return "/enter.html";
  }

  if (normalizedRequestPath === "/register" || normalizedRequestPath === "/register/") {
    return "/register.html";
  }

  if (normalizedRequestPath === "/marketplace" || normalizedRequestPath === "/marketplace/") {
    return "/marketplace.html";
  }

  if (normalizedRequestPath === "/os" || normalizedRequestPath === "/os/") {
    return "/os.html";
  }

  if (normalizedRequestPath === "/api-explorer" || normalizedRequestPath === "/api-explorer/") {
    return "/api-explorer.html";
  }

  if (normalizedRequestPath === "/mission" || normalizedRequestPath === "/mission/") {
    return "/mission.html";
  }

  const moduleRoute = normalizedRequestPath.match(/^\/marketplace\/modules\/([a-z0-9-]+)$/);
  if (moduleRoute) {
    return getModuleStaticPath(moduleRoute[1]);
  }

  return normalizedRequestPath;
}

async function serveStatic(request, env, pathname) {
  const targetUrl = new URL(request.url);
  targetUrl.pathname = resolveStaticPath(pathname);

  let response = await env.ASSETS.fetch(new Request(targetUrl, request));
  if (response.status === 404 && !targetUrl.pathname.includes(".") && targetUrl.pathname !== "/index.html") {
    const fallbackUrl = new URL(request.url);
    fallbackUrl.pathname = "/index.html";
    response = await env.ASSETS.fetch(new Request(fallbackUrl, request));
  }

  return withDefaultHeaders(response);
}

function withDefaultHeaders(response) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
    next.headers.set(key, value);
  }
  return next;
}

function getModuleById(id) {
  return modules.find((entry) => entry.id === id);
}

function getDeliverableById(id) {
  return deliverables.find((entry) => entry.id === id);
}

function getPackageById(id) {
  return packages.find((entry) => entry.id === id);
}

function serializeModuleSummary(moduleEntry) {
  return {
    id: moduleEntry.id,
    name: moduleEntry.name,
    description: moduleEntry.description,
    tags: [...moduleEntry.tags],
    status: moduleEntry.status,
    metadata: {
      ...moduleEntry.metadata,
      accessInstructions: [...moduleEntry.metadata.accessInstructions],
      features: [...moduleEntry.metadata.features],
      scenarioIds: [...(moduleEntry.metadata.scenarioIds || [])],
    },
    lastUpdated: moduleEntry.lastUpdated,
  };
}

function serializeModuleMetadata(record) {
  return {
    ...record,
    tags: [...record.tags],
    access_instructions: [...(record.access_instructions || [])],
    features: [...(record.features || [])],
    route: getModuleRoute(record.id),
    static_path: getModuleStaticPath(record.id),
    lastUpdated: record.updated_at || record.created_at || null,
  };
}

function moduleToCatalogItem(module) {
  const cfCompatibility = getModuleCfCompatibility(module.id);
  return {
    id: module.id,
    name: module.name,
    description: module.description,
    tags: [...(module.tags || [])],
    status: module.status,
    kind: module.metadata.kind,
    price: module.metadata.price,
    service_tier: module.metadata.service_tier,
    compliance_tags: [...(module.metadata.compliance_tags || [])],
    ttx_eligible: module.metadata.ttx_eligible,
    ttxEligible: module.metadata.ttxEligible,
    scenarioIds: [...(module.metadata.scenarioIds || [])],
    launchPath: module.metadata.launchPath,
    deployment_target: module.metadata.deployment_target,
    access_level: module.metadata.access_level,
    accessLevel: module.metadata.accessLevel,
    source: module.metadata.source,
    capabilities: [...(module.metadata.capabilities || [])],
    lastUpdated: module.lastUpdated,
    cloudflareFederation: cfCompatibility,
    cfReadyPlus: cfCompatibility.cfReadyPlus,
    cfActionCompatibility: cfCompatibility.actions,
  };
}

function serializeIdentity(identity) {
  return {
    id: identity.id,
    operator_handle: identity.operator_handle,
    organization: identity.organization,
    contact_email: identity.contact_email,
    transmission: identity.transmission,
    source_page: identity.source_page,
    package_interest: identity.package_interest,
    module_interest: identity.module_interest,
    urgency: identity.urgency,
    auto_reply_sent: identity.auto_reply_sent,
    contacted_at: identity.contacted_at,
    status: identity.status,
  };
}

function normalizeIdentityPayload(payload, fallbackSourcePage, request) {
  const identity = {
    id: payload.id || undefined,
    operator_handle: normalizeText(payload.operator_handle || payload.name || payload.operatorHandle),
    organization: normalizeNullable(payload.organization || payload.org || payload.company),
    contact_email: normalizeEmail(payload.contact_email || payload.email || payload.contactEmail),
    transmission: normalizeText(payload.transmission || payload.message || payload.notes),
    source_page: normalizeText(payload.source_page || payload.source || fallbackSourcePage) || undefined,
    package_interest: normalizeNullable(payload.package_interest || payload.packageId || payload.packageIdValue),
    module_interest: normalizeNullable(payload.module_interest || payload.moduleId),
    urgency: normalizeNullable(payload.urgency),
    utm_source: normalizeNullable(payload.utm_source),
    utm_medium: normalizeNullable(payload.utm_medium),
    auto_reply_sent: Boolean(payload.auto_reply_sent),
    contacted_at: payload.contacted_at || new Date().toISOString(),
    ip_address: request.headers.get("CF-Connecting-IP"),
    status: normalizeText(payload.status) || "new",
  };

  validateIdentityRecord(identity);
  return identity;
}

function normalizeEngagementPayload(payload) {
  return {
    packageId: normalizeNullable(payload.package_interest || payload.packageId),
    operatorHandle: normalizeText(payload.operator_handle || payload.name || payload.operatorHandle || payload.contactName),
    organization: normalizeNullable(payload.organization || payload.org || payload.company),
    contactEmail: normalizeEmail(payload.contact_email || payload.email || payload.contactEmail),
    transmission: normalizeText(payload.transmission || payload.message || payload.notes),
    source: normalizeText(payload.source || payload.source_page) || "landing",
    moduleInterest: normalizeNullable(payload.module_interest || payload.moduleId),
    urgency: normalizeNullable(payload.urgency),
    selectorId: normalizeNullable(payload.selector_id || payload.selectorId),
    recommendedService: normalizeNullable(payload.recommended_service || payload.recommendedService || payload.service),
    secondaryService: normalizeNullable(payload.secondary_service || payload.secondaryService),
    priority: normalizeNullable(payload.priority),
    revenuePotential: normalizeNullable(payload.revenue_potential || payload.revenuePotential),
    urgencyScore: Number.isFinite(Number(payload.urgency_score)) ? Number(payload.urgency_score) : null,
    auditId: normalizeNullable(payload.audit_id || payload.auditId),
    scanId: normalizeNullable(payload.scan_id || payload.scanId),
    agentCheckId: normalizeNullable(payload.agent_check_id || payload.agentCheckId),
    automationRoiId: normalizeNullable(payload.automation_roi_id || payload.automationRoiId),
    ragRiskId: normalizeNullable(payload.rag_risk_id || payload.ragRiskId),
    riskScore: Number.isFinite(Number(payload.risk_score)) ? Number(payload.risk_score) : null,
    injectionScore: Number.isFinite(Number(payload.injection_score)) ? Number(payload.injection_score) : null,
    readinessScore: Number.isFinite(Number(payload.readiness_score)) ? Number(payload.readiness_score) : null,
    roiScore: Number.isFinite(Number(payload.roi_score)) ? Number(payload.roi_score) : null,
    ragRiskScore: Number.isFinite(Number(payload.rag_risk_score)) ? Number(payload.rag_risk_score) : null,
    riskTier: normalizeNullable(payload.risk_tier || payload.riskTier),
    readinessTier: normalizeNullable(payload.readiness_tier || payload.readinessTier),
    roiTier: normalizeNullable(payload.roi_tier || payload.roiTier),
    ragRiskTier: normalizeNullable(payload.rag_risk_tier || payload.ragRiskTier),
    estimatedMonthlySavings: Number.isFinite(Number(payload.estimated_monthly_savings))
      ? Number(payload.estimated_monthly_savings)
      : null,
    estimatedAnnualSavings: Number.isFinite(Number(payload.estimated_annual_savings))
      ? Number(payload.estimated_annual_savings)
      : null,
    hoursSavedPerMonth: Number.isFinite(Number(payload.hours_saved_per_month))
      ? Number(payload.hours_saved_per_month)
      : null,
    retrievalExposureLevel: normalizeNullable(payload.retrieval_exposure_level || payload.retrievalExposureLevel),
    accessControlLevel: normalizeNullable(payload.access_control_level || payload.accessControlLevel),
    governanceMaturity: normalizeNullable(payload.governance_maturity || payload.governanceMaturity),
    buildComplexity: normalizeNullable(payload.build_complexity || payload.buildComplexity),
    automationComplexity: normalizeNullable(payload.automation_complexity || payload.automationComplexity),
    safetyLevel: normalizeNullable(payload.safety_level || payload.safetyLevel),
  };
}

function normalizeIntentPayload(payload) {
  return {
    intent: normalizeText(payload.intent),
    source: normalizeText(payload.source) || "public-landing",
    agent: normalizeText(payload.agent) || "route-advisory",
  };
}

function buildId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().split("-")[0]}`;
}

function getStoreBinding(env, logicalName) {
  return env[STORE_CONFIG[logicalName].envKey] || null;
}

function getRecordKey(logicalName, id) {
  return `${STORE_CONFIG[logicalName].prefix}:${id}`;
}

async function readIndex(env, logicalName) {
  const binding = getStoreBinding(env, logicalName);
  const config = STORE_CONFIG[logicalName];

  if (binding) {
    const raw = await binding.get(config.indexKey);
    return raw ? JSON.parse(raw) : [];
  }

  return [...MEMORY_INDEX[logicalName]];
}

async function writeIndex(env, logicalName, entries) {
  const binding = getStoreBinding(env, logicalName);
  const config = STORE_CONFIG[logicalName];

  if (binding) {
    await binding.put(config.indexKey, JSON.stringify(entries));
    return;
  }

  MEMORY_INDEX[logicalName].splice(0, MEMORY_INDEX[logicalName].length, ...entries);
}

function buildIndexSummary(logicalName, record) {
  if (logicalName === "PAYLOADS") {
    return {
      id: record.id,
      agent: record.agent,
      source: record.source,
      createdAt: record.createdAt,
      summary: record.summary,
      chain: record.chain,
    };
  }

  if (logicalName === "ESCALATIONS") {
    return {
      id: record.id,
      payloadId: record.payloadId,
      severity: record.severity,
      createdAt: record.createdAt,
      summary: record.summary,
      resolved: Boolean(record.resolvedAt),
    };
  }

  if (logicalName === "MODULES") {
    return {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      summary: record.summary,
      publicUrl: record.publicUrl,
      published: Boolean(record.publishedAt),
    };
  }

  if (logicalName === "ROUTING_LOGS") {
    return {
      id: record.id,
      agent: record.agent,
      intent: record.intent,
      timestamp: record.timestamp,
      summary: record.summary,
    };
  }

  if (logicalName === "SEARCH_LOGS") {
    return {
      id: record.id,
      query: record.query,
      timestamp: record.timestamp,
      resultCount: record.resultCount,
      source: record.source,
    };
  }

  if (logicalName === "EVENTS") {
    return {
      id: record.id,
      type: record.type,
      timestamp: record.timestamp,
      details: record.details,
    };
  }

  if (logicalName === "DIVISION_MEMORY") {
    return {
      id: record.id,
      key: record.key,
      type: record.type,
      updatedAt: record.updatedAt,
      summary: record.summary || record.value,
    };
  }

  if (logicalName === "OS_ROUTING") {
    return {
      id: record.id,
      intent: record.intent,
      createdAt: record.createdAt,
      pipeline: record.pipeline,
    };
  }

  if (logicalName === "OPERATOR_INTENTS") {
    return {
      id: record.id,
      goal: record.goal,
      priority: record.priority,
      createdAt: record.createdAt,
    };
  }

  if (logicalName === "PIPELINES") {
    return {
      id: record.id,
      moduleId: record.moduleId,
      createdAt: record.createdAt,
      status: record.status,
    };
  }

  if (logicalName === "SANDBOX_LOGS") {
    return {
      id: record.id,
      agent: record.agent,
      createdAt: record.createdAt,
      summary: record.summary,
    };
  }

  if (logicalName === "OS_CONFIG") {
    return {
      id: record.id,
      key: record.key,
      updatedAt: record.updatedAt,
    };
  }

  if (logicalName === "PUBLIC_SCENARIOS") {
    return {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      stepCount: record.steps?.length || 0,
    };
  }

  return {
    id: record.id,
    triggerPayloadId: record.triggerPayloadId,
    agent: record.agent,
    createdAt: record.createdAt,
    reason: record.reason,
  };
}

async function putRecord(env, logicalName, id, record) {
  const binding = getStoreBinding(env, logicalName);
  const key = getRecordKey(logicalName, id);
  const index = await readIndex(env, logicalName);
  const summary = buildIndexSummary(logicalName, record);
  const nextIndex = [summary, ...index.filter((entry) => entry.id !== id)].slice(0, STORE_CONFIG[logicalName].limit);

  if (binding) {
    await binding.put(key, JSON.stringify(record));
    await writeIndex(env, logicalName, nextIndex);
    return;
  }

  MEMORY_DATA[logicalName].set(key, record);
  await writeIndex(env, logicalName, nextIndex);
}

async function getRecord(env, logicalName, id) {
  const binding = getStoreBinding(env, logicalName);
  const key = getRecordKey(logicalName, id);

  if (binding) {
    const raw = await binding.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  return MEMORY_DATA[logicalName].get(key) || null;
}

async function deleteRecord(env, logicalName, id) {
  const binding = getStoreBinding(env, logicalName);
  const key = getRecordKey(logicalName, id);
  const index = await readIndex(env, logicalName);
  const nextIndex = index.filter((entry) => entry.id !== id);

  if (binding) {
    await binding.delete(key);
    await writeIndex(env, logicalName, nextIndex);
    return;
  }

  MEMORY_DATA[logicalName].delete(key);
  await writeIndex(env, logicalName, nextIndex);
}

async function listRecords(env, logicalName, limit = 10) {
  const index = await readIndex(env, logicalName);
  const results = [];

  for (const entry of index.slice(0, limit)) {
    const record = await getRecord(env, logicalName, entry.id);
    if (record) {
      results.push(record);
    }
  }

  return results;
}

async function emitEvent(env, type, fields = {}) {
  const event = {
    id: buildId("ev"),
    type,
    timestamp: new Date().toISOString(),
    payloadId: fields.payloadId || null,
    moduleId: fields.moduleId || null,
    escalationId: fields.escalationId || null,
    agent: fields.agent || null,
    details: fields.details || "",
  };
  await putRecord(env, "EVENTS", event.id, event);
  await maybeCreateNotification(env, event);
  return event;
}

async function maybeCreateNotification(env, event) {
  const notificationMap = {
    "escalation-created": "Escalation created",
    "module-published": "Module published",
    "autonomy-loop-action": "Autonomy loop action",
    "operator-command-executed": "Operator command executed",
    "agent-failed": "Agent failure detected",
    "heartbeat-warning": "Heartbeat warning",
  };

  if (!notificationMap[event.type]) {
    return null;
  }

  const notification = {
    id: buildId("notif"),
    type: event.type,
    title: notificationMap[event.type],
    details: event.details,
    createdAt: event.timestamp,
    readAt: null,
    payloadId: event.payloadId,
    moduleId: event.moduleId,
    escalationId: event.escalationId,
    agent: event.agent,
  };

  await putRecord(env, "NOTIFICATIONS", notification.id, notification);
  return notification;
}

async function markNotificationRead(env, notificationId) {
  const notification = await getRecord(env, "NOTIFICATIONS", notificationId);
  if (!notification) {
    return null;
  }

  notification.readAt = new Date().toISOString();
  await putRecord(env, "NOTIFICATIONS", notification.id, notification);
  return notification;
}

async function recordAudit(env, action, details, operator = "system") {
  const auditRecord = {
    id: buildId("audit"),
    operator,
    action,
    timestamp: new Date().toISOString(),
    details,
  };

  await putRecord(env, "AUDIT", auditRecord.id, auditRecord);
  return auditRecord;
}

function getIdentityDescriptor() {
  return {
    division: "MSHOPS.NET - AI Operator Division",
    version: "v3.5",
    agents: [...AGENTS],
    autonomy: "v2",
    operatorConsole: "/operator",
    marketplace: "/marketplace",
    operatingSystem: "/os",
    governance: "/api/os/governance",
    release: "/api/os/releases",
    integrations: "/api/os/integration",
    certification: "/api/os/certification",
    safety: "/api/os/safety/check",
    versioning: "/api/os/version",
    cloudflare: "/api/os/cloudflare",
    cloudflareDocs: "/api/os/cloudflare/docs",
    cloudflareFederation: "/api/os/federation/cloudflare",
    cloudflareReleases: "/api/os/releases/cloudflare",
  };
}

const DEFAULT_OS_CONFIG = {
  routingThresholds: {
    autoChainConfidence: 0.56,
    escalationSeverity: 61,
  },
  autonomyLoopTriggers: ["error", "failure", "issue", "update", "refresh", "sync"],
  modulePublishRules: {
    autoPublishSynced: true,
    requireOperatorReviewAboveSeverity: 80,
  },
  pipelineDefaults: ["payload-generator", "marketplace-sync", "operator-sentinel"],
};

const DEFAULT_GOVERNANCE = {
  autonomyThresholds: {
    maxAutoChainLength: 4,
    maxPipelineSteps: 6,
    maxScenarioSteps: 6,
    allowSandbox: true,
  },
  escalationPolicies: {
    severityThreshold: 61,
    operatorReviewAboveSeverity: 80,
  },
  chainLengthLimits: {
    default: 4,
    pipeline: 4,
    scenario: 4,
    publicScenario: 4,
  },
  agentSafetyRules: Object.fromEntries(
    AGENTS.map((agent) => [
      agent,
      {
        enabled: true,
        requireCertification: agent !== "route-advisory",
      },
    ]),
  ),
  pipelineSafetyRules: {
    allowUncertifiedAgents: false,
    maxSteps: 6,
  },
  scenarioSafetyRules: {
    allowUncertifiedAgents: false,
    maxSteps: 6,
  },
  operatorOverrideRules: {
    allowManualBypass: false,
  },
  externalIntegrationPermissions: {
    allowRoute: true,
    allowPipeline: true,
    allowScenario: true,
  },
  cloudflareSafetyRules: {
    blockOnMcpOffline: false,
    requireObservabilityReachable: false,
  },
};

const DEFAULT_OS_VERSION = {
  current: "v3.5",
  history: ["v1.0", "v2.0", "v3.0", "v3.5"],
  lastUpgrade: new Date().toISOString(),
};

async function getOsConfig(env) {
  const current = await getRecord(env, "OS_CONFIG", "current");
  return current?.value || DEFAULT_OS_CONFIG;
}

async function saveOsConfig(env, value, source = "operator") {
  const updatedAt = new Date().toISOString();
  const record = {
    id: "current",
    key: "current",
    value,
    updatedAt,
    source,
  };
  await putRecord(env, "OS_CONFIG", record.id, record);
  const historyId = buildId("config");
  await putRecord(env, "OS_CONFIG", historyId, {
    id: historyId,
    key: "history",
    value,
    updatedAt,
    source,
  });
  return record;
}

async function getGovernanceConfig(env) {
  const current = await getRecord(env, "GOVERNANCE", "current");
  return current?.value || DEFAULT_GOVERNANCE;
}

async function saveGovernanceConfig(env, value, source = "operator") {
  const updatedAt = new Date().toISOString();
  const record = {
    id: "current",
    key: "current",
    value,
    updatedAt,
    source,
  };
  await putRecord(env, "GOVERNANCE", record.id, record);
  const historyId = buildId("governance-config");
  await putRecord(env, "GOVERNANCE", historyId, {
    id: historyId,
    key: "config-history",
    value,
    updatedAt,
    source,
  });
  return record;
}

async function storeGovernanceDecision(env, decision) {
  const cloudflareSignals = await getCloudflareGovernanceSignals();
  const record = {
    id: buildId("governance"),
    type: "decision",
    createdAt: new Date().toISOString(),
    cloudflareSignals,
    ...decision,
  };
  await putRecord(env, "GOVERNANCE", record.id, record);
  await emitEvent(env, record.allowed ? "governance-allowed" : "governance-blocked", {
    agent: record.agent || null,
    details: record.allowed
      ? `Governance allowed ${record.surface || "execution"} for ${record.agent || "system"}.`
      : `Governance blocked ${record.surface || "execution"} for ${record.agent || "system"}: ${record.reason}.`,
  });
  return record;
}

async function getRecentGovernanceDecisions(env, limit = 50) {
  const records = await listRecords(env, "GOVERNANCE", limit + 10);
  return records.filter((entry) => entry.type === "decision").slice(0, limit);
}

async function getOsVersion(env) {
  const current = await getRecord(env, "DIVISION_MEMORY", "os-version");
  return current?.value || DEFAULT_OS_VERSION;
}

async function saveOsVersion(env, value, source = "operator") {
  const versionRecord = {
    id: "os-version",
    key: "os-version",
    type: "system-version",
    value,
    summary: `Division OS version ${value.current}.`,
    updatedAt: new Date().toISOString(),
    source,
  };
  await putRecord(env, "DIVISION_MEMORY", versionRecord.id, versionRecord);
  await emitEvent(env, "os-version-updated", {
    details: `OS version updated to ${value.current}.`,
  });
  return value;
}

async function listIntegrations(env) {
  return listRecords(env, "INTEGRATIONS", 100);
}

async function createIntegration(env, payload) {
  const endpoint = normalizeText(payload.endpoint);
  const integration = {
    id: buildId("int"),
    name: normalizeText(payload.name) || "Unnamed Integration",
    type: normalizeText(payload.type) || "api",
    endpoint,
    permissions: Array.isArray(payload.permissions)
      ? payload.permissions.map((entry) => normalizeText(entry)).filter(Boolean)
      : [],
    createdAt: new Date().toISOString(),
  };
  await putRecord(env, "INTEGRATIONS", integration.id, integration);
  await emitEvent(env, "integration-created", {
    details: `Integration ${integration.name} created.`,
  });
  return integration;
}

async function deleteIntegration(env, integrationId) {
  const existing = await getRecord(env, "INTEGRATIONS", integrationId);
  if (!existing) {
    return null;
  }
  await deleteRecord(env, "INTEGRATIONS", integrationId);
  await emitEvent(env, "integration-deleted", {
    details: `Integration ${existing.name} deleted.`,
  });
  return existing;
}

async function resolveIntegrationContext(env, value, requiredPermission) {
  const integrationId = normalizeText(value);
  if (!integrationId) {
    return null;
  }
  const integration = await getRecord(env, "INTEGRATIONS", integrationId);
  if (!integration) {
    throw new Error("Unknown integration");
  }
  if (requiredPermission && !integration.permissions.includes(requiredPermission)) {
    throw new Error(`Integration ${integration.name} lacks ${requiredPermission} permission`);
  }
  await emitEvent(env, "integration-authorized", {
    details: `Integration ${integration.name} authorized for ${requiredPermission || "runtime"} access.`,
  });
  return integration;
}

function getIntegrationIdFromPayload(payload) {
  return normalizeText(
    payload.integrationId ||
      payload.integration_id ||
      payload.context?.integrationId ||
      payload.context?.integration_id,
  );
}

function buildRecommendedFix(reason) {
  if (reason.includes("certification")) {
    return "Run /api/os/certify for the affected agent before using it in a pipeline or scenario.";
  }
  if (reason.includes("chain length")) {
    return "Reduce the requested chain depth or raise the governance chain length limit.";
  }
  if (reason.includes("sandbox")) {
    return "Enable sandbox execution in governance or run the agent outside the sandbox surface.";
  }
  if (reason.includes("permission")) {
    return "Add the required permission to the integration or remove the integration trigger.";
  }
  return "Adjust governance policy or execution inputs, then retry.";
}

async function getAgentCertification(env, agent) {
  return getRecord(env, "CERTIFICATION", `agent:${agent}`);
}

async function assertCertifiedAgents(env, agents, surface, governance, options = {}) {
  const shouldRequire = surface === "pipeline"
    ? !governance.pipelineSafetyRules?.allowUncertifiedAgents
    : surface === "scenario" || surface === "public-scenario"
      ? !governance.scenarioSafetyRules?.allowUncertifiedAgents
      : false;

  if (!shouldRequire && !options.force) {
    return;
  }

  for (const agent of agents) {
    const rule = governance.agentSafetyRules?.[agent];
    if (rule?.enabled === false) {
      throw new Error(`Agent ${agent} is disabled by governance.`);
    }
    if (rule?.requireCertification === false && !options.force) {
      continue;
    }
    const certification = await getAgentCertification(env, agent);
    if (!certification || certification.status !== "certified") {
      throw new Error(`Agent ${agent} lacks certification for ${surface}.`);
    }
  }
}

async function evaluateSafetyCheck(env, payload) {
  const governance = await getGovernanceConfig(env);
  const intent = normalizeText(payload.intent);
  const agent = normalizeText(payload.agent);
  const pipelineName = normalizeText(payload.pipeline);
  const scenarioName = normalizeText(payload.scenario);
  const reasons = [];

  if (agent) {
    const rule = governance.agentSafetyRules?.[agent];
    if (rule?.enabled === false) {
      reasons.push(`Agent ${agent} is disabled by governance.`);
    }
  }

  const chainLength = Array.isArray(payload.chain) ? payload.chain.length : 0;
  if (chainLength > (governance.chainLengthLimits?.default || 4)) {
    reasons.push(`Requested chain length ${chainLength} exceeds governance chain length limits.`);
  }

  if (pipelineName && payload.pipelineSteps && payload.pipelineSteps.length > (governance.pipelineSafetyRules?.maxSteps || 6)) {
    reasons.push(`Pipeline ${pipelineName} exceeds the configured pipeline safety rule step limit.`);
  }

  if (scenarioName && payload.scenarioSteps && payload.scenarioSteps.length > (governance.scenarioSafetyRules?.maxSteps || 6)) {
    reasons.push(`Scenario ${scenarioName} exceeds the configured scenario safety rule step limit.`);
  }

  const severitySignal = scoreSeverity(intent || `${pipelineName} ${scenarioName}`);
  if (severitySignal > (governance.escalationPolicies?.operatorReviewAboveSeverity || 80)) {
    reasons.push(`Severity signal ${severitySignal} exceeds operator review threshold.`);
  }

  const cloudflareReachability = await getCloudflareApiReachability();
  const cloudflareActionsHealth = await getCloudflareActionsHealth();
  const cloudflareSafetySnapshot = await getCloudflareSafetySnapshot(governance);
  const [cloudflareAutomation, cloudflareCertification, cloudflareCrossDivision, cloudflareOrchestration, cloudflareExecution, cloudflareDecision, cloudflareInsights, cloudflareAutonomous] = await Promise.all([
    getCloudflareAutomationLoops(governance),
    getMarketplaceCloudflareCertification(governance),
    getCloudflareCrossDivisionSync(governance, env),
    getCloudflareOrchestration(governance, env),
    getCloudflareExecution(governance, env),
    getCloudflareDecision(governance),
    getCloudflareInsights(governance),
    getCloudflareAutonomousSnapshot(governance),
  ]);
  const cloudflareAdaptive = buildCloudflareAdaptiveFromSignals({
    orchestration: cloudflareOrchestration,
    crossDivision: cloudflareCrossDivision,
    certification: cloudflareCertification,
    decision: cloudflareDecision,
    execution: cloudflareExecution,
    automation: cloudflareAutomation,
    insights: cloudflareInsights,
    autonomous: cloudflareAutonomous,
    reachability: cloudflareReachability,
  });
  const cloudflarePredictive = buildCloudflarePredictiveFromSignals({
    adaptive: cloudflareAdaptive,
    orchestration: cloudflareOrchestration,
    crossDivision: cloudflareCrossDivision,
    certification: cloudflareCertification,
    decision: cloudflareDecision,
    execution: cloudflareExecution,
    automation: cloudflareAutomation,
    insights: cloudflareInsights,
    autonomous: cloudflareAutonomous,
    reachability: cloudflareReachability,
  });
  const cloudflareStrategic = buildCloudflareStrategicFromSignals({
    predictive: cloudflarePredictive,
    adaptive: cloudflareAdaptive,
    orchestration: cloudflareOrchestration,
    crossDivision: cloudflareCrossDivision,
    certification: cloudflareCertification,
    decision: cloudflareDecision,
    execution: cloudflareExecution,
    automation: cloudflareAutomation,
    insights: cloudflareInsights,
    autonomous: cloudflareAutonomous,
  });
  const cloudflareUcip = buildCloudflareUcipFromSignals({
    automation: cloudflareAutomation,
    autonomous: cloudflareAutonomous,
    decision: cloudflareDecision,
    certification: cloudflareCertification,
    crossDivision: cloudflareCrossDivision,
    orchestration: cloudflareOrchestration,
    execution: cloudflareExecution,
    adaptive: cloudflareAdaptive,
    predictive: cloudflarePredictive,
    strategic: cloudflareStrategic,
    insights: cloudflareInsights,
  });
  const moduleIds = modules.map((entry) => entry.id);
  const metaStack = await resolveMetaIntelligenceStack(governance, env, { cloudflareUcip, moduleIds }, "safety");
  const cloudflareAmg = metaStack.cloudflareAmg;
  const cloudflareCba = metaStack.cloudflareCba;
  const cloudflareCal = metaStack.cloudflareCal;
  const cloudflareIhl = metaStack.cloudflareIhl;
  const cloudflareIarl = metaStack.cloudflareIarl;
  const cloudflareAcl = metaStack.cloudflareAcl;
  const cloudflareSafetyFactor = evaluateCloudflareSafetyFactor(cloudflareReachability, governance, cloudflareActionsHealth);
  cloudflareSafetyFactor.automation = buildCloudflareSafetyAutomationFactor(cloudflareAutomation);
  cloudflareSafetyFactor.certification = buildCloudflareSafetyCertificationFactor(cloudflareCertification);
  cloudflareSafetyFactor.crossDivision = buildCloudflareSafetyCrossDivisionFactor(cloudflareCrossDivision);
  cloudflareSafetyFactor.orchestration = buildCloudflareSafetyOrchestrationFactor(cloudflareOrchestration);
  cloudflareSafetyFactor.execution = buildCloudflareSafetyExecutionFactor(cloudflareExecution);
  cloudflareSafetyFactor.adaptive = buildCloudflareSafetyAdaptiveFactor(cloudflareAdaptive);
  cloudflareSafetyFactor.predictive = buildCloudflareSafetyPredictiveFactor(cloudflarePredictive);
  cloudflareSafetyFactor.strategic = buildCloudflareSafetyStrategicFactor(cloudflareStrategic);
  cloudflareSafetyFactor.ucip = buildCloudflareSafetyUcipFactor(cloudflareUcip);
  cloudflareSafetyFactor.amg = buildCloudflareSafetyAmgFactor(cloudflareAmg);
  cloudflareSafetyFactor.cba = buildCloudflareSafetyCbaFactor(cloudflareCba);
  cloudflareSafetyFactor.cal = buildCloudflareSafetyCalFactor(cloudflareCal);
  cloudflareSafetyFactor.ihl = buildCloudflareSafetyIhlFactor(cloudflareIhl);
  cloudflareSafetyFactor.iarl = buildCloudflareSafetyIarlFactor(cloudflareIarl);
  cloudflareSafetyFactor.acl = buildCloudflareSafetyAclFactor(cloudflareAcl);
  if (cloudflareSafetyFactor.blockRecommended) {
    reasons.push(...cloudflareSafetyFactor.warnings);
  }
  if (cloudflareSafetySnapshot.cloudflareSafety?.blockRecommended) {
    reasons.push(...(cloudflareSafetySnapshot.cloudflareSafety.autonomousWarnings || []));
  }
  if (governance.cloudflareSafetyRules?.requireObservabilityReachable) {
    const observabilityOffline = (cloudflareReachability.servers || []).find(
      (server) => server.id === "cloudflare-observability" && server.status === "offline",
    );
    if (observabilityOffline) {
      reasons.push("Cloudflare observability MCP is offline and required by governance.");
    }
  }

  const allowed = reasons.length === 0;
  const decision = {
    allowed,
    reason: allowed ? "Execution allowed by governance." : reasons.join(" "),
    recommendedFix: allowed ? "None." : buildRecommendedFix(reasons[0]),
    intent,
    agent,
    pipeline: pipelineName || null,
    scenario: scenarioName || null,
    severitySignal,
    cloudflareReachability,
    cloudflareSafetyFactor,
    cloudflareSafety: cloudflareSafetySnapshot.cloudflareSafety,
    cloudflareAutonomousSignals: cloudflareSafetySnapshot.autonomousSignals,
  };

  await storeGovernanceDecision(env, {
    surface: "safety-check",
    agent: agent || null,
    allowed,
    reason: decision.reason,
    recommendedFix: decision.recommendedFix,
  });
  return decision;
}

async function enforceGovernance(env, surface, payload, options = {}) {
  const governance = await getGovernanceConfig(env);
  const requestedChainLength = options.requestedChainLength || (Array.isArray(payload.chain) ? payload.chain.length : 0);
  const integrationId = getIntegrationIdFromPayload(payload);
  const requiredPermission = options.requiredPermission || null;
  const agent = normalizeText(options.agent || payload.agent);

  if (integrationId) {
    const integration = await resolveIntegrationContext(env, integrationId, requiredPermission);
    if (!integration) {
      throw new Error("Integration lookup failed.");
    }
    const permissionMap = {
      route: governance.externalIntegrationPermissions?.allowRoute,
      pipeline: governance.externalIntegrationPermissions?.allowPipeline,
      scenario: governance.externalIntegrationPermissions?.allowScenario,
    };
    if (requiredPermission && permissionMap[requiredPermission] === false) {
      const reason = `External integration permission ${requiredPermission} is disabled by governance.`;
      await storeGovernanceDecision(env, {
        surface,
        agent,
        allowed: false,
        reason,
        recommendedFix: buildRecommendedFix(reason),
      });
      throw new Error(reason);
    }
  }

  if (surface === "sandbox" && governance.autonomyThresholds?.allowSandbox === false) {
    const reason = "Sandbox execution is disabled by governance.";
    await storeGovernanceDecision(env, {
      surface,
      agent,
      allowed: false,
      reason,
      recommendedFix: buildRecommendedFix(reason),
    });
    throw new Error(reason);
  }

  const chainLimit =
    governance.chainLengthLimits?.[surface] ||
    governance.chainLengthLimits?.default ||
    governance.autonomyThresholds?.maxAutoChainLength ||
    4;
  if (requestedChainLength && requestedChainLength > chainLimit) {
    const reason = `Requested chain length ${requestedChainLength} exceeds the ${surface} chain length limit ${chainLimit}.`;
    await storeGovernanceDecision(env, {
      surface,
      agent,
      allowed: false,
      reason,
      recommendedFix: buildRecommendedFix(reason),
    });
    throw new Error(reason);
  }

  const decision = await evaluateSafetyCheck(env, {
    intent: payload.intent,
    agent,
    pipeline: surface === "pipeline" ? payload.moduleId || "pipeline" : "",
    scenario: surface.includes("scenario") ? payload.name || "scenario" : "",
    chain: options.chain || [],
    pipelineSteps: payload.steps,
    scenarioSteps: payload.steps,
  });
  if (!decision.allowed) {
    await storeGovernanceDecision(env, {
      surface,
      agent,
      allowed: false,
      reason: decision.reason,
      recommendedFix: decision.recommendedFix,
    });
    throw new Error(decision.reason);
  }

  await storeGovernanceDecision(env, {
    surface,
    agent,
    allowed: true,
    reason: "Execution allowed by governance.",
    recommendedFix: "None.",
  });
  return governance;
}

async function runCertification(env, payload) {
  const agent = normalizeText(payload.agent);
  if (!AGENTS.includes(agent)) {
    throw new Error("Valid agent is required for certification.");
  }
  const tests = Array.isArray(payload.tests) && payload.tests.length
    ? payload.tests.map((entry) => normalizeText(entry)).filter(Boolean)
    : ["route-smoke", "payload-shape", "safety-compat"];

  const results = [];
  for (const test of tests) {
    const intentRecord = buildIntentRecord({
      intent: `Certification test ${test} for ${agent}`,
      source: "certification",
      agent,
    });
    const output = await executeAgent(intentRecord, env, {
      previousOutput: null,
      chain: [agent],
      payloadId: null,
    });
    results.push({
      test,
      passed: Boolean(output),
      summary: output.summary || `${agent} passed ${test}.`,
    });
  }

  const passedCount = results.filter((entry) => entry.passed).length;
  const score = Math.round((passedCount / Math.max(results.length, 1)) * 100);
  const certification = {
    id: `agent:${agent}`,
    agent,
    tests,
    score,
    status: score >= 75 ? "certified" : "failed",
    certifiedAt: new Date().toISOString(),
    results,
  };
  await putRecord(env, "CERTIFICATION", certification.id, certification);
  await emitEvent(env, "agent-certified", {
    agent,
    details: `Certification completed for ${agent} with score ${score}.`,
  });
  return certification;
}

async function applyRelease(env, payload) {
  const version = normalizeText(payload.version);
  if (!version) {
    throw new Error("version is required");
  }
  const changes = Array.isArray(payload.changes) ? payload.changes.map((entry) => normalizeText(entry)).filter(Boolean) : [];
  const migrations = Array.isArray(payload.migrations) ? payload.migrations.map((entry) => normalizeText(entry)).filter(Boolean) : [];
  const release = {
    id: `rel-${Date.now()}`,
    version,
    changes,
    migrations,
    appliedAt: new Date().toISOString(),
    status: "applied",
    logs: [],
  };

  for (const migration of migrations) {
    if (migration.startsWith("config:")) {
      const key = migration.replace("config:", "");
      const config = await getOsConfig(env);
      release.logs.push(`Config migration requested for ${key}.`);
      await saveOsConfig(env, config, "release");
    } else if (migration.startsWith("version:")) {
      await saveOsVersion(env, {
        current: migration.replace("version:", ""),
        history: [...new Set([...(await getOsVersion(env)).history, migration.replace("version:", "")])],
        lastUpgrade: new Date().toISOString(),
      }, "release");
      release.logs.push(`Version migration applied: ${migration}.`);
    } else if (migration === "governance:refresh") {
      await saveGovernanceConfig(env, await getGovernanceConfig(env), "release");
      release.logs.push("Governance config snapshot refreshed.");
    } else {
      release.logs.push(`No-op migration recorded: ${migration}.`);
    }
  }

  await putRecord(env, "RELEASES", release.id, release);
  await emitEvent(env, "release-applied", {
    details: `Release ${release.version} applied with ${release.migrations.length} migrations.`,
  });
  return release;
}

function buildPipelineDefaults(config, moduleId, recommendedAgent) {
  const base = Array.isArray(config?.pipelineDefaults) ? [...config.pipelineDefaults] : ["payload-generator", "marketplace-sync", "operator-sentinel"];
  if (recommendedAgent && !base.includes(recommendedAgent)) {
    base.unshift(recommendedAgent);
  }
  return {
    moduleId,
    pipeline: base,
    expectedOutputs: ["payload", "module-sync", "sentinel-review"],
  };
}

async function getDivisionMemoryPreview(env, limit = 8) {
  const memories = await listRecords(env, "DIVISION_MEMORY", limit);
  return memories.map((entry) => ({
    key: entry.key,
    type: entry.type,
    value: entry.value,
    updatedAt: entry.updatedAt,
  }));
}

async function computeGlobalRoutePlan(env, payload) {
  const osConfig = await getOsConfig(env);
  const normalizedIntent = normalizeText(payload.intent);
  const mode = normalizeText(payload.mode) || "auto";
  const context = typeof payload.context === "object" && payload.context ? payload.context : {};
  const semantic = lightweightSemanticScore(normalizedIntent);
  const selectedAgent = mode === "manual" && context.agent && AGENTS.includes(context.agent)
    ? context.agent
    : semantic.recommendedAgent;
  const moduleId = deriveModuleId(normalizedIntent);
  const pipelinePlan = buildPipelineDefaults(osConfig, moduleId, selectedAgent);
  const memory = await getDivisionMemoryPreview(env, 6);
  await enforceGovernance(
    env,
    "route",
    {
      intent: normalizedIntent,
      agent: selectedAgent,
      context,
      integrationId: getIntegrationIdFromPayload(payload),
    },
    {
      requestedChainLength: [selectedAgent, ...pipelinePlan.pipeline.filter((step) => step !== selectedAgent)].length,
      requiredPermission: "route",
      chain: [selectedAgent, ...pipelinePlan.pipeline.filter((step) => step !== selectedAgent)],
    },
  );
  const routePlan = {
    id: buildId("os-route"),
    intent: normalizedIntent,
    mode,
    context,
    createdAt: new Date().toISOString(),
    semantic,
    selectedAgent,
    pipeline: pipelinePlan.pipeline,
    expectedOutputs: pipelinePlan.expectedOutputs,
    chain: [selectedAgent, ...pipelinePlan.pipeline.filter((step) => step !== selectedAgent)],
    memory,
    configSnapshot: osConfig,
  };
  await putRecord(env, "OS_ROUTING", routePlan.id, routePlan);
  await emitEvent(env, "os-route-created", {
    agent: selectedAgent,
    details: `Global routing plan ${routePlan.id} created for ${selectedAgent}.`,
  });
  return routePlan;
}

async function saveDivisionMemoryEntry(env, payload) {
  const key = normalizeText(payload.key || payload.id);
  if (!key) {
    throw new Error("memory key is required");
  }
  const record = {
    id: key,
    key,
    type: normalizeText(payload.type) || "operator-note",
    value: payload.value ?? payload.note ?? payload.metadata ?? null,
    summary: normalizeText(payload.summary) || normalizeText(typeof payload.value === "string" ? payload.value : key),
    updatedAt: new Date().toISOString(),
  };
  await putRecord(env, "DIVISION_MEMORY", record.id, record);
  await emitEvent(env, "division-memory-updated", {
    details: `Division memory key ${record.key} updated.`,
  });
  return record;
}

async function runPipeline(env, payload, source = "pipeline-engine") {
  const moduleId = normalizeText(payload.moduleId);
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  if (!moduleId || !steps.length) {
    throw new Error("moduleId and steps are required");
  }
  const governance = await enforceGovernance(
    env,
    "pipeline",
    {
      ...payload,
      intent: normalizeText(payload.intent) || `Pipeline for ${moduleId}`,
      integrationId: getIntegrationIdFromPayload(payload),
    },
    {
      requestedChainLength: steps.length,
      requiredPermission: "pipeline",
      chain: steps.map((step) => normalizeText(step.agent)).filter(Boolean),
    },
  );
  await assertCertifiedAgents(
    env,
    steps.map((step) => normalizeText(step.agent)).filter(Boolean),
    "pipeline",
    governance,
  );
  const cloudflareBindingValidation = await validateCloudflareBindings(moduleId);
  const cloudflareBindingHealth = await getCloudflareBindingHealth();
  const moduleRecord = await getRecord(env, "MODULES", moduleId);
  const pipeline = {
    id: buildId("pipeline"),
    moduleId,
    createdAt: new Date().toISOString(),
    status: "completed",
    steps,
    results: [],
  };
  let previousOutput = moduleRecord
    ? {
        envelope: {
          module: moduleId,
          content: moduleRecord.content,
          summary: moduleRecord.summary,
        },
        severity: moduleRecord.severity || 0,
      }
    : null;
  for (const step of steps) {
    if (!step.agent || !AGENTS.includes(step.agent)) {
      throw new Error("Pipeline steps must declare a supported agent");
    }
    const flow = await executeAgentFlow(
      env,
      {
        intent: normalizeText(step.intent) || moduleRecord?.summary || `Pipeline for ${moduleId}`,
        source,
        agent: step.agent,
      },
      {
        initialAgent: step.agent,
        allowChaining: false,
        source,
        previousOutput,
        kind: "pipeline-step",
      },
    );
    previousOutput = flow.outputs[0]?.output || previousOutput;
    pipeline.results.push({ agent: step.agent, flow });
  }
  await putRecord(env, "PIPELINES", pipeline.id, pipeline);
  await emitEvent(env, "pipeline-executed", {
    moduleId,
    details: `Pipeline ${pipeline.id} executed for module ${moduleId}.`,
  });
  const pipelineDecision = await getCloudflarePipelineDecision(governance, moduleId);
  const crossDivision = await getCloudflareCrossDivisionSync(governance, env);
  const orchestration = await getCloudflareOrchestration(governance, env, { moduleIds: [moduleId] });
  const execution = await getCloudflareExecution(governance, env, { moduleIds: [moduleId] });
  const marketplaceFields = getOperatorMarketplaceCrossDivisionFields(crossDivision);
  const orchestrationFields = getCloudflarePipelineOrchestrationFields(orchestration);
  const executionFields = getCloudflarePipelineExecutionFields(execution);
  return {
    ...pipeline,
    cloudflareBindings: await getCloudflareBindingsInspection(),
    cloudflareBindingValidation,
    cloudflareBindingHealth: cloudflareBindingHealth.health,
    ...pipelineDecision,
    ...marketplaceFields,
    ...orchestrationFields,
    ...executionFields,
  };
}

async function runSandbox(env, payload) {
  const agent = normalizeText(payload.agent);
  const input = normalizeText(payload.input);
  if (!AGENTS.includes(agent) || !input) {
    throw new Error("sandbox agent and input are required");
  }
  await enforceGovernance(env, "sandbox", payload, {
    requestedChainLength: 1,
    chain: [agent],
    agent,
  });
  const intentRecord = buildIntentRecord({ intent: input, source: "sandbox", agent });
  const output = await executeAgent(intentRecord, env, {
    previousOutput: null,
    chain: [agent],
    payloadId: null,
  });
  const record = {
    id: buildId("sandbox"),
    agent,
    input,
    output,
    summary: output.summary || `Sandbox run for ${agent}.`,
    createdAt: new Date().toISOString(),
  };
  await putRecord(env, "SANDBOX_LOGS", record.id, record);
  await emitEvent(env, "sandbox-executed", {
    agent,
    details: `Sandbox run ${record.id} executed for ${agent}.`,
  });
  return record;
}

async function createOperatorIntent(env, payload) {
  const goal = normalizeText(payload.goal);
  if (!goal) {
    throw new Error("goal is required");
  }
  const routePlan = await computeGlobalRoutePlan(env, {
    intent: goal,
    mode: "manual",
    context: {
      priority: normalizeText(payload.priority) || "medium",
      constraints: Array.isArray(payload.constraints) ? payload.constraints : [],
    },
  });
  const record = {
    id: buildId("op-intent"),
    goal,
    constraints: Array.isArray(payload.constraints) ? payload.constraints : [],
    priority: normalizeText(payload.priority) || "medium",
    createdAt: new Date().toISOString(),
    routePlan,
  };
  await putRecord(env, "OPERATOR_INTENTS", record.id, record);
  await emitEvent(env, "operator-intent-created", {
    agent: routePlan.selectedAgent,
    details: `Operator intent ${record.id} created for ${routePlan.selectedAgent}.`,
  });
  return record;
}

async function runPublicScenario(env, payload) {
  const name = normalizeText(payload.name);
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  if (!name || !steps.length) {
    throw new Error("name and steps are required");
  }
  const governance = await enforceGovernance(
    env,
    "publicScenario",
    {
      ...payload,
      integrationId: getIntegrationIdFromPayload(payload),
    },
    {
      requestedChainLength: steps.length,
      requiredPermission: "scenario",
      chain: steps.map((step) => lightweightSemanticScore(normalizeText(step.intent)).recommendedAgent),
    },
  );
  const plannedAgents = [];
  for (const step of steps) {
    const previewPlan = await computeGlobalRoutePlan(env, {
      intent: normalizeText(step.intent),
      mode: "auto",
      context: { surface: "public-scenario-preview" },
    });
    plannedAgents.push(previewPlan.selectedAgent);
  }
  await assertCertifiedAgents(env, plannedAgents, "public-scenario", governance);
  const record = {
    id: buildId("public-scenario"),
    name,
    createdAt: new Date().toISOString(),
    steps,
    results: [],
  };
  for (const step of steps) {
    const plan = await computeGlobalRoutePlan(env, {
      intent: normalizeText(step.intent),
      mode: "auto",
      context: { surface: "public-scenario" },
    });
    const flow = await executeAgentFlow(
      env,
      {
        intent: normalizeText(step.intent),
        source: "public-scenario",
        agent: plan.selectedAgent,
      },
      {
        initialAgent: plan.selectedAgent,
        allowChaining: true,
        source: "public-scenario",
        kind: "public-scenario",
      },
    );
    record.results.push({ plan, flow });
  }
  await putRecord(env, "PUBLIC_SCENARIOS", record.id, record);
  await emitEvent(env, "public-scenario-executed", {
    details: `Public scenario ${record.id} executed with ${steps.length} steps.`,
  });
  return record;
}

function deriveModuleId(textValue) {
  const text = textValue.toLowerCase();

  if (text.includes("cockpit") || text.includes("multi-agent")) {
    return "multi-agent-cockpit";
  }

  if (text.includes("doctrine")) {
    return "msh-ops-doctrine";
  }

  if (text.includes("scenario")) {
    return "scenario-engine";
  }

  if (text.includes("automation") || text.includes("n8n")) {
    return "n8n-automation-packs";
  }

  if (text.includes("threat") || text.includes("report")) {
    return "ai-agent-threat-report";
  }

  return "multi-agent-cockpit";
}

function deriveModuleName(moduleId) {
  return moduleId.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function deriveModuleCategory(moduleId) {
  const map = [
    { match: "cockpit", slug: "operations", label: "Operations" },
    { match: "doctrine", slug: "doctrine", label: "Doctrine" },
    { match: "scenario", slug: "scenarios", label: "Scenarios" },
    { match: "automation", slug: "automation", label: "Automation" },
    { match: "report", slug: "intelligence", label: "Intelligence" },
    { match: "threat", slug: "intelligence", label: "Intelligence" },
  ];

  const hit = map.find((entry) => moduleId.includes(entry.match));
  return hit || { slug: "operators", label: "Operators" };
}

function hourBucket(value) {
  return new Date(value).getHours();
}

function emptyHourSeries() {
  return Array.from({ length: 24 }, () => 0);
}

function lightweightSemanticScore(intentText) {
  const text = intentText.toLowerCase();
  const lanes = [
    {
      lane: "routing-lane",
      recommendedAgent: "route-advisory",
      keywords: ["route", "lane", "intent", "decision", "classify"],
    },
    {
      lane: "payload-lane",
      recommendedAgent: "payload-generator",
      keywords: ["payload", "json", "module", "envelope", "content"],
    },
    {
      lane: "escalation-lane",
      recommendedAgent: "operator-sentinel",
      keywords: ["anomaly", "incident", "urgent", "breach", "escalate", "critical"],
    },
    {
      lane: "sync-lane",
      recommendedAgent: "marketplace-sync",
      keywords: ["marketplace", "publish", "sync", "public page", "listing", "update", "refresh"],
    },
  ];

  const scored = lanes.map((entry) => {
    const matches = entry.keywords.filter((keyword) => text.includes(keyword)).length;
    return {
      ...entry,
      confidence: Math.min(0.98, 0.22 + matches * 0.18),
    };
  });

  const winner = scored.sort((left, right) => right.confidence - left.confidence)[0];
  return {
    lane: winner.lane,
    confidence: Number(winner.confidence.toFixed(2)),
    recommendedAgent: winner.recommendedAgent,
  };
}

function scoreSeverity(textValue) {
  const text = textValue.toLowerCase();
  let severity = 18;
  const weights = [
    ["critical", 34],
    ["urgent", 22],
    ["breach", 28],
    ["exploit", 24],
    ["incident", 18],
    ["anomaly", 16],
    ["escalate", 14],
    ["failure", 12],
    ["attack", 16],
    ["leak", 18],
    ["error", 18],
    ["issue", 12],
  ];

  for (const [keyword, weight] of weights) {
    if (text.includes(keyword)) {
      severity += weight;
    }
  }

  return Math.min(100, severity);
}

function buildIntentRecord(normalizedIntent, overrides = {}) {
  return {
    id: overrides.id || buildId("intent"),
    source: overrides.source || normalizedIntent.source,
    agent: overrides.agent || normalizedIntent.agent,
    intent: normalizedIntent.intent,
    receivedAt: new Date().toISOString(),
    triggerPayloadId: overrides.triggerPayloadId || null,
  };
}

function buildPayloadRecord(intentRecord, agentOutput, chain, durationMs) {
  return {
    id: buildId("payload"),
    intentId: intentRecord.id,
    agent: intentRecord.agent,
    source: intentRecord.source,
    intent: intentRecord.intent,
    createdAt: new Date().toISOString(),
    summary: agentOutput.summary,
    output: agentOutput,
    chain,
    annotations: [],
    triggerPayloadId: intentRecord.triggerPayloadId,
    executionDurationMs: durationMs,
  };
}

function buildRoutingLog(intentRecord, agentOutput, chain, durationMs, kind = "direct") {
  return {
    id: buildId("rt"),
    intent: intentRecord.intent,
    agent: intentRecord.agent,
    timestamp: new Date().toISOString(),
    summary: agentOutput.summary,
    kind,
    chain,
    triggerPayloadId: intentRecord.triggerPayloadId,
    executionDurationMs: durationMs,
  };
}

async function routeAdvisory(intentRecord) {
  const result = lightweightSemanticScore(intentRecord.intent);
  return {
    lane: result.lane,
    confidence: result.confidence,
    recommendedAgent: result.recommendedAgent === "route-advisory" ? "payload-generator" : result.recommendedAgent,
    summary: `Intent classified into ${result.lane} with ${Math.round(result.confidence * 100)}% confidence.`,
  };
}

async function payloadGenerator(intentRecord) {
  const moduleId = deriveModuleId(intentRecord.intent);
  return {
    envelope: {
      id: `pl-${Date.now()}`,
      type: "module",
      module: moduleId,
      summary: `Payload generated for ${moduleId}.`,
      content: `Structured payload prepared from intent: ${intentRecord.intent}`,
      createdAt: new Date().toISOString(),
    },
    recommendedAgent: "marketplace-sync",
    summary: `Structured payload envelope generated for ${moduleId}.`,
  };
}

async function operatorSentinel(intentRecord, env, context) {
  const severity = scoreSeverity(intentRecord.intent);
  let escalationId = null;
  let escalated = false;

  if (severity > 60) {
    escalated = true;
    escalationId = buildId("esc");
    const escalation = {
      id: escalationId,
      payloadId: context.payloadId,
      intentId: intentRecord.id,
      agent: intentRecord.agent,
      severity,
      summary: `Operator escalation generated for payload ${context.payloadId}.`,
      details: `Severity ${severity} triggered from intent: ${intentRecord.intent}`,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    await putRecord(env, "ESCALATIONS", escalation.id, escalation);
    await emitEvent(env, "escalation-created", {
      escalationId: escalation.id,
      payloadId: escalation.payloadId,
      agent: "operator-sentinel",
      details: `Escalation ${escalation.id} created at severity ${severity}.`,
    });
  }

  return {
    severity,
    escalated,
    escalationId,
    summary: escalated
      ? `Severity ${severity} triggered operator escalation ${escalationId}.`
      : `Severity ${severity} remained below escalation threshold.`,
  };
}

async function marketplaceSync(intentRecord, env, context) {
  const moduleId = context.previousOutput?.envelope?.module || deriveModuleId(intentRecord.intent);
  const moduleName = deriveModuleName(moduleId);
  const content =
    context.previousOutput?.envelope?.content ||
    `Marketplace module content derived from intent: ${intentRecord.intent}`;
  const summary =
    context.previousOutput?.envelope?.summary ||
    `Marketplace sync completed for ${moduleId}.`;
  const existing = await getRecord(env, "MODULES", moduleId);

  const record = {
    id: moduleId,
    name: moduleName,
    summary,
    content,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agent: "marketplace-sync",
    lineage: context.chain,
    publicUrl: `/marketplace/${moduleId}`,
    publishedAt: existing?.publishedAt || null,
    annotations: existing?.annotations || [],
    categorySlug: existing?.categorySlug || deriveModuleCategory(moduleId).slug,
    category: existing?.category || deriveModuleCategory(moduleId).label,
    severity: existing?.severity || context.previousOutput?.severity || 0,
    lastPayloadId: context.payloadId || existing?.lastPayloadId || null,
  };

  await putRecord(env, "MODULES", record.id, record);
  await emitEvent(env, "module-synced", {
    moduleId: record.id,
    agent: "marketplace-sync",
    details: `Module ${record.id} synced to public URL ${record.publicUrl}.`,
  });

  return {
    moduleId: record.id,
    synced: true,
    publicUrl: record.publicUrl,
    summary: `Marketplace sync completed for ${record.id}.`,
  };
}

async function executeAgent(intentRecord, env, context = {}) {
  if (intentRecord.agent === "route-advisory") {
    return routeAdvisory(intentRecord);
  }

  if (intentRecord.agent === "payload-generator") {
    return payloadGenerator(intentRecord);
  }

  if (intentRecord.agent === "operator-sentinel") {
    return operatorSentinel(intentRecord, env, context);
  }

  if (intentRecord.agent === "marketplace-sync") {
    return marketplaceSync(intentRecord, env, context);
  }

  throw new Error("Unsupported agent");
}

async function executeAgentFlow(env, normalizedIntent, options = {}) {
  await enforceGovernance(env, options.surface || "route", normalizedIntent, {
    requestedChainLength: options.maxDepth || 4,
    chain: [options.initialAgent || normalizedIntent.agent].filter(Boolean),
    agent: options.initialAgent || normalizedIntent.agent,
  });
  const visited = new Set();
  const payloadIds = [];
  const routingIds = [];
  const outputs = [];
  const chain = [];
  const rootIntentId = buildId("intent");
  let currentAgent = options.initialAgent || normalizedIntent.agent;
  let previousOutput = options.previousOutput || null;
  let currentPayloadId = null;
  let depth = 0;

  while (currentAgent && depth < 4 && !visited.has(currentAgent)) {
    visited.add(currentAgent);
    chain.push(currentAgent);
    const intentRecord = buildIntentRecord(normalizedIntent, {
      id: rootIntentId,
      source: options.source || normalizedIntent.source,
      agent: currentAgent,
      triggerPayloadId: options.triggerPayloadId || null,
    });

    const startedAt = Date.now();
    let agentOutput;
    try {
      agentOutput = await executeAgent(intentRecord, env, {
        previousOutput,
        chain: [...chain],
        payloadId: currentPayloadId,
      });
    } catch (error) {
      await emitEvent(env, "agent-failed", {
        payloadId: currentPayloadId,
        agent: currentAgent,
        details: `Agent ${currentAgent} failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      throw error;
    }
    let durationMs = Date.now() - startedAt;

    let payloadRecord = buildPayloadRecord(intentRecord, agentOutput, [...chain], durationMs);
    currentPayloadId = payloadRecord.id;

    if (currentAgent === "operator-sentinel" && agentOutput.escalated) {
      payloadRecord = buildPayloadRecord(intentRecord, agentOutput, [...chain], durationMs);
      currentPayloadId = payloadRecord.id;
    }

    await putRecord(env, "PAYLOADS", payloadRecord.id, payloadRecord);
    payloadIds.push(payloadRecord.id);

    const routingLog = buildRoutingLog(intentRecord, agentOutput, [...chain], durationMs, depth === 0 ? options.kind || "direct" : "chained");
    await putRecord(env, "ROUTING_LOGS", routingLog.id, routingLog);
    routingIds.push(routingLog.id);

    await emitEvent(env, "agent-executed", {
      payloadId: payloadRecord.id,
      agent: currentAgent,
      details: `Agent ${currentAgent} executed in ${durationMs}ms.`,
    });

    outputs.push({
      agent: currentAgent,
      payloadId: payloadRecord.id,
      output: agentOutput,
      executionDurationMs: durationMs,
    });

    previousOutput = agentOutput;
    currentAgent = options.allowChaining === false ? null : agentOutput.recommendedAgent || null;
    depth += 1;
  }

  if (chain.length > 1) {
    await emitEvent(env, "chain-executed", {
      payloadId: payloadIds[0] || null,
      agent: chain[0],
      details: `Chain executed: ${chain.join(" -> ")}.`,
    });
  }

  return {
    intentId: rootIntentId,
    chain,
    payloadIds,
    routingIds,
    outputs,
    primary: outputs[0] || null,
  };
}

function toDynamicModuleSummary(moduleRecord) {
  return {
    id: moduleRecord.id,
    name: moduleRecord.name,
    description: moduleRecord.summary,
    tags: ["SYNCED", "MARKETPLACE"],
    status: moduleRecord.publishedAt ? "published" : "active",
    metadata: {
      num: "SYNC",
      route: moduleRecord.publicUrl,
      ctaHref: moduleRecord.publicUrl,
      ctaLabel: moduleRecord.publishedAt ? "OPEN PUBLISHED MODULE" : "OPEN MODULE",
      accessLevel: "public",
      category: "MARKETPLACE_SYNC",
      longDescription: moduleRecord.content,
      accessInstructions: ["Generated by marketplace-sync."],
      features: ["KV-backed sync record", "Public URL", "Operator-visible"],
      synced: true,
      publicUrl: moduleRecord.publicUrl,
      publishedAt: moduleRecord.publishedAt,
    },
    lastUpdated: moduleRecord.updatedAt || moduleRecord.createdAt,
  };
}

function toMarketplaceIndexItem(moduleRecord) {
  return {
    id: moduleRecord.id,
    name: moduleRecord.name,
    summary: moduleRecord.summary,
    content: moduleRecord.content,
    createdAt: moduleRecord.createdAt,
    publishedAt: moduleRecord.publishedAt,
    publicUrl: moduleRecord.publicUrl,
    agent: moduleRecord.agent,
    lineage: moduleRecord.lineage || [moduleRecord.agent],
    categorySlug: moduleRecord.categorySlug || deriveModuleCategory(moduleRecord.id).slug,
    category: moduleRecord.category || deriveModuleCategory(moduleRecord.id).label,
    severity: moduleRecord.severity || 0,
  };
}

async function listDynamicModules(env) {
  const records = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  return records.map(toDynamicModuleSummary);
}

async function listMarketplaceIndex(env) {
  const dynamicRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  return dynamicRecords
    .map(toMarketplaceIndexItem)
    .sort((left, right) => new Date(right.publishedAt || right.createdAt).getTime() - new Date(left.publishedAt || left.createdAt).getTime());
}

function rankMarketplaceSearch(items, term) {
  const query = term.toLowerCase();
  return items
    .map((item) => {
      let score = 0;
      if (item.name.toLowerCase().includes(query)) {
        score += 3;
      }
      if (item.summary.toLowerCase().includes(query)) {
        score += 2;
      }
      if ((item.content || "").toLowerCase().includes(query)) {
        score += 1;
      }
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);
}

async function logSearch(env, query, resultCount, source = "marketplace-search") {
  const record = {
    id: buildId("search"),
    query,
    resultCount,
    source,
    timestamp: new Date().toISOString(),
  };
  await putRecord(env, "SEARCH_LOGS", record.id, record);
  await emitEvent(env, "search-executed", {
    details: `Search "${query}" returned ${resultCount} results.`,
  });
  return record;
}

async function computeTelemetry(env) {
  const payloads = await listRecords(env, "PAYLOADS", STORE_CONFIG.PAYLOADS.limit);
  const escalations = await listRecords(env, "ESCALATIONS", STORE_CONFIG.ESCALATIONS.limit);
  const moduleRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  const routing = await listRecords(env, "ROUTING_LOGS", STORE_CONFIG.ROUTING_LOGS.limit);

  const agentExecutionCounts = payloads.reduce((accumulator, payload) => {
    accumulator[payload.agent] = (accumulator[payload.agent] || 0) + 1;
    return accumulator;
  }, {});

  const averageSeverity = escalations.length
    ? Number((escalations.reduce((sum, entry) => sum + (entry.severity || 0), 0) / escalations.length).toFixed(2))
    : 0;

  const chainFrequency = payloads.reduce((accumulator, payload) => {
    const key = Array.isArray(payload.chain) && payload.chain.length ? payload.chain.join(" -> ") : "single-step";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return {
    totalPayloads: payloads.length,
    totalEscalations: escalations.length,
    totalModules: moduleRecords.length + modules.length,
    totalRoutingLogs: routing.length,
    agentExecutionCounts,
    averageSeverity,
    chainFrequency,
  };
}

async function computeAnalytics(env) {
  const payloads = await listRecords(env, "PAYLOADS", STORE_CONFIG.PAYLOADS.limit);
  const escalations = await listRecords(env, "ESCALATIONS", STORE_CONFIG.ESCALATIONS.limit);
  const moduleRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  const autonomyLogs = await listRecords(env, "AUTONOMY_LOGS", STORE_CONFIG.AUTONOMY_LOGS.limit);
  const searchLogs = await listRecords(env, "SEARCH_LOGS", STORE_CONFIG.SEARCH_LOGS.limit);
  const events = await listRecords(env, "EVENTS", STORE_CONFIG.EVENTS.limit);

  const agentExecutionCounts = payloads.reduce((accumulator, payload) => {
    accumulator[payload.agent] = (accumulator[payload.agent] || 0) + 1;
    return accumulator;
  }, {});

  const averageExecutionTime = payloads.length
    ? Number((payloads.reduce((sum, payload) => sum + (payload.executionDurationMs || 0), 0) / payloads.length).toFixed(2))
    : 0;

  const chainFrequency = payloads.reduce((accumulator, payload) => {
    const key = Array.isArray(payload.chain) && payload.chain.length ? payload.chain.join(" -> ") : "single-step";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const escalationRate = payloads.length ? Number((escalations.length / payloads.length).toFixed(2)) : 0;
  const modulePublishRate = moduleRecords.length
    ? Number((moduleRecords.filter((entry) => entry.publishedAt).length / moduleRecords.length).toFixed(2))
    : 0;
  const autonomyLoopTriggers = autonomyLogs.length;
  const searchFrequency = searchLogs.length;
  const operatorCommandFrequency = events.filter((entry) => entry.type === "operator-command-executed").length;

  return {
    agentExecutionCounts,
    averageExecutionTime,
    chainFrequency,
    escalationRate,
    modulePublishRate,
    autonomyLoopTriggers,
    searchFrequency,
    operatorCommandFrequency,
  };
}

async function computeHeatmap(env) {
  const payloads = await listRecords(env, "PAYLOADS", STORE_CONFIG.PAYLOADS.limit);
  const escalations = await listRecords(env, "ESCALATIONS", STORE_CONFIG.ESCALATIONS.limit);
  const moduleRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);

  const agentExecutionDensity = Object.fromEntries(AGENTS.map((agent) => [agent, emptyHourSeries()]));
  const chainFrequencyByHour = emptyHourSeries();
  const modulePublishDistribution = emptyHourSeries();
  const escalationSeverityDistribution = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const payload of payloads) {
    const bucket = hourBucket(payload.createdAt);
    if (agentExecutionDensity[payload.agent]) {
      agentExecutionDensity[payload.agent][bucket] += 1;
    }
    if (Array.isArray(payload.chain) && payload.chain.length > 1) {
      chainFrequencyByHour[bucket] += 1;
    }
  }

  for (const escalation of escalations) {
    const severity = escalation.severity || 0;
    if (severity >= 81) {
      escalationSeverityDistribution.critical += 1;
    } else if (severity >= 61) {
      escalationSeverityDistribution.high += 1;
    } else if (severity >= 31) {
      escalationSeverityDistribution.medium += 1;
    } else {
      escalationSeverityDistribution.low += 1;
    }
  }

  for (const moduleRecord of moduleRecords) {
    if (moduleRecord.publishedAt) {
      modulePublishDistribution[hourBucket(moduleRecord.publishedAt)] += 1;
    }
  }

  return {
    agentExecutionDensity,
    chainFrequencyByHour,
    escalationSeverityDistribution,
    modulePublishDistribution,
  };
}

async function computeEcosystemData(env) {
  const dynamicRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  const fallbackRecords = modules.map((entry) => ({
    id: entry.id,
    name: entry.name,
    summary: entry.description,
    content: entry.metadata.longDescription,
    createdAt: entry.lastUpdated,
    publishedAt: entry.lastUpdated,
    publicUrl: entry.metadata.route || getModuleRoute(entry.id),
    categorySlug: String(entry.metadata.category || deriveModuleCategory(entry.id).slug).toLowerCase().replace(/\s+/g, "-"),
    category: entry.metadata.category || deriveModuleCategory(entry.id).label,
  }));
  const searchLogs = await listRecords(env, "SEARCH_LOGS", STORE_CONFIG.SEARCH_LOGS.limit);
  const routingLogs = await listRecords(env, "ROUTING_LOGS", STORE_CONFIG.ROUTING_LOGS.limit);
  const universe = [...dynamicRecords.map(toMarketplaceIndexItem), ...fallbackRecords];
  const categoriesMap = new Map();
  const scoreMap = new Map();

  for (const moduleRecord of universe) {
    const slug = moduleRecord.categorySlug || deriveModuleCategory(moduleRecord.id).slug;
    const label = moduleRecord.category || deriveModuleCategory(moduleRecord.id).label;
    categoriesMap.set(slug, {
      slug,
      label,
      count: (categoriesMap.get(slug)?.count || 0) + 1,
    });
    scoreMap.set(moduleRecord.id, 0);
  }

  for (const log of searchLogs) {
    const query = String(log.query || "").toLowerCase();
    for (const moduleRecord of universe) {
      if (query.includes(moduleRecord.id) || query.includes(moduleRecord.name.toLowerCase())) {
        scoreMap.set(moduleRecord.id, (scoreMap.get(moduleRecord.id) || 0) + 3);
      }
    }
  }

  for (const log of routingLogs) {
    const intent = String(log.intent || "").toLowerCase();
    for (const moduleRecord of universe) {
      if (intent.includes(moduleRecord.id) || intent.includes(moduleRecord.name.toLowerCase())) {
        scoreMap.set(moduleRecord.id, (scoreMap.get(moduleRecord.id) || 0) + 2);
      }
    }
  }

  const trendingModules = [...universe]
    .sort((left, right) => (scoreMap.get(right.id) || 0) - (scoreMap.get(left.id) || 0))
    .slice(0, 5)
    .map((moduleRecord) => ({
      ...moduleRecord,
      trendScore: scoreMap.get(moduleRecord.id) || 0,
    }));

  const recentlyPublishedModules = [...universe]
    .filter((moduleRecord) => moduleRecord.publishedAt)
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
    .slice(0, 5);

  const snapshot = {
    id: "ecosystem-latest",
    createdAt: new Date().toISOString(),
    categories: [...categoriesMap.values()].sort((left, right) => right.count - left.count),
    moduleCountsPerCategory: Object.fromEntries([...categoriesMap.values()].map((entry) => [entry.slug, entry.count])),
    recentlyPublishedModules,
    trendingModules,
  };

  await putRecord(env, "ECOSYSTEM", snapshot.id, snapshot);
  return snapshot;
}

async function runScenario(env, payload) {
  const name = normalizeText(payload.name);
  const steps = Array.isArray(payload.steps) ? payload.steps : [];

  if (!name || !steps.length) {
    throw new Error("name and steps are required");
  }
  const governance = await enforceGovernance(
    env,
    "scenario",
    payload,
    {
      requestedChainLength: steps.length,
      chain: steps.map((step) => normalizeText(step.agent)).filter(Boolean),
    },
  );
  await assertCertifiedAgents(
    env,
    steps.map((step) => normalizeText(step.agent)).filter(Boolean),
    "scenario",
    governance,
  );

  const scenario = {
    id: buildId("scenario"),
    name,
    createdAt: new Date().toISOString(),
    steps,
    results: [],
  };
  let previousOutput = null;

  for (const step of steps) {
    if (!step.agent || !AGENTS.includes(step.agent)) {
      throw new Error("Scenario steps must declare a supported agent");
    }
    const intent = normalizeText(step.intent) || normalizeText(previousOutput?.envelope?.content) || name;
    const flow = await executeAgentFlow(
      env,
      { intent, source: "scenario-engine", agent: step.agent },
      {
        initialAgent: step.agent,
        allowChaining: false,
        source: "scenario-engine",
        previousOutput,
        kind: "scenario-step",
      },
    );
    previousOutput = flow.outputs[0]?.output || previousOutput;
    scenario.results.push({
      step: step.agent,
      intent,
      flow,
    });
  }

  await putRecord(env, "SCENARIOS", scenario.id, scenario);
  await emitEvent(env, "scenario-executed", {
    agent: scenario.steps[0]?.agent || null,
    details: `Scenario ${scenario.name} executed with ${scenario.steps.length} steps.`,
  });
  return scenario;
}

async function runKvHealthCheck(env) {
  const kvHealth = {};
  const timestamp = new Date().toISOString();

  for (const [logicalName, config] of Object.entries(STORE_CONFIG)) {
    const binding = env[config.envKey];
    if (!binding) {
      kvHealth[logicalName] = "memory";
      continue;
    }
    try {
      const key = `${config.prefix}:heartbeat-check`;
      await binding.put(key, timestamp);
      const value = await binding.get(key);
      kvHealth[logicalName] = value === timestamp ? "ok" : "degraded";
    } catch {
      kvHealth[logicalName] = "error";
    }
  }

  return kvHealth;
}

async function computeHeartbeat(env) {
  const latestAutonomy = (await listRecords(env, "AUTONOMY_LOGS", 1))[0] || null;
  const latestEvent = (await listRecords(env, "EVENTS", 1))[0] || null;
  const latestAudit = (await listRecords(env, "AUDIT", 1))[0] || null;
  const latestModule = (await listRecords(env, "MODULES", 1))[0] || null;
  const latestEscalation = (await listRecords(env, "ESCALATIONS", 1))[0] || null;
  const kvHealth = await runKvHealthCheck(env);

  return {
    lastAutonomyLoopRun: latestAutonomy?.createdAt || null,
    lastEventEmitted: latestEvent?.timestamp || null,
    lastOperatorAction: latestAudit?.timestamp || null,
    lastModulePublish: latestModule?.publishedAt || null,
    lastEscalation: latestEscalation?.createdAt || null,
    agentHealth: Object.fromEntries(AGENTS.map((agent) => [agent, "online"])),
    kvHealth,
  };
}

async function computeOsHeartbeat(env) {
  const base = await computeHeartbeat(env);
  const routingHealth = (await listRecords(env, "OS_ROUTING", 1))[0] || null;
  const memoryHealth = (await listRecords(env, "DIVISION_MEMORY", 1)).length >= 0 ? "online" : "offline";
  const pipelineHealth = (await listRecords(env, "PIPELINES", 1))[0] ? "online" : "idle";
  const sandboxHealth = (await listRecords(env, "SANDBOX_LOGS", 1))[0] ? "online" : "idle";
  const configHealth = (await getRecord(env, "OS_CONFIG", "current")) ? "online" : "default";
  const publicScenarioHealth = (await listRecords(env, "PUBLIC_SCENARIOS", 1))[0] ? "online" : "idle";
  const autonomyHealth = (await listRecords(env, "AUTONOMY_LOGS", 1))[0] ? "online" : "idle";
  const governanceHealth = (await getRecord(env, "GOVERNANCE", "current")) ? "online" : "default";
  const releaseHealth = (await listRecords(env, "RELEASES", 1))[0] ? "online" : "idle";
  const integrationHealth = (await listRecords(env, "INTEGRATIONS", 1))[0] ? "online" : "idle";
  const certificationHealth = (await listRecords(env, "CERTIFICATION", 1))[0] ? "online" : "idle";
  const latestSafetyDecision = (await getRecentGovernanceDecisions(env, 1))[0] || null;
  const versionInfo = await getOsVersion(env);
  const startedAtRecord = await getRecord(env, "HEARTBEAT", "division-started-at");
  let startedAt = startedAtRecord?.startedAt;
  if (!startedAt) {
    startedAt = new Date().toISOString();
    await putRecord(env, "HEARTBEAT", "division-started-at", {
      id: "division-started-at",
      startedAt,
      createdAt: startedAt,
    });
  }
  let cfHeartbeat = buildAdvisoryHeartbeatFallback();
  try {
    const cloudflareObservability = await getCloudflareHeartbeatDeep();
    const federationReadiness = await getCloudflareFederationReadiness();
    const federationHeartbeat = await getCloudflareFederationHeartbeat();
    const actionHealth = federationReadiness.actionHealth || (await getCloudflareActionHealthSummary());
    const governance = await getGovernanceConfig(env);
    const cloudflareAutonomous = await getCloudflareAutonomousSnapshot(governance);
    const cloudflareInsights = await getCloudflareInsights(governance);
    const cloudflareDecision = await getCloudflareDecision(governance);
    const [cloudflareAutomation, cloudflareCertification, cloudflareCrossDivision, cloudflareOrchestration, cloudflareExecution] = await Promise.all([
      getCloudflareAutomationLoops(governance),
      getMarketplaceCloudflareCertification(governance, modules.map((entry) => entry.id)),
      getCloudflareCrossDivisionSync(governance, env),
      getCloudflareOrchestration(governance, env, { moduleIds: modules.map((entry) => entry.id) }),
      getCloudflareExecution(governance, env, { moduleIds: modules.map((entry) => entry.id) }),
    ]);
    const cloudflareAdaptive = buildCloudflareAdaptiveFromSignals({
      orchestration: cloudflareOrchestration,
      crossDivision: cloudflareCrossDivision,
      certification: cloudflareCertification,
      decision: cloudflareDecision,
      execution: cloudflareExecution,
      automation: cloudflareAutomation,
      insights: cloudflareInsights,
      autonomous: cloudflareAutonomous,
    });
    const cloudflarePredictive = buildCloudflarePredictiveFromSignals({
      adaptive: cloudflareAdaptive,
      orchestration: cloudflareOrchestration,
      crossDivision: cloudflareCrossDivision,
      certification: cloudflareCertification,
      decision: cloudflareDecision,
      execution: cloudflareExecution,
      automation: cloudflareAutomation,
      insights: cloudflareInsights,
      autonomous: cloudflareAutonomous,
    });
    const cloudflareStrategic = buildCloudflareStrategicFromSignals({
      predictive: cloudflarePredictive,
      adaptive: cloudflareAdaptive,
      orchestration: cloudflareOrchestration,
      crossDivision: cloudflareCrossDivision,
      certification: cloudflareCertification,
      decision: cloudflareDecision,
      execution: cloudflareExecution,
      automation: cloudflareAutomation,
      insights: cloudflareInsights,
      autonomous: cloudflareAutonomous,
    });
    const cloudflareUcip = buildCloudflareUcipFromSignals({
      automation: cloudflareAutomation,
      autonomous: cloudflareAutonomous,
      decision: cloudflareDecision,
      certification: cloudflareCertification,
      crossDivision: cloudflareCrossDivision,
      orchestration: cloudflareOrchestration,
      execution: cloudflareExecution,
      adaptive: cloudflareAdaptive,
      predictive: cloudflarePredictive,
      strategic: cloudflareStrategic,
      insights: cloudflareInsights,
    });
    const heartbeatModuleIds = modules.map((entry) => entry.id);
    const metaStack = await resolveMetaIntelligenceStack(
      governance,
      env,
      {
        cloudflareUcip,
        moduleIds: heartbeatModuleIds,
        heartbeat: { governanceHealth, pipelineEngineHealth: pipelineHealth },
      },
      "heartbeat",
    );
    const cloudflareAmg = metaStack.cloudflareAmg;
    const cloudflareCba = metaStack.cloudflareCba;
    const cloudflareCal = metaStack.cloudflareCal;
    const cloudflareIhl = metaStack.cloudflareIhl;
    const cloudflareIarl = metaStack.cloudflareIarl;
    const cloudflareAcl = metaStack.cloudflareAcl;
    const triggers = cloudflareAutonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
    const expandedFederationScore = getExpandedFederationScore(
      federationHeartbeat.cloudflareFederationScore,
      cloudflareAutonomous.cloudflareSafety?.autonomousScore,
      cloudflareInsights.cloudflareInsightsScore,
      triggers,
    );
    cfHeartbeat = buildCloudflareHeartbeatFields({
      federationReadiness,
      federationHeartbeat,
      cloudflareObservability,
      cloudflareAutonomous,
      cloudflareInsights,
      cloudflareDecision,
      cloudflareAutomation,
      cloudflareCertification,
      cloudflareCrossDivision,
      cloudflareOrchestration,
      cloudflareExecution,
      cloudflareAdaptive,
      cloudflarePredictive,
      cloudflareStrategic,
      cloudflareUcip,
      cloudflareAmg,
      cloudflareCba,
      cloudflareCal,
      cloudflareIhl,
      cloudflareIarl,
      cloudflareAcl,
      expandedFederationScore,
      triggers,
      cloudflareAutonomousHealth: deriveAutonomousHealth(cloudflareAutonomous),
      cloudflareEventsHealth: deriveEventsHealth({ cloudflareEvents: cloudflareAutonomous.cloudflareEvents }),
    });
    if (metaStack.advisoryDegraded || metaStack.degraded) {
      cfHeartbeat = {
        ...cfHeartbeat,
        cloudflareAdvisoryDegraded: true,
        cloudflareAdvisoryDegradedReason:
          metaStack.federationMeta?.reasons?.[0] || "Meta-intelligence stack returned degraded advisory payload.",
      };
    }
  } catch (error) {
    cfHeartbeat = buildAdvisoryHeartbeatFallback(error);
  }
  return {
    ...base,
    globalRouterHealth: routingHealth ? "online" : "idle",
    memoryHealth,
    pipelineEngineHealth: pipelineHealth,
    sandboxHealth,
    configHealth,
    scenarioEngineHealth: publicScenarioHealth,
    autonomyLoopV2Health: autonomyHealth,
    governanceHealth,
    releaseHealth,
    integrationHealth,
    certificationHealth,
    safetyHealth: latestSafetyDecision?.allowed === false ? "warning" : "online",
    versionHealth: versionInfo.current || "v3.5",
    divisionUptimeStartedAt: startedAt,
    ...cfHeartbeat,
  };
}

async function updateHeartbeatSnapshot(env, overrides = {}) {
  const heartbeat = {
    id: "division-heartbeat",
    updatedAt: new Date().toISOString(),
    ...(await computeHeartbeat(env)),
    ...overrides,
  };
  await putRecord(env, "HEARTBEAT", heartbeat.id, heartbeat);

  if (Object.values(heartbeat.kvHealth || {}).some((status) => status === "error" || status === "degraded")) {
    await emitEvent(env, "heartbeat-warning", {
      details: "Heartbeat detected KV degradation in the division runtime.",
    });
  }

  return heartbeat;
}

async function resolveEscalation(env, escalationId) {
  const escalation = await getRecord(env, "ESCALATIONS", escalationId);
  if (!escalation) {
    return null;
  }

  escalation.resolvedAt = new Date().toISOString();
  await putRecord(env, "ESCALATIONS", escalation.id, escalation);
  await emitEvent(env, "escalation-resolved", {
    escalationId: escalation.id,
    payloadId: escalation.payloadId,
    details: `Escalation ${escalation.id} resolved.`,
  });
  return escalation;
}

async function publishModule(env, moduleId) {
  const moduleRecord = await getRecord(env, "MODULES", moduleId);
  if (!moduleRecord) {
    return null;
  }

  moduleRecord.publishedAt = new Date().toISOString();
  moduleRecord.updatedAt = moduleRecord.publishedAt;
  await putRecord(env, "MODULES", moduleRecord.id, moduleRecord);
  await emitEvent(env, "module-published", {
    moduleId: moduleRecord.id,
    details: `Module ${moduleRecord.id} published.`,
  });
  return moduleRecord;
}

async function annotatePayload(env, payloadId, annotationPayload) {
  const payload = await getRecord(env, "PAYLOADS", payloadId);
  if (!payload) {
    return null;
  }

  const annotation = normalizeAnnotationPayload(annotationPayload);
  if (!annotation.annotation) {
    throw new Error("annotation is required");
  }

  payload.annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
  payload.annotations.push({
    id: buildId("note"),
    annotation: annotation.annotation,
    createdAt: new Date().toISOString(),
  });

  await putRecord(env, "PAYLOADS", payload.id, payload);
  await emitEvent(env, "payload-annotated", {
    payloadId: payload.id,
    details: `Payload ${payload.id} annotated by operator.`,
  });
  return payload;
}

async function rerunPayloadChain(env, payloadId) {
  const payload = await getRecord(env, "PAYLOADS", payloadId);
  if (!payload) {
    return null;
  }

  const initialAgent = Array.isArray(payload.chain) && payload.chain.length ? payload.chain[0] : payload.agent;
  const flow = await executeAgentFlow(
    env,
    {
      intent: payload.intent,
      source: "operator-rerun",
      agent: initialAgent,
    },
    {
      initialAgent,
      allowChaining: true,
      source: "operator-rerun",
      triggerPayloadId: payload.id,
      kind: "operator-rerun",
    },
  );
  return flow;
}

async function executeOperatorCommand(env, commandText) {
  const command = normalizeText(commandText);
  if (!command) {
    throw new Error("command is required");
  }

  const parts = command.split(" ");
  const verb = parts[0];

  if (verb === "resolve" && parts[1]) {
    const escalation = await resolveEscalation(env, parts[1]);
    if (!escalation) {
      throw new Error("Escalation not found");
    }
    return { action: "resolve", escalation };
  }

  if (verb === "publish" && parts[1]) {
    const moduleRecord = await publishModule(env, parts[1]);
    if (!moduleRecord) {
      throw new Error("Module not found");
    }
    return { action: "publish", module: moduleRecord };
  }

  if (verb === "annotate" && parts[1] && parts.length > 2) {
    const payload = await annotatePayload(env, parts[1], { annotation: parts.slice(2).join(" ") });
    if (!payload) {
      throw new Error("Payload not found");
    }
    return { action: "annotate", payload };
  }

  if (verb === "rerun" && parts[1]) {
    const flow = await rerunPayloadChain(env, parts[1]);
    if (!flow) {
      throw new Error("Payload not found");
    }
    return { action: "rerun", flow };
  }

  if (verb === "route" && parts.length > 2) {
    const maybeAgent = parts[parts.length - 1];
    if (!AGENTS.includes(maybeAgent)) {
      throw new Error("Unknown agent in route command");
    }
    const intent = parts.slice(1, -1).join(" ");
    const flow = await executeAgentFlow(
      env,
      {
        intent,
        source: "operator-command",
        agent: maybeAgent,
      },
      {
        initialAgent: maybeAgent,
        allowChaining: true,
        source: "operator-command",
        kind: "operator-command",
      },
    );
    return { action: "route", flow };
  }

  throw new Error("Unsupported command");
}

async function handleMarketplaceIndex(request, env, url) {
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    (request.headers.get("accept") || "").includes("application/json");

  if (!wantsJson) {
    return serveStatic(request, env, "/marketplace");
  }

  const items = await listMarketplaceIndex(env);
  return json({ modules: items });
}

async function handleMarketplaceSearch(request, env, url, logSearches = true) {
  const term = normalizeText(url.searchParams.get("q"));
  const source = url.searchParams.get("source") || "marketplace-search";
  const items = await listMarketplaceIndex(env);
  const results = term ? rankMarketplaceSearch(items, term) : items;

  if (logSearches && term) {
    await logSearch(env, term, results.length, source);
  }

  return json({ query: term, results });
}

async function renderDynamicModulePage(env, moduleId) {
  const moduleRecord = await getRecord(env, "MODULES", moduleId);
  if (!moduleRecord) {
    return html("<h1>Module not found</h1>", 404);
  }

  const lineage = Array.isArray(moduleRecord.lineage) && moduleRecord.lineage.length
    ? moduleRecord.lineage.join(" -> ")
    : moduleRecord.agent;

  const markup = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(moduleRecord.name)} | MSHOPS.NET</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        font: 400 16px/1.7 Inter Tight, sans-serif;
        color: #f0eee8;
        background: linear-gradient(180deg, #050608 0%, #0a0d12 100%);
      }
      main {
        max-width: 820px;
        margin: 0 auto;
        padding: 28px;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        background: rgba(14, 17, 22, 0.92);
      }
      h1, h2 { margin-top: 0; }
      p { color: #97a0a8; }
      .eyebrow {
        color: #f2c14e;
        font: 600 12px/1.4 IBM Plex Mono, monospace;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .meta {
        display: grid;
        gap: 8px;
        margin-top: 24px;
      }
      .meta span {
        color: #52b8ff;
        font: 500 12px/1.4 IBM Plex Mono, monospace;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      a { color: #f2c14e; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">[ MARKETPLACE MODULE :: PUBLIC PAGE ]</p>
      <h1>${escapeHtml(moduleRecord.name)}</h1>
      <p>${escapeHtml(moduleRecord.summary)}</p>
      <h2>Content</h2>
      <p>${escapeHtml(moduleRecord.content)}</p>
      <div class="meta">
        <span>Created: ${escapeHtml(moduleRecord.createdAt)}</span>
        <span>Published: ${escapeHtml(moduleRecord.publishedAt || "pending")}</span>
        <span>Agent: ${escapeHtml(moduleRecord.agent)}</span>
        <span>Agent Lineage: ${escapeHtml(lineage)}</span>
      </div>
      <p><a href="/marketplace">Return to marketplace</a></p>
    </main>
  </body>
</html>`;

  return html(markup);
}

async function runAutonomyLoopV2(env, cronLabel = "manual") {
  const payloads = await listRecords(env, "PAYLOADS", 30);
  const actions = [];

  for (const payload of payloads) {
    const payloadText = `${payload.summary} ${payload.intent}`.toLowerCase();

    if ((payload.output?.severity || 0) > 80) {
      const escalation = payload.output?.escalationId ? await resolveEscalation(env, payload.output.escalationId) : null;
      const annotated = await annotatePayload(env, payload.id, {
        annotation: "Autonomy loop v2 auto-resolved high severity escalation.",
      });
      const action = {
        id: buildId("auto"),
        triggerPayloadId: payload.id,
        agent: "operator-sentinel",
        reason: "high-severity-auto-resolve",
        createdAt: new Date().toISOString(),
        cron: cronLabel,
        result: {
          escalationId: escalation?.id || null,
          annotationCount: annotated?.annotations?.length || 0,
        },
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "autonomy-loop-action", {
        payloadId: payload.id,
        escalationId: escalation?.id || null,
        agent: "operator-sentinel",
        details: "Autonomy loop auto-resolved high severity escalation and annotated payload.",
      });
      actions.push(action);
    }

    const moduleId = payload.output?.moduleId || payload.output?.envelope?.module || null;
    if (moduleId) {
      const moduleRecord = await getRecord(env, "MODULES", moduleId);
      if (moduleRecord && !moduleRecord.publishedAt) {
        const published = await publishModule(env, moduleId);
        const action = {
          id: buildId("auto"),
          triggerPayloadId: payload.id,
          agent: "marketplace-sync",
          reason: "auto-publish-module",
          createdAt: new Date().toISOString(),
          cron: cronLabel,
          result: {
            moduleId: published?.id || moduleId,
          },
        };
        await putRecord(env, "AUTONOMY_LOGS", action.id, action);
        await emitEvent(env, "autonomy-loop-action", {
          payloadId: payload.id,
          moduleId,
          agent: "marketplace-sync",
          details: `Autonomy loop auto-published module ${moduleId}.`,
        });
        actions.push(action);
      }
    }

    const chain = Array.isArray(payload.chain) ? payload.chain : [];
    if (chain.includes("route-advisory") && !chain.includes("payload-generator")) {
      const flow = await executeAgentFlow(
        env,
        { intent: payload.intent, source: "autonomy-loop", agent: "payload-generator" },
        {
          initialAgent: "payload-generator",
          allowChaining: true,
          source: "autonomy-loop",
          triggerPayloadId: payload.id,
          kind: "autonomy-chain",
        },
      );
      const action = {
        id: buildId("auto"),
        triggerPayloadId: payload.id,
        agent: "payload-generator",
        reason: "chain-incomplete",
        createdAt: new Date().toISOString(),
        cron: cronLabel,
        result: {
          payloadIds: flow.payloadIds,
        },
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "autonomy-loop-action", {
        payloadId: payload.id,
        agent: "payload-generator",
        details: "Autonomy loop completed missing chain agents.",
      });
      actions.push(action);
    }

    if (["update", "refresh", "sync"].some((keyword) => payloadText.includes(keyword))) {
      const flow = await executeAgentFlow(
        env,
        { intent: payload.intent, source: "autonomy-loop", agent: "marketplace-sync" },
        {
          initialAgent: "marketplace-sync",
          allowChaining: false,
          source: "autonomy-loop",
          triggerPayloadId: payload.id,
          kind: "autonomy-sync",
        },
      );
      const action = {
        id: buildId("auto"),
        triggerPayloadId: payload.id,
        agent: "marketplace-sync",
        reason: "refresh-sync-trigger",
        createdAt: new Date().toISOString(),
        cron: cronLabel,
        result: {
          payloadIds: flow.payloadIds,
        },
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "autonomy-loop-action", {
        payloadId: payload.id,
        agent: "marketplace-sync",
        details: "Autonomy loop re-ran marketplace-sync for refresh/update signal.",
      });
      actions.push(action);
    }
  }

  try {
    const governance = await getGovernanceConfig(env);
    const [autonomous, automation] = await Promise.all([
      getCloudflareAutonomousSnapshot(governance),
      getCloudflareAutomationLoops(governance),
    ]);
    const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
    if (triggers.length) {
      const action = {
        id: buildId("auto"),
        agent: "cloudflare-federation",
        reason: "cloudflare-autonomous-advisory",
        createdAt: new Date().toISOString(),
        cron: cronLabel,
        advisoryOnly: true,
        result: {
          triggers,
          autonomousScore: autonomous.cloudflareSafety?.autonomousScore ?? null,
          eventHooks: autonomous.cloudflareEvents || {},
        },
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "cloudflare-autonomous-advisory", {
        agent: "cloudflare-federation",
        details: `Cloudflare autonomous advisories: ${triggers.join(", ")}`,
      });
      actions.push(action);
    }
    if (automation.activeCount > 0) {
      const activeLoops = Object.entries(automation.loops || {})
        .filter(([, loop]) => loop.active)
        .map(([id]) => id);
      const action = {
        id: buildId("auto"),
        agent: "cloudflare-federation",
        reason: "cloudflare-automation-advisory",
        createdAt: new Date().toISOString(),
        cron: cronLabel,
        advisoryOnly: true,
        result: {
          activeLoops,
          loops: automation.loops,
          activeCount: automation.activeCount,
        },
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "cloudflare-automation-advisory", {
        agent: "cloudflare-federation",
        details: `Cloudflare automation loops active: ${activeLoops.join(", ")}`,
      });
      actions.push(action);
    }
  } catch {
    // Optional Cloudflare federation layer; never block autonomy loop.
  }

  return actions;
}

function makePublicModuleView(module) {
  return {
    id: module.id,
    name: module.name,
    summary: module.summary || module.description,
    publicUrl: module.publicUrl || module.metadata?.publicUrl || module.metadata?.route || `/marketplace/${module.id}`,
    publishedAt: module.publishedAt || module.metadata?.publishedAt || null,
  };
}

async function handleApi(request, env, url) {
  const method = request.method || "GET";
  const pathname = url.pathname;

  if (method === "POST" && pathname === "/api/service-selector") {
    try {
      const payload = await readBody(request);
      const answers = normalizeSelectorAnswers(payload);
      const result = computeServiceSelectorResult(answers);
      recordServiceSelectorSubmission(answers, result);
      return json(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json({ error: error.message || "service-selector-failed" }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/service-selector/catalog") {
    return json({
      services: serviceCatalog.filter((service) => service.active),
    });
  }

  if (method === "POST" && pathname === "/api/audit-lite") {
    try {
      const payload = await readBody(request);
      const answers = normalizeAuditLiteAnswers(payload);
      const result = computeAuditLiteResult(answers);
      recordAuditLiteSubmission(answers, result);
      const lifecycle = getAuditLiteLifecycle(result.audit_id, engagements);
      return json(
        {
          ...result,
          lifecycle,
          hq_health: getAuditLiteOperatorSnapshot(engagements).summary.health,
          route_table: intakeAgent.intakeRoutingTable?.audit_lite || null,
        },
        200,
        { "Cache-Control": "no-store" },
      );
    } catch (error) {
      return json({ error: error.message || "audit-lite-failed" }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/audit-lite/lifecycle") {
    const auditId = normalizeText(url.searchParams.get("audit_id"));
    if (!auditId) {
      return json({ error: "audit_id is required" }, 400);
    }

    const lifecycle = getAuditLiteLifecycle(auditId, engagements);
    if (!lifecycle) {
      return json({ error: "Audit lifecycle not found" }, 404);
    }

    return json(lifecycle, 200, { "Cache-Control": "no-store" });
  }

  if (method === "POST" && pathname === "/api/prompt-injection-scan") {
    try {
      const payload = await readBody(request);
      const answers = normalizePromptInjectionAnswers(payload);
      const result = computePromptInjectionResult(answers);
      recordPromptInjectionSubmission(answers, result);
      return json(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json({ error: error.message || "prompt-injection-scan-failed" }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/agent-readiness-check") {
    try {
      const payload = await readBody(request);
      const answers = normalizeAgentReadinessAnswers(payload);
      const result = computeAgentReadinessResult(answers);
      recordAgentReadinessSubmission(answers, result);
      return json(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json({ error: error.message || "agent-readiness-check-failed" }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/automation-roi-calculate") {
    try {
      const payload = await readBody(request);
      const answers = normalizeAutomationRoiAnswers(payload);
      const result = computeAutomationRoiResult(answers);
      recordAutomationRoiSubmission(answers, result);
      return json(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json({ error: error.message || "automation-roi-calculate-failed" }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/rag-risk-analyze") {
    try {
      const payload = await readBody(request);
      const answers = normalizeRagRiskAnswers(payload);
      const result = computeRagRiskResult(answers);
      recordRagRiskSubmission(answers, result);
      return json(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json({ error: error.message || "rag-risk-analyze-failed" }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/os/route") {
    try {
      const body = await readBody(request);
      return json(await computeGlobalRoutePlan(env, body), 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/os/route") {
    try {
      const routes = await listRecords(env, "OS_ROUTING", 100);
      return json({ routes });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/os/memory") {
    try {
      const memory = await listRecords(env, "DIVISION_MEMORY", 200);
      return json({ memory });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/os/memory") {
    try {
      const body = await readBody(request);
      return json(await saveDivisionMemoryEntry(env, body), 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "DELETE" && pathname.startsWith("/api/os/memory/")) {
    try {
      const key = pathname.split("/").pop();
      await deleteRecord(env, "DIVISION_MEMORY", key);
      await emitEvent(env, "division-memory-deleted", {
        details: `Division memory key ${key} deleted.`,
      });
      return json({ deleted: true, key });
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/os/config") {
    try {
      const config = await getOsConfig(env);
      const history = await listRecords(env, "OS_CONFIG", 20);
      return json({ config, history });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/os/config") {
    try {
      const body = await readBody(request);
      const saved = await saveOsConfig(env, body);
      await emitEvent(env, "os-config-updated", {
        details: "OS config updated.",
      });
      await recordAudit(env, "os-config", "Updated OS config.");
      return json(saved, 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/os/governance") {
    try {
      const config = await getGovernanceConfig(env);
      const decisions = await getRecentGovernanceDecisions(env, 50);
      const cloudflareGovernanceHealth = await getCloudflareGovernanceHealth(config);
      const cloudflareDecisioning = await getCloudflareGovernanceDecisioning(config, env);
      return json({
        config,
        decisions,
        cloudflareGovernanceHealth,
        cloudflareGovernance: {
          health: cloudflareGovernanceHealth.health,
          signals: cloudflareGovernanceHealth.signals,
          actionsHealth: cloudflareGovernanceHealth.actionsHealth,
          autonomousSignals: cloudflareGovernanceHealth.autonomousSignals,
          automationSignals: cloudflareDecisioning.automationSignals,
          certificationSignals: cloudflareDecisioning.certificationSignals,
          crossDivisionSignals: cloudflareDecisioning.crossDivisionSignals,
          crossDivisionRecommendedAction: cloudflareDecisioning.crossDivisionRecommendedAction,
          orchestrationSignals: cloudflareDecisioning.orchestrationSignals,
          orchestrationRecommendedAction: cloudflareDecisioning.orchestrationRecommendedAction,
          executionSignals: cloudflareDecisioning.executionSignals,
          executionRecommendedAction: cloudflareDecisioning.executionRecommendedAction,
          adaptiveSignals: cloudflareDecisioning.adaptiveSignals,
          adaptiveRecommendedAction: cloudflareDecisioning.adaptiveRecommendedAction,
          predictiveSignals: cloudflareDecisioning.predictiveSignals,
          predictiveRecommendedAction: cloudflareDecisioning.predictiveRecommendedAction,
          strategicSignals: cloudflareDecisioning.strategicSignals,
          strategicRecommendedAction: cloudflareDecisioning.strategicRecommendedAction,
          ucipSignals: cloudflareDecisioning.ucipSignals,
          ucipRecommendedAction: cloudflareDecisioning.ucipRecommendedAction,
          amgState: cloudflareDecisioning.amgState,
          amgRules: cloudflareDecisioning.amgRules,
          amgOperatorNudges: cloudflareDecisioning.amgOperatorNudges,
          amgPolicyHints: cloudflareDecisioning.amgPolicyHints,
          amgRecommendedAction: cloudflareDecisioning.amgRecommendedAction,
          cbaState: cloudflareDecisioning.cbaState,
          cbaBehaviorPatterns: cloudflareDecisioning.cbaBehaviorPatterns,
          cbaBehaviorDriftWarnings: cloudflareDecisioning.cbaBehaviorDriftWarnings,
          cbaBehaviorHints: cloudflareDecisioning.cbaBehaviorHints,
          calState: cloudflareDecisioning.calState,
          calAlignmentFindings: cloudflareDecisioning.calAlignmentFindings,
          calAlignmentWarnings: cloudflareDecisioning.calAlignmentWarnings,
          calAlignmentHints: cloudflareDecisioning.calAlignmentHints,
          calRecommendedAction: cloudflareDecisioning.calRecommendedAction,
          ihlState: cloudflareDecisioning.ihlState,
          ihlIntentFindings: cloudflareDecisioning.ihlIntentFindings,
          ihlIntentWarnings: cloudflareDecisioning.ihlIntentWarnings,
          ihlIntentHints: cloudflareDecisioning.ihlIntentHints,
          ihlRecommendedAction: cloudflareDecisioning.ihlRecommendedAction,
          iarlState: cloudflareDecisioning.iarlState,
          iarlResonanceFindings: cloudflareDecisioning.iarlResonanceFindings,
          iarlResonanceWarnings: cloudflareDecisioning.iarlResonanceWarnings,
          iarlResonanceHints: cloudflareDecisioning.iarlResonanceHints,
          iarlRecommendedAction: cloudflareDecisioning.iarlRecommendedAction,
          aclState: cloudflareDecisioning.aclState,
          aclCoherenceFindings: cloudflareDecisioning.aclCoherenceFindings,
          aclCoherenceWarnings: cloudflareDecisioning.aclCoherenceWarnings,
          aclCoherenceHints: cloudflareDecisioning.aclCoherenceHints,
          aclRecommendedAction: cloudflareDecisioning.aclRecommendedAction,
          advisoryOnly: cloudflareGovernanceHealth.advisoryOnly,
          decisioning: cloudflareDecisioning.decisioning,
          recommendedAction: cloudflareDecisioning.recommendedAction,
          riskSummary: cloudflareDecisioning.riskSummary,
        },
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/os/governance") {
    try {
      const body = await readBody(request);
      const saved = await saveGovernanceConfig(env, body);
      await recordAudit(env, "governance", "Updated governance config.");
      return json(saved, 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/os/safety/check") {
    try {
      const body = await readBody(request);
      return json(await evaluateSafetyCheck(env, body), 200);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/os/version") {
    let version = { current: "v3.5", history: ["v3.5"], lastUpgrade: null };
    try {
      version = await getOsVersion(env);
    } catch {
      // Version store optional — continue with safe defaults.
    }
    let cloudflareMcpHealth = buildCloudflareVersionHealthFallback(new Error("Cloudflare version health unavailable"));
    try {
      const governance = await getGovernanceConfig(env);
      cloudflareMcpHealth = await getCloudflareVersionHealth(governance, env);
    } catch (error) {
      cloudflareMcpHealth = buildCloudflareVersionHealthFallback(error);
    }
    return json({
      ...version,
      ...flattenCloudflareVersionHealthResponse(cloudflareMcpHealth),
    });
  }

  if (method === "POST" && pathname === "/api/os/version") {
    try {
      const body = await readBody(request);
      const current = await getOsVersion(env);
      const nextVersion = {
        current: normalizeText(body.current) || current.current,
        history: Array.isArray(body.history) && body.history.length ? body.history : [...new Set([...current.history, normalizeText(body.current) || current.current])],
        lastUpgrade: body.lastUpgrade || new Date().toISOString(),
      };
      const saved = await saveOsVersion(env, nextVersion);
      await recordAudit(env, "version", `Updated OS version to ${saved.current}.`);
      let cloudflareMcpHealth = buildCloudflareVersionHealthFallback(new Error("Cloudflare version health unavailable"));
      try {
        cloudflareMcpHealth = await getCloudflareVersionHealth(await getGovernanceConfig(env), env);
      } catch (error) {
        cloudflareMcpHealth = buildCloudflareVersionHealthFallback(error);
      }
      return json({
        ...saved,
        ...flattenCloudflareVersionHealthResponse(cloudflareMcpHealth),
      }, 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/os/integration") {
    try {
      return json({ integrations: await listIntegrations(env) });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/os/integration") {
    try {
      const body = await readBody(request);
      const integration = await createIntegration(env, body);
      await recordAudit(env, "integration", `Created integration ${integration.name}.`);
      return json(integration, 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "DELETE" && pathname.startsWith("/api/os/integration/")) {
    try {
      const integrationId = pathname.split("/").pop();
      const deleted = await deleteIntegration(env, integrationId);
      if (!deleted) {
        return notFound();
      }
      await recordAudit(env, "integration-delete", `Deleted integration ${deleted.name}.`);
      return json({ deleted: true, integration: deleted });
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/os/certify") {
    try {
      const body = await readBody(request);
      const certification = await runCertification(env, body);
      await recordAudit(env, "certification", `Ran certification for ${certification.agent}.`);
      return json(certification, 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/os/certification") {
    try {
      const certifications = await listRecords(env, "CERTIFICATION", 100);
      return json({ certifications });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/os/release") {
    try {
      const body = await readBody(request);
      const release = await applyRelease(env, body);
      await recordAudit(env, "release", `Applied release ${release.version}.`);
      return json(release, 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/os/releases/cloudflare") {
    try {
      return json(await getCloudflareBuildPreview());
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/os/releases") {
    try {
      const releases = await listRecords(env, "RELEASES", 100);
      return json({
        releases,
        cloudflareBuildStatus: await getCloudflareBuildStatus(),
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname.startsWith("/api/os/releases/")) {
    try {
      const releaseId = pathname.split("/").pop();
      const release = await getRecord(env, "RELEASES", releaseId);
      if (!release) {
        return notFound();
      }
      return json(release);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/operator/intent") {
    try {
      const body = await readBody(request);
      return json(await createOperatorIntent(env, body), 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/operator/intent") {
    try {
      const intents = await listRecords(env, "OPERATOR_INTENTS", 100);
      return json({ intents });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/pipeline") {
    try {
      const body = await readBody(request);
      return json(await runPipeline(env, body), 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/pipeline") {
    try {
      const pipelines = await listRecords(env, "PIPELINES", 100);
      const cloudflareBindingHealth = await getCloudflareBindingHealth();
      const governance = await getGovernanceConfig(env);
      const pipelineDecision = await getCloudflarePipelineDecision(governance);
      const crossDivision = await getCloudflareCrossDivisionSync(governance, env);
      const orchestration = await getCloudflareOrchestration(governance, env, { moduleIds: modules.map((entry) => entry.id) });
      const execution = await getCloudflareExecution(governance, env, { moduleIds: modules.map((entry) => entry.id) });
      const marketplaceFields = getOperatorMarketplaceCrossDivisionFields(crossDivision);
      const orchestrationFields = getCloudflarePipelineOrchestrationFields(orchestration);
      const executionFields = getCloudflarePipelineExecutionFields(execution);
      return json({
        pipelines,
        cloudflareBindings: cloudflareBindingHealth.inspection,
        cloudflareBindingHealth: cloudflareBindingHealth.health,
        cloudflareBindingValidation: cloudflareBindingHealth.validation,
        ...pipelineDecision,
        ...marketplaceFields,
        ...orchestrationFields,
        ...executionFields,
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/sandbox") {
    try {
      const body = await readBody(request);
      return json(await runSandbox(env, body), 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/sandbox") {
    try {
      const logs = await listRecords(env, "SANDBOX_LOGS", 100);
      return json({ logs });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/public/scenario") {
    try {
      const body = await readBody(request);
      return json(await runPublicScenario(env, body), 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/public/scenario") {
    try {
      const scenarios = await listRecords(env, "PUBLIC_SCENARIOS", 50);
      return json({ scenarios });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/os/heartbeat") {
    try {
      return json(await computeOsHeartbeat(env));
    } catch (error) {
      const fallback = buildCloudflareAdvisoryFallback("autonomous", error);
      return json({
        globalRouterHealth: "idle",
        memoryHealth: "idle",
        pipelineEngineHealth: "idle",
        governanceHealth: "default",
        versionHealth: "v3.5",
        advisoryOnly: true,
        degraded: true,
        ...buildCloudflareHeartbeatFields({}),
        cloudflareFederationHealth: "degraded",
        cloudflareFederationScore: fallback.score,
        reasons: fallback.reasons,
        error: error.message,
        checkedAt: new Date().toISOString(),
      });
    }
  }

  if (method === "GET" && pathname === "/api/os/federation/cloudflare") {
    try {
      return json(await getCloudflareFederationSnapshot());
    } catch (error) {
      return json({
        federation: "cloudflare-mcp",
        optional: true,
        advisoryOnly: true,
        degraded: true,
        ...buildCloudflareAdvisoryFallback("autonomous", error),
        checkedAt: new Date().toISOString(),
      });
    }
  }

  if (method === "GET" && pathname === "/api/os/cloudflare") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => getCloudflareIntegrationSnapshot(governance), "autonomous");
  }

  if (method === "GET" && pathname === "/docs/cloudflare-federation") {
    return html(getCloudflareFederationDocumentation("html"));
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/federation/routes") {
    return json(getCloudflareFederationRouteCatalog());
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/federation/docs") {
    return json(getCloudflareFederationDocumentation("json"));
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/sync") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const sync = await getCloudflareCrossDivisionSync(governance, env, {
        moduleIds: modules.map((entry) => entry.id),
      });
      return normalizeCrossDivisionFields({
        operatorShell: sync.operatorShell,
        marketplaceBackend: sync.marketplaceBackend,
        syncStatus: sync.syncStatus,
        crossDivisionScore: sync.crossDivisionScore,
        crossDivisionHealth: sync.crossDivisionHealth,
        crossDivisionReasons: sync.crossDivisionReasons,
        sources: sync.sources,
        checkedAt: sync.checkedAt,
      });
    }, "sync");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/cross-division") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const federation = await getCloudflareCrossDivisionFederation(governance, env, {
        moduleIds: modules.map((entry) => entry.id),
      });
      return normalizeCrossDivisionFields({
        cloudflareCrossDivisionScore: federation.cloudflareCrossDivisionScore,
        cloudflareCrossDivisionHealth: federation.cloudflareCrossDivisionHealth,
        cloudflareCrossDivisionReasons: federation.cloudflareCrossDivisionReasons,
        syncStatus: federation.syncStatus,
        operatorShell: federation.operatorShell,
        marketplaceBackend: federation.marketplaceBackend,
        routes: federation.routes,
        sources: federation.sources,
        checkedAt: federation.checkedAt,
      });
    }, "cross-division");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/automation") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const automation = await getCloudflareAutomationLoops(governance);
      return {
        loops: automation.loops,
        activeCount: automation.activeCount,
        health: automation.health,
        score: automation.score,
        mode: automation.mode,
        reasons: automation.reasons,
        checkedAt: automation.checkedAt,
      };
    }, "automation");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/autonomous") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => getCloudflareAutonomousSnapshot(governance), "autonomous");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/orchestration") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const orchestration = await getCloudflareOrchestration(governance, env, {
        moduleIds: modules.map((entry) => entry.id),
      });
      return {
        plan: orchestration.plan,
        agents: orchestration.agents,
        recommendedActions: orchestration.recommendedActions,
        orchestrationScore: orchestration.orchestrationScore,
        orchestrationHealth: orchestration.orchestrationHealth,
        orchestrationReasons: orchestration.orchestrationReasons,
        syncStatus: orchestration.syncStatus,
        checkedAt: orchestration.checkedAt,
      };
    }, "orchestration");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/agents") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareAgentSignals(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "agents",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/execution") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const execution = await getCloudflareExecution(governance, env, {
        moduleIds: modules.map((entry) => entry.id),
      });
      return {
        executionPlan: execution.executionPlan,
        nextActions: execution.nextActions,
        executionScore: execution.executionScore,
        executionHealth: execution.executionHealth,
        executionReasons: execution.executionReasons,
        syncStatus: execution.syncStatus,
        checkedAt: execution.checkedAt,
      };
    }, "execution");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/execution/signals") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareExecutionSignals(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "execution-signals",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/events") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const inputs = await collectAutonomousSignalInputs();
      const autonomousSignals = buildAutonomousGovernanceSignals(inputs, governance);
      return simulateCloudflareEventHooks(autonomousSignals, inputs);
    }, "events");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/insights") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => getCloudflareInsights(governance), "insights");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/decision") {
    const governance = await getGovernanceConfig(env);
    const moduleId = url.searchParams.get("moduleId") || null;
    return jsonCloudflareRoute(async () => getCloudflareDecision(governance, { moduleId }), "decision");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/adaptive") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareAdaptiveRuntime(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "adaptive",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/predictive") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflarePredictiveModeling(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "predictive",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/strategic") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareStrategicPlanning(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "strategic",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/ucip") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareUcip(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "ucip",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/amg") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareAmg(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "amg",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/cba") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareCba(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "cba",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/cal") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareCal(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "cal",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/ihl") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareIhl(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "ihl",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/iarl") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareIarl(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "iarl",
    );
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/acl") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () =>
        getCloudflareAcl(governance, env, {
          moduleIds: modules.map((entry) => entry.id),
        }),
      "acl",
    );
  }

  if (
    method === "GET" &&
    (pathname === "/api/marketplace/certification" || pathname === "/api/os/cloudflare/certification")
  ) {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const certification = await getMarketplaceCloudflareCertification(
        governance,
        modules.map((entry) => entry.id),
      );
      return {
        ...certification,
        modules: Object.values(certification.certifications || {}),
      };
    }, "certification");
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/docs") {
    try {
      const query = url.searchParams.get("q") || url.searchParams.get("query") || "";
      const topic = url.searchParams.get("topic") || null;
      return json(await searchCloudflareDocs(query, { topic }));
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/quick-actions") {
    try {
      const category = url.searchParams.get("category") || null;
      return json({ quickActions: getDocsQuickActions(category), topics: ["workers", "kv", "durable-objects", "email", "cloudflare-one", "security", "performance"] });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/logs") {
    try {
      return json(await getCloudflareLogs({
        worker: url.searchParams.get("worker") || undefined,
        hours: url.searchParams.get("hours") || undefined,
        limit: url.searchParams.get("limit") || undefined,
      }));
    } catch (error) {
      return json({ status: "degraded", health: "degraded", advisory: error.message, logs: [], checkedAt: new Date().toISOString() });
    }
  }

  if (method === "GET" && pathname === "/api/os/cloudflare/metrics") {
    try {
      return json(await getCloudflareMetrics({
        worker: url.searchParams.get("worker") || undefined,
        hours: url.searchParams.get("hours") || undefined,
      }));
    } catch (error) {
      return json({ status: "degraded", health: "degraded", advisory: error.message, metrics: [], checkedAt: new Date().toISOString() });
    }
  }

  if (method === "POST" && pathname === "/api/os/cloudflare/build") {
    try {
      const body = await readBody(request);
      return json(await runCloudflareBuild(body), 201);
    } catch (error) {
      return json({
        status: "requires_oauth",
        health: "requires_oauth",
        advisory: error.message,
        source: "advisory-fallback",
        logs: [],
        checkedAt: new Date().toISOString(),
      });
    }
  }

  if (method === "POST" && pathname === "/api/os/cloudflare/validate-bindings") {
    try {
      const body = await readBody(request);
      return json(await postValidateCloudflareBindings(body), 200);
    } catch (error) {
      return json({
        valid: false,
        status: "degraded",
        advisory: error.message,
        warnings: [error.message],
        checkedAt: new Date().toISOString(),
      });
    }
  }

  if (method === "POST" && pathname === "/api/os/cloudflare/logs/fetch") {
    try {
      const body = await readBody(request).catch(() => ({}));
      return json(await postFetchCloudflareLogs(body || {}));
    } catch {
      return json(await postFetchCloudflareLogs({}));
    }
  }

  if (method === "POST" && pathname === "/api/os/cloudflare/metrics/fetch") {
    try {
      const body = await readBody(request).catch(() => ({}));
      return json(await postFetchCloudflareMetrics(body || {}));
    } catch {
      return json(await postFetchCloudflareMetrics({}));
    }
  }

  if (method === "POST" && pathname === "/api/os/cloudflare/build/run") {
    try {
      const body = await readBody(request).catch(() => ({}));
      return json(await postRunCloudflareBuild(body || {}));
    } catch {
      return json(await postRunCloudflareBuild({}));
    }
  }

  if (method === "POST" && pathname === "/api/os/cloudflare/bindings/validate") {
    try {
      const body = await readBody(request).catch(() => ({}));
      return json(await postValidateCloudflareBindingsAction(body || {}));
    } catch {
      return json(await postValidateCloudflareBindingsAction({}));
    }
  }

  if (method === "POST" && pathname === "/api/os/cloudflare/docs/query") {
    try {
      const body = await readBody(request).catch(() => ({}));
      return json(await postQueryCloudflareDocs(body || {}));
    } catch {
      return json(await postQueryCloudflareDocs({ query: "workers observability" }));
    }
  }

  if (method === "POST" && pathname === "/api/intents") {
    try {
      const payload = await readBody(request);
      const normalized = normalizeIntentPayload(payload);

      if (!normalized.intent) {
        return json({ error: "intent is required" }, 400);
      }

      await emitEvent(env, "intent-received", {
        agent: normalized.agent,
        details: `Intent received for ${normalized.agent}.`,
      });

      const flow = await executeAgentFlow(env, normalized, {
        initialAgent: normalized.agent,
        allowChaining: true,
        source: normalized.source,
      });

      return json(
        {
          id: flow.intentId,
          status: "accepted",
          createdAt: new Date().toISOString(),
          agent: normalized.agent,
          payloadId: flow.primary?.payloadId || null,
          chain: flow.chain,
          outputs: flow.outputs,
        },
        202,
      );
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/payloads") {
    try {
      const payloads = await listRecords(env, "PAYLOADS", 20);
      return json({ payloads });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname.startsWith("/api/payloads/") && !pathname.includes("/annotate")) {
    try {
      const payloadId = pathname.split("/").pop();
      const payloadRecord = await getRecord(env, "PAYLOADS", payloadId);
      if (!payloadRecord) {
        return notFound();
      }

      return json(payloadRecord);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && /^\/api\/operator\/payloads\/[^/]+\/annotate$/.test(pathname)) {
    try {
      const payloadId = pathname.split("/")[4];
      const body = await readBody(request);
      const payload = await annotatePayload(env, payloadId, body);
      if (!payload) {
        return notFound();
      }

      await emitEvent(env, "operator-command-executed", {
        payloadId: payload.id,
        details: `Payload ${payload.id} annotated via operator route.`,
      });
      await recordAudit(env, "annotate", `Annotated payload ${payload.id}.`);
      return json(payload);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/escalations") {
    try {
      const escalations = await listRecords(env, "ESCALATIONS", 100);
      return json({ escalations });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname.startsWith("/api/escalations/")) {
    try {
      const escalationId = pathname.split("/").pop();
      const escalation = await getRecord(env, "ESCALATIONS", escalationId);
      if (!escalation) {
        return notFound();
      }

      return json(escalation);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && /^\/api\/operator\/escalations\/[^/]+\/resolve$/.test(pathname)) {
    try {
      const escalationId = pathname.split("/")[4];
      const escalation = await resolveEscalation(env, escalationId);
      if (!escalation) {
        return notFound();
      }

      await emitEvent(env, "operator-command-executed", {
        escalationId: escalation.id,
        details: `Escalation ${escalation.id} resolved via operator route.`,
      });
      await recordAudit(env, "resolve", `Resolved escalation ${escalation.id}.`);
      return json(escalation);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/modules") {
    try {
      const syncedModules = await listDynamicModules(env);
      const fallbackModules = modules.map(serializeModuleSummary);
      const governance = await getGovernanceConfig(env);
      const crossDivision = await getCloudflareCrossDivisionSync(governance, env);
      const marketplaceFields = getOperatorMarketplaceCrossDivisionFields(crossDivision);
      const enriched = [...syncedModules, ...fallbackModules].map((entry) => ({
        ...entry,
        ...marketplaceFields,
      }));
      return json({ modules: enriched, cloudflareCrossDivisionSync: crossDivision.syncStatus });
    } catch (error) {
      const fallbackModules = modules.map(serializeModuleSummary);
      return json({ modules: fallbackModules });
    }
  }

  if (method === "GET" && pathname.startsWith("/api/modules/") && pathname !== "/api/modules/status" && pathname !== "/api/modules/metadata") {
    try {
      const moduleId = pathname.split("/").pop();
      const syncedModule = await getRecord(env, "MODULES", moduleId);
      if (syncedModule) {
        return json(toDynamicModuleSummary(syncedModule));
      }

      const moduleEntry = getModuleById(moduleId);
      if (!moduleEntry) {
        return notFound();
      }

      return json(serializeModuleSummary(moduleEntry));
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && /^\/api\/operator\/modules\/[^/]+\/publish$/.test(pathname)) {
    try {
      const moduleId = pathname.split("/")[4];
      const moduleRecord = await publishModule(env, moduleId);
      if (!moduleRecord) {
        return notFound();
      }

      await emitEvent(env, "operator-command-executed", {
        moduleId: moduleRecord.id,
        details: `Module ${moduleRecord.id} published via operator route.`,
      });
      await recordAudit(env, "publish", `Published module ${moduleRecord.id}.`);
      return json(moduleRecord);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/modules/status") {
    const status = modules.map(({ id, name, status: moduleStatus, lastUpdated, metadata }) => ({
      id,
      name,
      status: moduleStatus,
      accessLevel: metadata.accessLevel,
      ctaLabel: metadata.ctaLabel,
      lastUpdated,
    }));
    return json({ status });
  }

  if (method === "GET" && pathname === "/api/modules/metadata") {
    return json({
      metadata: moduleRegistry.map(serializeModuleMetadata),
    });
  }

  if (method === "GET" && pathname === "/api/routing") {
    try {
      const routing = await listRecords(env, "ROUTING_LOGS", 200);
      return json({ routing });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/events") {
    try {
      const type = normalizeText(url.searchParams.get("type"));
      const events = await listRecords(env, "EVENTS", 200);
      return json({ events: type ? events.filter((entry) => entry.type === type) : events });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/operator/notifications") {
    try {
      const unreadOnly = url.searchParams.get("unread") === "true";
      const notifications = await listRecords(env, "NOTIFICATIONS", 100);
      return json({
        notifications: unreadOnly ? notifications.filter((entry) => !entry.readAt) : notifications,
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && /^\/api\/operator\/notifications\/read\/[^/]+$/.test(pathname)) {
    try {
      const notificationId = pathname.split("/").pop();
      const notification = await markNotificationRead(env, notificationId);
      if (!notification) {
        return notFound();
      }
      await recordAudit(env, "notification-read", `Marked notification ${notification.id} as read.`);
      return json(notification);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/analytics") {
    try {
      const analytics = await computeAnalytics(env);
      return json(analytics);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/analytics/heatmap") {
    try {
      return json(await computeHeatmap(env));
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/telemetry") {
    try {
      const telemetry = await computeTelemetry(env);
      return json(telemetry);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/autonomy") {
    try {
      const actions = await listRecords(env, "AUTONOMY_LOGS", 20);
      return json({ actions });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/autonomy/logs") {
    try {
      const actions = await listRecords(env, "AUTONOMY_LOGS", 20);
      return json({ actions });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/search/logs") {
    try {
      const logs = await listRecords(env, "SEARCH_LOGS", 100);
      return json({ logs });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/operator/audit") {
    try {
      const action = normalizeText(url.searchParams.get("action"));
      const audit = await listRecords(env, "AUDIT", 200);
      return json({ audit: action ? audit.filter((entry) => entry.action === action) : audit });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "POST" && pathname === "/api/operator/command") {
    try {
      const body = await readBody(request);
      const result = await executeOperatorCommand(env, body.command);
      await emitEvent(env, "operator-command-executed", {
        details: `Operator command executed: ${body.command}`,
      });
      await recordAudit(env, "command", `Executed operator command: ${body.command}`);
      return json(result);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/scenario") {
    try {
      const body = await readBody(request);
      const scenario = await runScenario(env, body);
      await recordAudit(env, "scenario-run", `Executed scenario ${scenario.name} (${scenario.id}).`);
      return json(scenario, 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/scenario") {
    try {
      const scenarios = await listRecords(env, "SCENARIOS", 50);
      return json({ scenarios });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname.startsWith("/api/scenario/")) {
    try {
      const scenarioId = pathname.split("/").pop();
      const scenario = await getRecord(env, "SCENARIOS", scenarioId);
      if (!scenario) {
        return notFound();
      }
      return json(scenario);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/heartbeat") {
    try {
      const heartbeat = await updateHeartbeatSnapshot(env);
      return json(heartbeat);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/public/modules") {
    try {
      const modulesView = await listMarketplaceIndex(env);
      return json({ modules: modulesView.map(makePublicModuleView) });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname.startsWith("/api/public/modules/")) {
    try {
      const moduleId = pathname.split("/").pop();
      const moduleRecord = await getRecord(env, "MODULES", moduleId);
      if (!moduleRecord) {
        return notFound();
      }

      return json(makePublicModuleView(toMarketplaceIndexItem(moduleRecord)));
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/public/search") {
    try {
      const searchResponse = await handleMarketplaceSearch(request, env, new URL(`/marketplace/search${url.search}`, url.origin), false);
      const data = await searchResponse.json();
      if (data.query) {
        await logSearch(env, data.query, data.results.length, "public-search");
      }
      return json({ query: data.query, results: data.results.map(makePublicModuleView) });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/public/agents") {
    return json({ agents: AGENTS });
  }

  if (method === "GET" && pathname === "/api/public/telemetry") {
    try {
      const telemetry = await computeTelemetry(env);
      return json({
        totalPayloads: telemetry.totalPayloads,
        totalModules: telemetry.totalModules,
        totalRoutingLogs: telemetry.totalRoutingLogs,
        totalEscalations: telemetry.totalEscalations,
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/public/demo-mode") {
    const enabled = isIntakeDemoMode(env);
    return json(
      {
        enabled,
        message: INTAKE_DEMO_MODE_MESSAGE,
      },
      200,
      { "Cache-Control": "no-store" }
    );
  }

  if (method === "POST" && pathname === "/api/register") {
    try {
      const payload = await readBody(request);
      const demoMode = isIntakeDemoMode(env);
      const answers = normalizePublicRegisterAnswers(payload);
      const result = computePublicRegisterResult(answers);
      let lifecycle = null;

      if (!demoMode) {
        recordPublicRegisterSubmission(answers, result);
        lifecycle = getPublicRegisterLifecycle(result.register_id);
      } else {
        lifecycle = {
          register_id: result.register_id,
          lifecycle_status: "received",
          lifecycle_label: "Pending Intake",
          lifecycle_timeline: [
            {
              status: "received",
              label: "Pending Intake",
              at: new Date().toISOString(),
              note: "Demo mode capture only — no data stored.",
            },
          ],
          observer_mode: true,
          operator_mode: false,
          permission_profile: result.permission_profile,
          security_stage: result.security_stage,
          agent_config_key: result.agent_config_key,
        };
      }

      return json(
        {
          status: "pending",
          mode: demoMode ? "demo" : "public",
          received_at: new Date().toISOString(),
          ...result,
          lifecycle,
          security_plane: getPublicRegisterSecurityPlane(),
          queue_preview: demoMode ? { queue_length: 0, lifecycle_stage: "received" } : getPublicRegisterQueuePreview(),
          route_table: intakeAgent.intakeRoutingTable?.public_register || null,
        },
        200,
        { "Cache-Control": "no-store" },
      );
    } catch (error) {
      return json({ error: error.message || "register-failed" }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/register-lifecycle") {
    const registerId = normalizeText(url.searchParams.get("register_id"));
    if (!registerId) {
      return json({ error: "register_id is required" }, 400);
    }

    const lifecycle = getPublicRegisterLifecycle(registerId);
    if (!lifecycle) {
      return json({ error: "Register lifecycle not found" }, 404);
    }

    return json(lifecycle, 200, { "Cache-Control": "no-store" });
  }

  if (method === "GET" && pathname === "/api/register-security") {
    return json(getPublicRegisterSecurityPlane(), 200, { "Cache-Control": "no-store" });
  }

  if (method === "GET" && pathname === "/api/register-queue") {
    return json(getPublicRegisterQueuePreview(), 200, { "Cache-Control": "no-store" });
  }

  if (method === "GET" && pathname === "/api/identity") {
    try {
      const identity = getIdentityDescriptor();
      const version = await getOsVersion(env);
      const cloudflareMcp = getCloudflareMcpMetadata();
      const cloudflareReachability = await getCloudflareApiReachability();
      const cloudflareFederationDetail = await getCloudflareIdentityFederation(env);
      return json({
        ...identity,
        version: version.current,
        versionHistory: version.history,
        lastUpgrade: version.lastUpgrade,
        cloudflareMcp,
        cloudflareMcpReachability: cloudflareReachability,
        cloudflareFederation: cloudflareFederationDetail,
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === "GET" && pathname === "/api/marketplace/catalog") {
    try {
      const governance = await getGovernanceConfig(env);
      const moduleIds = modules.map((entry) => entry.id);
      const [decision, insights, certification, crossDivision, orchestration, execution, adaptive, predictive, strategic, ucip] = await Promise.all([
        getCloudflareDecision(governance),
        getCloudflareInsights(governance),
        getMarketplaceCloudflareCertification(governance, moduleIds),
        getCloudflareCrossDivisionSync(governance, env, { moduleIds }),
        getCloudflareOrchestration(governance, env, { moduleIds }),
        getCloudflareExecution(governance, env, { moduleIds }),
        getCloudflareAdaptiveRuntime(governance, env, { moduleIds }),
        getCloudflarePredictiveModeling(governance, env, { moduleIds }),
        getCloudflareStrategicPlanning(governance, env, { moduleIds }),
        getCloudflareUcip(governance, env, { moduleIds }),
      ]);
      const amg = buildCloudflareAmgFromUcip(ucip);
      const catalogAlignmentContext = await buildCalAlignmentContextFromEnv(governance, env, { moduleIds });
      const cba = buildCloudflareCbaFromAmg(amg, ucip, catalogAlignmentContext);
      const cal = buildCloudflareCalFromCba(cba, amg, ucip, catalogAlignmentContext);
      const ihl = buildCloudflareIhlFromCal(cal, cba, amg, ucip, catalogAlignmentContext);
      const iarl = buildCloudflareIarlFromIhl(ihl, cal, cba, amg, ucip, catalogAlignmentContext);
      const acl = buildCloudflareAclFromIarl(iarl, ihl, cal, cba, amg, ucip, catalogAlignmentContext);
      return json({
        items: modules.map((module) => {
          const moduleCert = certification.certifications?.[module.id] || certifyModuleForCloudflare(module.id);
          const marketplaceModuleCert = certification.certifications?.[module.id] || {
            score: crossDivision.marketplaceBackend?.certification?.score ?? 50,
            status: crossDivision.marketplaceBackend?.certification?.status ?? "review",
          };
          const syncFields = computeModuleCrossDivisionSync(
            module.id,
            moduleCert,
            marketplaceModuleCert,
            crossDivision,
          );
          const orchestrationFields = computeModuleOrchestrationFields(module.id, orchestration, moduleCert);
          const executionFields = computeModuleExecutionFields(module.id, execution, moduleCert, orchestrationFields);
          const adaptiveFields = computeModuleAdaptiveFields(adaptive, {
            cloudflareDecision: decision.decision,
            cloudflareCertification: moduleCert,
            cloudflareSyncStatus: syncFields.cloudflareSyncStatus,
          });
          const decisionFields = getModuleCloudflareDecisionFields(module.id, decision, insights);
          const predictiveFields = computeModulePredictiveFields(predictive, {
            cloudflareDecision: decisionFields.cloudflareDecision,
            cloudflareCertification: moduleCert,
            cloudflareSyncStatus: syncFields.cloudflareSyncStatus,
            cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
          });
          const strategicFields = computeModuleStrategicFields(
            strategic,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareSyncStatus: syncFields.cloudflareSyncStatus,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
            },
            module.id,
          );
          const ucipFields = computeModuleUcipFields(
            ucip,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareSyncStatus: syncFields.cloudflareSyncStatus,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareStrategicHighlight: strategicFields.cloudflareStrategicHighlight,
            },
            module.id,
          );
          const amgFields = computeModuleAmgFields(
            amg,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareUCIPHighlight: ucipFields.cloudflareUCIPHighlight,
            },
            module.id,
          );
          const cbaFields = computeModuleCbaFields(
            cba,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareAMGHighlight: amgFields.cloudflareAMGHighlight,
            },
            module.id,
          );
          const calFields = computeModuleCalFields(
            cal,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareCBATag: cbaFields.cloudflareCBATag,
              cloudflareCBAHighlight: cbaFields.cloudflareCBAHighlight,
            },
            module.id,
          );
          const ihlFields = computeModuleIhlFields(
            ihl,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareCBATag: cbaFields.cloudflareCBATag,
              cloudflareCALTag: calFields.cloudflareCALTag,
              cloudflareCALHighlight: calFields.cloudflareCALHighlight,
            },
            module.id,
          );
          const iarlFields = computeModuleIarlFields(
            iarl,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareCBATag: cbaFields.cloudflareCBATag,
              cloudflareCALTag: calFields.cloudflareCALTag,
              cloudflareIHLTag: ihlFields.cloudflareIHLTag,
              cloudflareIHLHighlight: ihlFields.cloudflareIHLHighlight,
            },
            module.id,
          );
          const aclFields = computeModuleAclFields(
            acl,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareCBATag: cbaFields.cloudflareCBATag,
              cloudflareCALTag: calFields.cloudflareCALTag,
              cloudflareIHLTag: ihlFields.cloudflareIHLTag,
              cloudflareIARLTag: iarlFields.cloudflareIARLTag,
              cloudflareIARLHighlight: iarlFields.cloudflareIARLHighlight,
            },
            module.id,
          );
          return {
            ...moduleToCatalogItem(module),
            ...decisionFields,
            cloudflareCertification: moduleCert,
            ...syncFields,
            ...orchestrationFields,
            ...executionFields,
            ...adaptiveFields,
            ...predictiveFields,
            ...strategicFields,
            ...ucipFields,
            ...amgFields,
            ...cbaFields,
            ...calFields,
            ...ihlFields,
            ...iarlFields,
            ...aclFields,
          };
        }),
        cloudflareFederation: {
          ...getMarketplaceCfMetadata(),
          ...buildCloudflareCatalogFederationBlock({
            decision,
            certification,
            crossDivision,
            orchestration,
            execution,
            adaptive,
            predictive,
            strategic,
            ucip,
            amg,
            cba,
            cal,
            ihl,
            iarl,
            acl,
          }),
        },
      });
    } catch (error) {
      return json({
        items: modules.map((module) => ({
          ...moduleToCatalogItem(module),
          cloudflareCertification: certifyModuleForCloudflare(module.id),
          cloudflareSyncStatus: "partial",
          cloudflareSyncScore: 50,
          cloudflareSyncReasons: [error.message || "Sync unavailable."],
          cloudflareOrchestrationStatus: "review",
          cloudflareOrchestrationScore: 50,
          cloudflareOrchestrationReasons: [error.message || "Orchestration unavailable."],
          cloudflareExecutionStatus: "review",
          cloudflareExecutionScore: 50,
          cloudflareExecutionReasons: [error.message || "Execution unavailable."],
          cloudflareAdaptiveBadge: "ADAPT_REVIEW",
          cloudflareAdaptiveMode: "degraded",
          cloudflarePredictiveBadge: "PREDICT_ALERT",
          cloudflarePredictiveMode: "fallback",
          cloudflareStrategicTag: "STRAT_REVIEW",
          cloudflareStrategicHorizon: "short",
          cloudflareStrategicStripMode: "prioritize",
          cloudflareStrategicHighlight: true,
          cloudflareUCIPTag: "UCIP_RED",
          cloudflareUCIPMode: "red",
          cloudflareUCIPRisk: "high",
          cloudflareUCIPHighlight: true,
          cloudflareAMGTag: "AMG_CAUTION",
          cloudflareAMGMode: "govern_red",
          cloudflareAMGRisk: "high",
          cloudflareAMGHighlight: true,
          cloudflareCBATag: "CBA_RISK",
          cloudflareCBAMode: "behavior_red",
          cloudflareCBARisk: "high",
          cloudflareCBAHighlight: true,
          cloudflareCALTag: "CAL_MISALIGNED",
          cloudflareCALMode: "align_red",
          cloudflareCALRisk: "high",
          cloudflareCALHighlight: true,
          cloudflareIHLTag: "IHL_CONFLICT",
          cloudflareIHLMode: "intent_red",
          cloudflareIHLRisk: "high",
          cloudflareIHLHighlight: true,
          cloudflareIARLTag: "IARL_MISMATCH",
          cloudflareIARLMode: "resonance_red",
          cloudflareIARLRisk: "high",
          cloudflareIARLHighlight: true,
          cloudflareACLTag: "ACL_FRAGMENTED",
          cloudflareACLMode: "coherence_red",
          cloudflareACLRisk: "high",
          cloudflareACLHighlight: true,
        })),
        cloudflareFederation: getMarketplaceCfMetadata(),
      });
    }
  }

  if (method === "GET" && pathname === "/api/engagements") {
    return json({ engagements, packages });
  }

  if (method === "GET" && pathname === "/api/engagements/status") {
    const summary = engagements.map(({ id, packageId, status, source, createdAt }) => ({
      id,
      engagement_id: id,
      packageId,
      status,
      source,
      createdAt,
    }));
    return json({ engagements: summary });
  }

  if ((method === "POST" && pathname === "/api/engagements/create") || (method === "POST" && pathname === "/api/engagements")) {
    try {
      const payload = await readBody(request);
      const engagementPayload = normalizeEngagementPayload(payload);

      if (!engagementPayload.operatorHandle || !engagementPayload.contactEmail || !engagementPayload.transmission) {
        return json({ error: "operator_handle, contact_email, and transmission are required" }, 400);
      }

      if (engagementPayload.packageId && !getPackageById(engagementPayload.packageId)) {
        return json({ error: "Unknown package_interest" }, 400);
      }

      const engagement = {
        id: createId("eng", engagements),
        packageId: engagementPayload.packageId,
        operatorHandle: engagementPayload.operatorHandle,
        organization: engagementPayload.organization,
        contactEmail: engagementPayload.contactEmail,
        transmission: engagementPayload.transmission,
        moduleInterest: engagementPayload.moduleInterest,
        urgency: engagementPayload.urgency,
        source: engagementPayload.source,
        selectorId: engagementPayload.selectorId,
        recommendedService: engagementPayload.recommendedService,
        secondaryService: engagementPayload.secondaryService,
        priority: engagementPayload.priority,
        revenuePotential: engagementPayload.revenuePotential,
        urgencyScore: engagementPayload.urgencyScore,
        auditId: engagementPayload.auditId,
        scanId: engagementPayload.scanId,
        agentCheckId: engagementPayload.agentCheckId,
        automationRoiId: engagementPayload.automationRoiId,
        ragRiskId: engagementPayload.ragRiskId,
        riskScore: engagementPayload.riskScore,
        injectionScore: engagementPayload.injectionScore,
        riskTier: engagementPayload.riskTier,
        readinessScore: engagementPayload.readinessScore,
        readinessTier: engagementPayload.readinessTier,
        roiScore: engagementPayload.roiScore,
        roiTier: engagementPayload.roiTier,
        ragRiskScore: engagementPayload.ragRiskScore,
        ragRiskTier: engagementPayload.ragRiskTier,
        estimatedMonthlySavings: engagementPayload.estimatedMonthlySavings,
        estimatedAnnualSavings: engagementPayload.estimatedAnnualSavings,
        hoursSavedPerMonth: engagementPayload.hoursSavedPerMonth,
        retrievalExposureLevel: engagementPayload.retrievalExposureLevel,
        accessControlLevel: engagementPayload.accessControlLevel,
        governanceMaturity: engagementPayload.governanceMaturity,
        buildComplexity: engagementPayload.buildComplexity,
        automationComplexity: engagementPayload.automationComplexity,
        safetyLevel: engagementPayload.safetyLevel,
        topRiskCategory: null,
        status: "intake-received",
        createdAt: new Date().toISOString(),
      };

      engagements.push(engagement);
      attachEngagementToSelector({
        selector_id: engagement.selectorId,
        engagement_id: engagement.id,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        priority: engagement.priority,
        revenue_potential: engagement.revenuePotential,
        urgency_score: engagement.urgencyScore,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source,
      });
      attachEngagementToAuditLite({
        audit_id: engagement.auditId,
        engagement_id: engagement.id,
        risk_score: engagement.riskScore,
        risk_tier: engagement.riskTier,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        top_risks: Array.isArray(payload.top_risks) ? payload.top_risks : [],
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source,
      });
      attachEngagementToPromptInjectionScan({
        scan_id: engagement.scanId,
        engagement_id: engagement.id,
        injection_score: engagement.injectionScore,
        risk_tier: engagement.riskTier,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        top_risks: engagement.topRiskCategory ? [{ category: engagement.topRiskCategory }] : [],
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source,
      });
      attachEngagementToAgentReadiness({
        agent_check_id: engagement.agentCheckId,
        engagement_id: engagement.id,
        readiness_score: engagement.readinessScore,
        readiness_tier: engagement.readinessTier,
        build_complexity: engagement.buildComplexity,
        safety_level: engagement.safetyLevel,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source,
      });
      attachEngagementToAutomationRoi({
        automation_roi_id: engagement.automationRoiId,
        engagement_id: engagement.id,
        roi_score: engagement.roiScore,
        roi_tier: engagement.roiTier,
        estimated_monthly_savings: engagement.estimatedMonthlySavings,
        estimated_annual_savings: engagement.estimatedAnnualSavings,
        hours_saved_per_month: engagement.hoursSavedPerMonth,
        automation_complexity: engagement.automationComplexity,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source,
      });
      attachEngagementToRagRisk({
        rag_risk_id: engagement.ragRiskId,
        engagement_id: engagement.id,
        rag_risk_score: engagement.ragRiskScore,
        rag_risk_tier: engagement.ragRiskTier,
        retrieval_exposure_level: engagement.retrievalExposureLevel,
        access_control_level: engagement.accessControlLevel,
        governance_maturity: engagement.governanceMaturity,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source,
      });
      return json(
        {
          ...engagement,
          engagement_id: engagement.id,
        },
        201,
      );
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/operator/service-intake") {
    return json({
      rows: listServiceIntakeQueue(engagements),
    });
  }

  if (method === "PATCH" && pathname === "/api/operator/service-intake/status") {
    try {
      const payload = await readBody(request);
      const selectorId = normalizeText(payload.selector_id || payload.selectorId);
      const status = normalizeText(payload.status);
      if (!selectorId || !status) {
        return json({ error: "selector_id and status are required" }, 400);
      }
      const updated = updateServiceIntakeStatus(selectorId, status, engagements);
      return json({ status: "updated", selector_id: selectorId, record_status: updated.status });
    } catch (error) {
      return json({ error: error.message || "status-update-failed" }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/cloudflare/security-audit/start") {
    if (!isOperatorSurfaceRequest(request)) {
      return json({ error: "Operator surface access required" }, 403);
    }

    try {
      const payload = await readBody(request);
      const engagementId = normalizeText(payload.engagement_id || payload.engagementId);
      if (!engagementId) {
        return json({ error: "engagement_id is required" }, 400);
      }

      const origin = new URL(request.url).origin;
      const webhookUrl = `${origin}/api/cloudflare/security-audit/webhook`;
      const result = await startSecurityAudit({
        engagementId,
        engagements,
        webhookUrl,
        requestOrigin: origin,
      });
      return json(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      const message = error.message || "security-audit-start-failed";
      if (message.includes("not found")) {
        return json({ error: message }, 404);
      }
      return json({ error: message }, 502);
    }
  }

  if (method === "POST" && pathname === "/api/cloudflare/security-audit/webhook") {
    try {
      const payload = await readBody(request);
      const engagementId = normalizeText(payload.engagement_id || payload.engagementId);
      const auditStatus = payload.audit_status ?? payload.auditStatus;
      const auditSummary = payload.audit_summary ?? payload.auditSummary;
      const findings = payload.findings;

      if (!engagementId || auditStatus === undefined || auditStatus === null || auditStatus === "") {
        return json({ error: "engagement_id and audit_status are required" }, 400);
      }

      const result = applySecurityAuditWebhook({
        engagementId,
        auditStatus,
        auditSummary,
        findings,
      });
      return json(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      const message = error.message || "security-audit-webhook-failed";
      if (message.includes("not found")) {
        return json({ error: message }, 404);
      }
      return json({ error: message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/agent/intake/process") {
    try {
      const payload = await readBody(request);
      const selectorId = normalizeText(payload.selector_id || payload.selectorId);
      const engagementId = normalizeText(payload.engagement_id || payload.engagementId);
      if (!selectorId || !engagementId) {
        return json({ error: "selector_id and engagement_id are required" }, 400);
      }

      const selector = getServiceSelectorSubmission(selectorId);
      if (!selector) {
        return json({ error: "Selector submission not found" }, 404);
      }

      const engagement = getEngagementById(engagements, engagementId);
      if (!engagement) {
        return json({ error: "Engagement not found" }, 404);
      }

      const { record, response: agentResponse } = intakeAgent.process(selector, engagement);
      persistIntakeAgentRecord(record, engagements);
      return json(agentResponse, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json({ error: error.message || "intake-agent-process-failed" }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/agent/security-intake/process") {
    if (!isOperatorSurfaceRequest(request)) {
      return json({ error: "Operator surface access required" }, 403);
    }

    try {
      const payload = await readBody(request);
      const selectorId = normalizeText(payload.selector_id || payload.selectorId);
      const engagementId = normalizeText(payload.engagement_id || payload.engagementId);
      if (!selectorId || !engagementId) {
        return json({ error: "selector_id and engagement_id are required" }, 400);
      }

      const selector = getServiceSelectorSubmission(selectorId);
      if (!selector) {
        return json({ error: "Selector submission not found" }, 404);
      }

      const engagement = getEngagementById(engagements, engagementId);
      if (!engagement) {
        return json({ error: "Engagement not found" }, 404);
      }

      const { record, response: agentResponse } = securityIntakeAgent.process(selector, engagement);
      persistSecurityIntakeRecord(record, engagements);
      return json(agentResponse, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json({ error: error.message || "security-intake-process-failed" }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/operator/audit-lite") {
    return json(
      getAuditLiteOperatorSnapshot(engagements, {
        markProcessed: isOperatorSurfaceRequest(request),
      }),
      200,
      { "Cache-Control": "no-store" },
    );
  }

  if (method === "GET" && pathname === "/api/operator/register-intake") {
    return json(
      getPublicRegisterOperatorSnapshot({
        markProcessed: isOperatorSurfaceRequest(request),
      }),
      200,
      { "Cache-Control": "no-store" },
    );
  }

  if (method === "GET" && pathname === "/api/operator/prompt-injection-scans") {
    return json({
      rows: listPromptInjectionScanQueue(engagements),
    });
  }

  if (method === "GET" && pathname === "/api/operator/agent-readiness") {
    return json({
      rows: listAgentReadinessQueue(engagements),
    });
  }

  if (method === "GET" && pathname === "/api/operator/automation-roi") {
    return json({
      rows: listAutomationRoiQueue(engagements),
    });
  }

  if (method === "GET" && pathname === "/api/operator/rag-risk") {
    return json({
      rows: listRagRiskQueue(engagements),
    });
  }

  if (method === "GET" && pathname === "/api/marketplace/service-modules") {
    return json({
      modules: [
        ...serviceMarketplaceModules,
        {
          ...auditLiteMarketplaceModule,
          lifecycle_summary: getAuditLiteMarketplaceSummary(engagements),
        },
        promptInjectionMarketplaceModule,
        agentReadinessMarketplaceModule,
        automationRoiMarketplaceModule,
        ragRiskMarketplaceModule,
        buildPublicRegisterMarketplacePayload(),
      ],
    });
  }

  if (method === "GET" && pathname === "/api/deliverables") {
    return json({ deliverables });
  }

  if (method === "GET" && pathname === "/api/deliverables/download") {
    const id = url.searchParams.get("id");
    const deliverable = getDeliverableById(id);
    const download = deliverableDownloads[id];
    if (!deliverable || !download) {
      return notFound();
    }

    return text(download.content, 200, {
      "Content-Disposition": `attachment; filename="${download.downloadName}"`,
    });
  }

  if (method === "GET" && pathname.startsWith("/api/deliverables/")) {
    const deliverableId = pathname.split("/").pop();
    const deliverable = getDeliverableById(deliverableId);
    if (!deliverable) {
      return notFound();
    }

    return json(deliverable);
  }

  if (method === "POST" && pathname === "/api/identity/resolve") {
    try {
      const payload = await readBody(request);
      const contactEmail = normalizeEmail(payload.contact_email || payload.email || payload.contactEmail);
      if (!contactEmail) {
        return json({ error: "contact_email is required" }, 400);
      }

      const identity = identities.find((entry) => entry.contact_email.toLowerCase() === contactEmail);
      return json({
        found: Boolean(identity),
        identity: identity ? serializeIdentity(identity) : null,
      });
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/identity/create") {
    try {
      const payload = await readBody(request);
      const normalized = normalizeIdentityPayload(payload, "contact", request);
      const existing = identities.find((entry) => entry.contact_email.toLowerCase() === normalized.contact_email);
      if (existing) {
        return json({ created: false, identity: serializeIdentity(existing) });
      }

      const identity = {
        ...normalized,
        id: normalized.id || createIdentityId(),
      };

      identities.push(identity);
      return json({ created: true, identity: serializeIdentity(identity) }, 201);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  return proxyToUpstream(request, env, url);
}

async function proxyToUpstream(request, env, url) {
  if (!env.UPSTREAM_ENGINE_URL) {
    return json({ error: "UPSTREAM_ENGINE_URL is not configured" }, 503);
  }

  let target;
  try {
    target = new URL(url.pathname + url.search, env.UPSTREAM_ENGINE_URL);
  } catch {
    return json({ error: "UPSTREAM_ENGINE_URL is not a valid URL" }, 500);
  }

  try {
    const upstreamResponse = await fetch(new Request(target, request));
    const response = new Response(upstreamResponse.body, upstreamResponse);
    response.headers.set("X-Proxied-By", "mshops-public-worker");
    for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  } catch (error) {
    return json(
      {
        error: "Upstream API unreachable",
        detail: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
}
