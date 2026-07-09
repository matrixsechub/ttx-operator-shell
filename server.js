const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
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
  getModuleStaticPath
} = require("./data/store");
const { deploymentReference } = require("./data/contracts");
const { validateIdentityRecord } = require("./data/validate");
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
  serviceMarketplaceModules
} = require("./data/serviceSelector");
const intakeAgent = require("./agents/intakeAgent");
const securityIntakeAgent = require("./agents/securityIntakeAgent");
const {
  auditLiteMarketplaceModule,
  normalizeAuditLiteAnswers,
  computeAuditLiteResult,
  recordAuditLiteSubmission,
  attachEngagementToAuditLite,
  getAuditLiteLifecycle,
  getAuditLiteOperatorSnapshot,
  getAuditLiteMarketplaceSummary
} = require("./data/auditLite");
const {
  promptInjectionMarketplaceModule,
  normalizePromptInjectionAnswers,
  computePromptInjectionResult,
  recordPromptInjectionSubmission,
  attachEngagementToPromptInjectionScan,
  listPromptInjectionScanQueue
} = require("./data/promptInjectionScanner");
const {
  agentReadinessMarketplaceModule,
  normalizeAgentReadinessAnswers,
  computeAgentReadinessResult,
  recordAgentReadinessSubmission,
  attachEngagementToAgentReadiness,
  listAgentReadinessQueue
} = require("./data/agentReadinessChecker");
const {
  automationRoiMarketplaceModule,
  normalizeAutomationRoiAnswers,
  computeAutomationRoiResult,
  recordAutomationRoiSubmission,
  attachEngagementToAutomationRoi,
  listAutomationRoiQueue
} = require("./data/automationRoiCalculator");
const {
  ragRiskMarketplaceModule,
  normalizeRagRiskAnswers,
  computeRagRiskResult,
  recordRagRiskSubmission,
  attachEngagementToRagRisk,
  listRagRiskQueue
} = require("./data/ragRiskAnalyzer");
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
  buildPublicRegisterMarketplacePayload
} = require("./data/publicRegister");
const { isIntakeDemoMode, INTAKE_DEMO_MODE_MESSAGE, getPublicDemoModePayload } = require("./data/intakeDemoMode");
const {
  isOperatorSurfaceRequest,
  startSecurityAudit,
  applySecurityAuditWebhook
} = require("./data/cloudflareSecurityAudit");

const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_HEADERS = { ...deploymentReference.headers };

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    ...DEFAULT_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text, headers = {}) {
  response.writeHead(statusCode, {
    ...DEFAULT_HEADERS,
    "Content-Type": "text/plain; charset=utf-8",
    ...headers
  });
  response.end(text);
}

function sendRedirect(response, statusCode, location) {
  response.writeHead(statusCode, {
    ...DEFAULT_HEADERS,
    Location: location
  });
  response.end();
}

function notFound(response) {
  sendJson(response, 404, { error: "Not found" });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullable(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function resolveStaticPath(requestPath) {
  if (requestPath === "/" || requestPath === "/index.html") {
    return "/index.html";
  }

  if (requestPath === "/services" || requestPath === "/services/") {
    return "/services.html";
  }

  if (requestPath === "/apps/ai-security-audit" || requestPath === "/apps/ai-security-audit/") {
    return "/ai-security-audit.html";
  }

  if (requestPath === "/apps/prompt-injection-scanner" || requestPath === "/apps/prompt-injection-scanner/") {
    return "/prompt-injection-scanner.html";
  }

  if (requestPath === "/apps/ai-agent-readiness-checker" || requestPath === "/apps/ai-agent-readiness-checker/") {
    return "/ai-agent-readiness-checker.html";
  }

  if (requestPath === "/apps/automation-roi-calculator" || requestPath === "/apps/automation-roi-calculator/") {
    return "/automation-roi-calculator.html";
  }

  if (requestPath === "/apps/rag-risk-analyzer" || requestPath === "/apps/rag-risk-analyzer/") {
    return "/rag-risk-analyzer.html";
  }

  if (requestPath === "/marketplace" || requestPath === "/marketplace/") {
    return "/marketplace.html";
  }

  if (requestPath === "/os" || requestPath === "/os/") {
    return "/os.html";
  }

  if (requestPath === "/operator" || requestPath === "/operator/") {
    return "/operator.html";
  }

  if (requestPath === "/operator/service-intake" || requestPath === "/operator/service-intake/") {
    return "/service-intake.html";
  }

  if (requestPath === "/operator/audit-lite" || requestPath === "/operator/audit-lite/") {
    return "/audit-lite-operator.html";
  }

  if (requestPath === "/operator/register-intake" || requestPath === "/operator/register-intake/") {
    return "/operator/register-intake.html";
  }

  if (requestPath === "/operator/prompt-injection-scans" || requestPath === "/operator/prompt-injection-scans/") {
    return "/prompt-injection-scans-operator.html";
  }

  if (requestPath === "/operator/agent-readiness" || requestPath === "/operator/agent-readiness/") {
    return "/agent-readiness-operator.html";
  }

  if (requestPath === "/operator/automation-roi" || requestPath === "/operator/automation-roi/") {
    return "/automation-roi-operator.html";
  }

  if (requestPath === "/operator/rag-risk" || requestPath === "/operator/rag-risk/") {
    return "/rag-risk-operator.html";
  }

  if (requestPath === "/operator/agents/intake" || requestPath === "/operator/agents/intake/") {
    return "/operator-agents-intake.html";
  }

  if (requestPath === "/operator/agents/security-intake" || requestPath === "/operator/agents/security-intake/") {
    return "/operator-agents-security-intake.html";
  }

  if (requestPath === "/enter" || requestPath === "/enter/") {
    return "/enter.html";
  }

  if (requestPath === "/register" || requestPath === "/register/") {
    return "/register.html";
  }

  if (requestPath === "/api-explorer" || requestPath === "/api-explorer/") {
    return "/api-explorer.html";
  }

  if (requestPath === "/mission" || requestPath === "/mission/") {
    return "/mission.html";
  }

  const cleanModuleRoute = requestPath.match(/^\/marketplace\/modules\/([a-z0-9-]+)$/);
  if (cleanModuleRoute) {
    return getModuleStaticPath(cleanModuleRoute[1]);
  }

  return requestPath;
}

function serveStatic(requestPath, response) {
  const safePath = resolveStaticPath(requestPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(response);
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (!path.extname(safePath) && safePath !== "/index.html") {
        fs.readFile(path.join(PUBLIC_DIR, "index.html"), (indexError, indexContent) => {
          if (indexError) {
            notFound(response);
            return;
          }

          response.writeHead(200, {
            ...DEFAULT_HEADERS,
            "Content-Type": MIME_TYPES[".html"]
          });
          response.end(indexContent);
        });
        return;
      }

      notFound(response);
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      ...DEFAULT_HEADERS,
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
    });
    response.end(content);
  });
}

function getModuleById(id) {
  return modules.find((entry) => entry.id === id);
}

function getModuleRecordById(id) {
  return moduleRegistry.find((entry) => entry.id === id);
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
      features: [...moduleEntry.metadata.features]
    },
    lastUpdated: moduleEntry.lastUpdated
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
    lastUpdated: record.updated_at || record.created_at || null
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
    status: identity.status
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
    ip_address: request.socket?.remoteAddress || null,
    status: normalizeText(payload.status) || "new"
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
    safetyLevel: normalizeNullable(payload.safety_level || payload.safetyLevel)
  };
}

async function handleApi(request, response, url) {
  const method = request.method || "GET";
  const pathname = url.pathname;

  if (method === "POST" && pathname === "/api/service-selector") {
    try {
      const payload = await readBody(request);
      const answers = normalizeSelectorAnswers(payload);
      const result = computeServiceSelectorResult(answers);
      recordServiceSelectorSubmission(answers, result);
      sendJson(response, 200, result, { "Cache-Control": "no-store" });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "service-selector-failed" });
    }
    return;
  }

  if (method === "GET" && pathname === "/api/service-selector/catalog") {
    sendJson(response, 200, {
      services: serviceCatalog.filter((service) => service.active),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/audit-lite") {
    try {
      const payload = await readBody(request);
      const answers = normalizeAuditLiteAnswers(payload);
      const result = computeAuditLiteResult(answers);
      const submission = recordAuditLiteSubmission(answers, result);
      const lifecycle = getAuditLiteLifecycle(result.audit_id, engagements);
      sendJson(
        response,
        200,
        {
          ...result,
          lifecycle,
          hq_health: getAuditLiteOperatorSnapshot(engagements).summary.health,
          route_table: intakeAgent.intakeRoutingTable?.audit_lite || null,
        },
        { "Cache-Control": "no-store" },
      );
    } catch (error) {
      sendJson(response, 400, { error: error.message || "audit-lite-failed" });
    }
    return;
  }

  if (method === "GET" && pathname === "/api/audit-lite/lifecycle") {
    const auditId = normalizeText(url.searchParams.get("audit_id"));
    if (!auditId) {
      sendJson(response, 400, { error: "audit_id is required" });
      return;
    }

    const lifecycle = getAuditLiteLifecycle(auditId, engagements);
    if (!lifecycle) {
      sendJson(response, 404, { error: "Audit lifecycle not found" });
      return;
    }

    sendJson(response, 200, lifecycle, { "Cache-Control": "no-store" });
    return;
  }

  if (method === "POST" && pathname === "/api/register") {
    try {
      const payload = await readBody(request);
      const demoMode = isIntakeDemoMode({});
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
              note: INTAKE_DEMO_MODE_MESSAGE,
            },
          ],
          observer_mode: true,
          operator_mode: false,
          permission_profile: result.permission_profile,
          security_stage: result.security_stage,
          agent_config_key: result.agent_config_key,
        };
      }

      sendJson(
        response,
        200,
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
        { "Cache-Control": "no-store" },
      );
    } catch (error) {
      sendJson(response, 400, { error: error.message || "register-failed" });
    }
    return;
  }

  if (method === "GET" && pathname === "/api/register-lifecycle") {
    const registerId = normalizeText(url.searchParams.get("register_id"));
    if (!registerId) {
      sendJson(response, 400, { error: "register_id is required" });
      return;
    }

    const lifecycle = getPublicRegisterLifecycle(registerId);
    if (!lifecycle) {
      sendJson(response, 404, { error: "Register lifecycle not found" });
      return;
    }

    sendJson(response, 200, lifecycle, { "Cache-Control": "no-store" });
    return;
  }

  if (method === "GET" && pathname === "/api/register-security") {
    sendJson(response, 200, getPublicRegisterSecurityPlane(), { "Cache-Control": "no-store" });
    return;
  }

  if (method === "GET" && pathname === "/api/register-queue") {
    sendJson(response, 200, getPublicRegisterQueuePreview(), { "Cache-Control": "no-store" });
    return;
  }

  if (method === "GET" && pathname === "/api/public/demo-mode") {
    sendJson(response, 200, getPublicDemoModePayload({}), { "Cache-Control": "no-store" });
    return;
  }

  if (method === "POST" && pathname === "/api/prompt-injection-scan") {
    try {
      const payload = await readBody(request);
      const answers = normalizePromptInjectionAnswers(payload);
      const result = computePromptInjectionResult(answers);
      recordPromptInjectionSubmission(answers, result);
      sendJson(response, 200, result, { "Cache-Control": "no-store" });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "prompt-injection-scan-failed" });
    }
    return;
  }

  if (method === "POST" && pathname === "/api/agent-readiness-check") {
    try {
      const payload = await readBody(request);
      const answers = normalizeAgentReadinessAnswers(payload);
      const result = computeAgentReadinessResult(answers);
      recordAgentReadinessSubmission(answers, result);
      sendJson(response, 200, result, { "Cache-Control": "no-store" });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "agent-readiness-check-failed" });
    }
    return;
  }

  if (method === "POST" && pathname === "/api/automation-roi-calculate") {
    try {
      const payload = await readBody(request);
      const answers = normalizeAutomationRoiAnswers(payload);
      const result = computeAutomationRoiResult(answers);
      recordAutomationRoiSubmission(answers, result);
      sendJson(response, 200, result, { "Cache-Control": "no-store" });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "automation-roi-calculate-failed" });
    }
    return;
  }

  if (method === "POST" && pathname === "/api/rag-risk-analyze") {
    try {
      const payload = await readBody(request);
      const answers = normalizeRagRiskAnswers(payload);
      const result = computeRagRiskResult(answers);
      recordRagRiskSubmission(answers, result);
      sendJson(response, 200, result, { "Cache-Control": "no-store" });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "rag-risk-analyze-failed" });
    }
    return;
  }

  if (method === "GET" && pathname === "/api/modules") {
    sendJson(response, 200, { modules: modules.map(serializeModuleSummary) });
    return;
  }

  if (method === "GET" && pathname === "/api/modules/status") {
    const status = modules.map(({ id, name, status: moduleStatus, lastUpdated, metadata }) => ({
      id,
      name,
      status: moduleStatus,
      accessLevel: metadata.accessLevel,
      ctaLabel: metadata.ctaLabel,
      lastUpdated
    }));
    sendJson(response, 200, { status });
    return;
  }

  if (method === "GET" && pathname === "/api/modules/metadata") {
    sendJson(response, 200, {
      metadata: moduleRegistry.map(serializeModuleMetadata)
    });
    return;
  }

  if (method === "GET" && pathname.startsWith("/api/modules/")) {
    const moduleId = pathname.split("/").pop();
    const moduleEntry = getModuleById(moduleId);
    if (!moduleEntry) {
      notFound(response);
      return;
    }

    sendJson(response, 200, serializeModuleSummary(moduleEntry));
    return;
  }

  if (method === "GET" && pathname === "/api/engagements") {
    sendJson(response, 200, { engagements, packages });
    return;
  }

  if (method === "GET" && pathname === "/api/engagements/status") {
    const summary = engagements.map(({ id, packageId, status, source, createdAt }) => ({
      id,
      engagement_id: id,
      packageId,
      status,
      source,
      createdAt
    }));
    sendJson(response, 200, { engagements: summary });
    return;
  }

  if ((method === "POST" && pathname === "/api/engagements/create") || (method === "POST" && pathname === "/api/engagements")) {
    try {
      const payload = await readBody(request);
      const engagementPayload = normalizeEngagementPayload(payload);

      if (!engagementPayload.operatorHandle || !engagementPayload.contactEmail || !engagementPayload.transmission) {
        sendJson(response, 400, {
          error: "operator_handle, contact_email, and transmission are required"
        });
        return;
      }

      if (engagementPayload.packageId && !getPackageById(engagementPayload.packageId)) {
        sendJson(response, 400, { error: "Unknown package_interest" });
        return;
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
        createdAt: new Date().toISOString()
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
        source: engagement.source
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
        source: engagement.source
      });
      attachEngagementToPromptInjectionScan({
        scan_id: engagement.scanId,
        engagement_id: engagement.id,
        injection_score: engagement.injectionScore,
        risk_tier: engagement.riskTier,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        top_risks: engagement.topRiskCategory
          ? [{ category: engagement.topRiskCategory }]
          : [],
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source
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
        source: engagement.source
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
        source: engagement.source
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
        source: engagement.source
      });
      sendJson(response, 201, {
        ...engagement,
        engagement_id: engagement.id
      });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (method === "GET" && pathname === "/api/operator/service-intake") {
    sendJson(response, 200, {
      rows: listServiceIntakeQueue(engagements)
    });
    return;
  }

  if (method === "PATCH" && pathname === "/api/operator/service-intake/status") {
    try {
      const payload = await readBody(request);
      const selectorId = normalizeText(payload.selector_id || payload.selectorId);
      const status = normalizeText(payload.status);
      if (!selectorId || !status) {
        sendJson(response, 400, { error: "selector_id and status are required" });
        return;
      }
      const updated = updateServiceIntakeStatus(selectorId, status, engagements);
      sendJson(response, 200, { status: "updated", selector_id: selectorId, record_status: updated.status });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "status-update-failed" });
    }
    return;
  }

  if (method === "POST" && pathname === "/api/cloudflare/security-audit/start") {
    if (!isOperatorSurfaceRequest(request)) {
      sendJson(response, 403, { error: "Operator surface access required" });
      return;
    }

    try {
      const payload = await readBody(request);
      const engagementId = normalizeText(payload.engagement_id || payload.engagementId);
      if (!engagementId) {
        sendJson(response, 400, { error: "engagement_id is required" });
        return;
      }

      const origin = url.origin;
      const webhookUrl = `${origin}/api/cloudflare/security-audit/webhook`;
      const result = await startSecurityAudit({
        engagementId,
        engagements,
        webhookUrl,
        requestOrigin: origin
      });
      sendJson(response, 200, result, { "Cache-Control": "no-store" });
    } catch (error) {
      const message = error.message || "security-audit-start-failed";
      if (message.includes("not found")) {
        sendJson(response, 404, { error: message });
        return;
      }
      sendJson(response, 502, { error: message });
    }
    return;
  }

  if (method === "POST" && pathname === "/api/cloudflare/security-audit/webhook") {
    try {
      const payload = await readBody(request);
      const engagementId = normalizeText(payload.engagement_id || payload.engagementId);
      const auditStatus = payload.audit_status ?? payload.auditStatus;
      const auditSummary = payload.audit_summary ?? payload.auditSummary;
      const findings = payload.findings;

      if (!engagementId || auditStatus === undefined || auditStatus === null || auditStatus === "") {
        sendJson(response, 400, { error: "engagement_id and audit_status are required" });
        return;
      }

      const result = applySecurityAuditWebhook({
        engagementId,
        auditStatus,
        auditSummary,
        findings
      });
      sendJson(response, 200, result, { "Cache-Control": "no-store" });
    } catch (error) {
      const message = error.message || "security-audit-webhook-failed";
      if (message.includes("not found")) {
        sendJson(response, 404, { error: message });
        return;
      }
      sendJson(response, 400, { error: message });
    }
    return;
  }

  if (method === "POST" && pathname === "/api/agent/intake/process") {
    try {
      const payload = await readBody(request);
      const selectorId = normalizeText(payload.selector_id || payload.selectorId);
      const engagementId = normalizeText(payload.engagement_id || payload.engagementId);
      if (!selectorId || !engagementId) {
        sendJson(response, 400, { error: "selector_id and engagement_id are required" });
        return;
      }

      const selector = getServiceSelectorSubmission(selectorId);
      if (!selector) {
        sendJson(response, 404, { error: "Selector submission not found" });
        return;
      }

      const engagement = getEngagementById(engagements, engagementId);
      if (!engagement) {
        sendJson(response, 404, { error: "Engagement not found" });
        return;
      }

      const { record, response: agentResponse } = intakeAgent.process(selector, engagement);
      persistIntakeAgentRecord(record, engagements);
      sendJson(response, 200, agentResponse, { "Cache-Control": "no-store" });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "intake-agent-process-failed" });
    }
    return;
  }

  if (method === "POST" && pathname === "/api/agent/security-intake/process") {
    if (!isOperatorSurfaceRequest(request)) {
      sendJson(response, 403, { error: "Operator surface access required" });
      return;
    }

    try {
      const payload = await readBody(request);
      const selectorId = normalizeText(payload.selector_id || payload.selectorId);
      const engagementId = normalizeText(payload.engagement_id || payload.engagementId);
      if (!selectorId || !engagementId) {
        sendJson(response, 400, { error: "selector_id and engagement_id are required" });
        return;
      }

      const selector = getServiceSelectorSubmission(selectorId);
      if (!selector) {
        sendJson(response, 404, { error: "Selector submission not found" });
        return;
      }

      const engagement = getEngagementById(engagements, engagementId);
      if (!engagement) {
        sendJson(response, 404, { error: "Engagement not found" });
        return;
      }

      const { record, response: agentResponse } = securityIntakeAgent.process(selector, engagement);
      persistSecurityIntakeRecord(record, engagements);
      sendJson(response, 200, agentResponse, { "Cache-Control": "no-store" });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "security-intake-process-failed" });
    }
    return;
  }

  if (method === "GET" && pathname === "/api/operator/audit-lite") {
    const snapshot = getAuditLiteOperatorSnapshot(engagements, {
      markProcessed: isOperatorSurfaceRequest(request),
    });
    sendJson(response, 200, snapshot, { "Cache-Control": "no-store" });
    return;
  }

  if (method === "GET" && pathname === "/api/operator/register-intake") {
    const snapshot = getPublicRegisterOperatorSnapshot({
      markProcessed: isOperatorSurfaceRequest(request),
    });
    sendJson(response, 200, snapshot, { "Cache-Control": "no-store" });
    return;
  }

  if (method === "GET" && pathname === "/api/operator/prompt-injection-scans") {
    sendJson(response, 200, {
      rows: listPromptInjectionScanQueue(engagements)
    });
    return;
  }

  if (method === "GET" && pathname === "/api/operator/agent-readiness") {
    sendJson(response, 200, {
      rows: listAgentReadinessQueue(engagements)
    });
    return;
  }

  if (method === "GET" && pathname === "/api/operator/automation-roi") {
    sendJson(response, 200, {
      rows: listAutomationRoiQueue(engagements)
    });
    return;
  }

  if (method === "GET" && pathname === "/api/operator/rag-risk") {
    sendJson(response, 200, {
      rows: listRagRiskQueue(engagements)
    });
    return;
  }

  if (method === "GET" && pathname === "/api/marketplace/service-modules") {
    sendJson(response, 200, {
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
        buildPublicRegisterMarketplacePayload()
      ]
    });
    return;
  }

  if (method === "GET" && pathname === "/api/deliverables") {
    sendJson(response, 200, { deliverables });
    return;
  }

  if (method === "GET" && pathname === "/api/deliverables/download") {
    const id = url.searchParams.get("id");
    const deliverable = getDeliverableById(id);
    const download = deliverableDownloads[id];
    if (!deliverable || !download) {
      notFound(response);
      return;
    }

    sendText(response, 200, download.content, {
      "Content-Disposition": `attachment; filename="${download.downloadName}"`
    });
    return;
  }

  if (method === "GET" && pathname.startsWith("/api/deliverables/")) {
    const deliverableId = pathname.split("/").pop();
    const deliverable = getDeliverableById(deliverableId);
    if (!deliverable) {
      notFound(response);
      return;
    }

    sendJson(response, 200, deliverable);
    return;
  }

  if (method === "POST" && pathname === "/api/identity/resolve") {
    try {
      const payload = await readBody(request);
      const contactEmail = normalizeEmail(payload.contact_email || payload.email || payload.contactEmail);
      if (!contactEmail) {
        sendJson(response, 400, { error: "contact_email is required" });
        return;
      }

      const identity = identities.find((entry) => entry.contact_email.toLowerCase() === contactEmail);
      sendJson(response, 200, {
        found: Boolean(identity),
        identity: identity ? serializeIdentity(identity) : null
      });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (method === "POST" && pathname === "/api/identity/create") {
    try {
      const payload = await readBody(request);
      const normalized = normalizeIdentityPayload(payload, "contact", request);
      const existing = identities.find((entry) => entry.contact_email.toLowerCase() === normalized.contact_email);
      if (existing) {
        sendJson(response, 200, { created: false, identity: serializeIdentity(existing) });
        return;
      }

      const identity = {
        ...normalized,
        id: normalized.id || createIdentityId()
      };

      identities.push(identity);
      sendJson(response, 201, { created: true, identity: serializeIdentity(identity) });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  notFound(response);
}

function handleRedirects(pathname, response) {
  if (pathname === "/home") {
    sendRedirect(response, 301, deploymentReference.redirects["/home"]);
    return true;
  }

  if (pathname === "/book") {
    sendRedirect(response, 302, deploymentReference.redirects["/book"]);
    return true;
  }

  if (pathname === "/report") {
    sendRedirect(response, 302, deploymentReference.redirects["/report"]);
    return true;
  }

  return false;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (handleRedirects(url.pathname, response)) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url);
    return;
  }

  serveStatic(url.pathname, response);
});

server.listen(PORT, () => {
  console.log(`MSH OPS operator shell listening on http://localhost:${PORT}`);
});
