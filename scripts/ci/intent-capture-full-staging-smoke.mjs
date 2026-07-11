#!/usr/bin/env node

const BASE =
  process.env.STAGING_BASE_URL ?? "https://ttx-operator-shell-staging.sogellagepul.workers.dev";

const regressions = [];

function regression(severity, code, message) {
  regressions.push({ severity, code, message });
}

function uuid() {
  return crypto.randomUUID();
}

async function fetchText(path, init) {
  const url = new URL(path, BASE).toString();
  const started = Date.now();
  const response = await fetch(url, { redirect: "manual", ...init });
  const text = await response.text();
  return { response, text, durationMs: Date.now() - started, url };
}

async function fetchJson(path, init) {
  const { response, text, durationMs, url } = await fetchText(path, init);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { response, json, text, durationMs, url };
}

function hasAssets(html, { flowTracker = true, intentCapture = true } = {}) {
  const flow = !flowTracker || html.includes("flow-tracker.js");
  const intent = !intentCapture || (html.includes("intent-capture.js") && html.includes("intent-capture.css"));
  const shellBroken = /storefront shell missing|error code 503/i.test(html);
  return { flow, intent, shellBroken, ok: flow && intent && !shellBroken };
}

const FUNNEL_PAGES = [
  { path: "/", name: "root", expectFlow: true, expectIntent: true, htmlMarker: "MSHOPS.NET service selection" },
  {
    path: "/welcome",
    name: "welcome",
    expectRedirect: true,
    redirectLocation: "/",
  },
  { path: "/enter", name: "enter", expectFlow: true, expectIntent: true, htmlMarker: "Guided Intake" },
  { path: "/services", name: "services", expectFlow: true, expectIntent: true },
  { path: "/intake", name: "intake", expectFlow: true, expectIntent: true },
  { path: "/register", name: "register", expectFlow: true, expectIntent: true },
  { path: "/contact", name: "contact", expectFlow: true, expectIntent: true },
];

const report = {
  schema: "intent-capture-full-staging-smoke/v1",
  baseUrl: BASE,
  testedAt: new Date().toISOString(),
  stagingContext: null,
  phases: {},
  regressions: [],
};

// Phase A — staging context
const buildInfo = await fetchJson("/api/build-info");
report.stagingContext = {
  url: BASE,
  commitSha: buildInfo.json?.commitSha ?? null,
  appVersion: buildInfo.json?.appVersion ?? null,
  buildTimestamp: buildInfo.json?.buildTimestamp ?? null,
  deployEnv: buildInfo.json?.deployEnv ?? null,
  buildInfoStatus: buildInfo.response.status,
};
if (buildInfo.response.status !== 200) {
  regression("BLOCKER", "BUILD_INFO", `GET /api/build-info returned ${buildInfo.response.status}`);
}

// Phase B — public funnel pages
const funnelResults = [];
for (const page of FUNNEL_PAGES) {
  const { response, text } = await fetchText(page.path);
  if (page.expectRedirect) {
    const location = response.headers.get("location") ?? "";
    const redirectOk =
      (response.status === 301 || response.status === 302) &&
      new URL(location, BASE).pathname === page.redirectLocation;
    funnelResults.push({
      path: page.path,
      status: response.status,
      redirectLocation: location,
      ok: redirectOk,
    });
    if (!redirectOk) {
      regression("MAJOR", `FUNNEL_REDIRECT_${page.name}`, `${page.path} should redirect to ${page.redirectLocation}`);
    }
    continue;
  }

  const assets = hasAssets(text, {
    flowTracker: page.expectFlow,
    intentCapture: page.expectIntent,
  });
  const markerOk = !page.htmlMarker || text.includes(page.htmlMarker);
  const ok = response.status === 200 && assets.ok && markerOk;
  funnelResults.push({
    path: page.path,
    status: response.status,
    flowTracker: assets.flow,
    intentCapture: assets.intent,
    shellBroken: assets.shellBroken,
    markerOk,
    ok,
  });
  if (response.status === 503 || assets.shellBroken) {
    regression("MAJOR", `FUNNEL_503_${page.name}`, `${page.path} returned storefront/shell failure`);
  } else if (response.status !== 200) {
    regression("MAJOR", `FUNNEL_STATUS_${page.name}`, `${page.path} returned ${response.status}`);
  }
  if (page.expectFlow && !assets.flow) {
    regression("MINOR", `FUNNEL_FLOW_${page.name}`, `${page.path} missing flow-tracker.js`);
  }
  if (page.expectIntent && !assets.intent) {
    regression("MINOR", `FUNNEL_INTENT_${page.name}`, `${page.path} missing intent capture assets`);
  }
}
report.phases.publicFunnel = {
  ok: funnelResults.every((r) => r.ok),
  pages: funnelResults,
};

// Phase C — flow + experiment
const sessionId = uuid();
const flowEvent = await fetchJson("/api/flow/event", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    sessionId,
    event: "page_view",
    page: "/enter",
    dwellMs: 1200,
    clickDelta: 1,
    trafficSource: "staging_smoke",
  }),
});

const flowEventBadSession = await fetchJson("/api/flow/event", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: "not-a-uuid", event: "page_view", page: "/enter" }),
});

const assignmentPage = "/enter";
const assign1 = await fetchJson(
  `/api/flow/experiment/assignment?sessionId=${encodeURIComponent(sessionId)}&page=${encodeURIComponent(assignmentPage)}`,
);
const assign2 = await fetchJson(
  `/api/flow/experiment/assignment?sessionId=${encodeURIComponent(sessionId)}&page=${encodeURIComponent(assignmentPage)}`,
);
const assignBad = await fetchJson("/api/flow/experiment/assignment?sessionId=bad&page=/enter");

const flowOk =
  flowEvent.response.status === 200 &&
  flowEvent.json?.ok === true &&
  flowEventBadSession.response.status === 400 &&
  assignBad.response.status === 400 &&
  assign1.response.status === 200 &&
  assign2.response.status === 200;

if (flowEvent.response.status === 401) {
  regression("BLOCKER", "FLOW_EVENT_AUTH", "POST /api/flow/event requires auth");
} else if (flowEvent.response.status !== 200) {
  regression("MAJOR", "FLOW_EVENT", `POST /api/flow/event returned ${flowEvent.response.status}`);
}

if (assign1.response.status === 401) {
  regression("BLOCKER", "FLOW_ASSIGN_AUTH", "GET /api/flow/experiment/assignment requires auth");
}

let assignmentDeterministic = true;
if (assign1.json?.variant && assign2.json?.variant) {
  assignmentDeterministic = assign1.json.variant === assign2.json.variant;
  if (!assignmentDeterministic) {
    regression("MAJOR", "FLOW_ASSIGN_NONDETERMINISTIC", "assignment variant changed for same session");
  }
}

report.phases.flowTracking = {
  ok: flowEvent.response.status === 200 && flowEventBadSession.response.status === 400,
  flowEventStatus: flowEvent.response.status,
  invalidSessionRejected: flowEventBadSession.response.status === 400,
};
report.phases.experimentAssignment = {
  ok: assign1.response.status === 200 && assignBad.response.status === 400 && assignmentDeterministic,
  status: assign1.response.status,
  variant: assign1.json?.variant ?? null,
  experimentId: assign1.json?.experimentId ?? assign1.json?.experiment?.id ?? null,
  deterministic: assignmentDeterministic,
  hasVariantWiring: Boolean(assign1.json?.variant === "A" || assign1.json?.variant === "B" || assign1.json?.experiment == null),
};

// Phase D — intent capture (3 pages + negative cases)
const capturePages = ["/enter", "/services", "/intake"];
const captureResults = [];

for (const page of capturePages) {
  const sid = uuid();
  const capture = await fetchJson("/api/growth/intent-capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: sid,
      source: "staging_smoke",
      page,
      uiMode: "DEFAULT",
      intent: `Staging smoke intent on ${page}`,
      category: "ai_agent",
      interactionDepth: { dwellMs: 30000, scrollDepth: 0.6, clicks: 3 },
      timestamp: new Date().toISOString(),
    }),
  });

  const handoffOk =
    capture.json?.preview?.builderRoute?.includes("ai-agent-builder") &&
    capture.json?.preview?.builderRoute?.includes("source_type=intent_capture") &&
    capture.json?.preview?.builderRoute?.includes("source_reference_id=");

  captureResults.push({
    page,
    status: capture.response.status,
    captureId: capture.json?.captureId ?? null,
    hasPreview: Boolean(capture.json?.preview),
    handoffOk,
    builderRoute: capture.json?.builderRoute ?? capture.json?.preview?.builderRoute ?? null,
  });

  if (capture.response.status === 401) {
    regression("BLOCKER", "INTENT_CAPTURE_AUTH", "POST /api/growth/intent-capture requires auth");
  } else if (capture.response.status !== 200 || !capture.json?.preview) {
    regression("BLOCKER", `INTENT_CAPTURE_${page}`, `intent capture failed on ${page}: ${capture.response.status}`);
  } else if (!handoffOk) {
    regression("MAJOR", `INTENT_HANDOFF_LINKS_${page}`, `builder handoff links incomplete on ${page}`);
  }
}

const invalidIntent = await fetchJson("/api/growth/intent-capture", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: uuid(), page: "/enter", intent: "ab" }),
});
const invalidSession = await fetchJson("/api/growth/intent-capture", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: "bad", page: "/enter", intent: "valid intent text" }),
});

const abandonSid = uuid();
const abandonCapture = await fetchJson("/api/growth/intent-capture", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    sessionId: abandonSid,
    page: "/enter",
    intent: "abandon tracking smoke intent",
    category: "ai_agent",
    interactionDepth: { dwellMs: 10000, clicks: 2 },
  }),
});
const handoffPreview = await fetchJson("/api/growth/intent-handoff", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ event: "preview_generated", sessionId: abandonSid }),
});
const handoffAbandon = await fetchJson("/api/growth/intent-handoff", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ event: "preview_abandoned", sessionId: abandonSid }),
});

report.phases.intentCapture = {
  ok: captureResults.every((r) => r.status === 200 && r.hasPreview && r.handoffOk),
  captures: captureResults,
  invalidIntentRejected: invalidIntent.response.status === 400,
  invalidSessionRejected: invalidSession.response.status === 400,
  handoffPreviewStatus: handoffPreview.response.status,
  handoffAbandonStatus: handoffAbandon.response.status,
  triggerLogic: {
    dwellMsThreshold: 25000,
    minClicks: 2,
    scrollDepthThreshold: 0.5,
    note: "Client trigger validated by contract parity with worker/tests; browser dwell not executed in HTTP smoke",
  },
};

if (invalidIntent.response.status !== 400) {
  regression("MINOR", "INTENT_VALIDATION", "short intent should return 400");
}
if (invalidSession.response.status !== 400) {
  regression("MAJOR", "INTENT_SESSION_CONTRACT", "invalid sessionId should return 400");
}
if (handoffPreview.response.status !== 200 || handoffAbandon.response.status !== 200) {
  regression("MINOR", "INTENT_HANDOFF_TRACKING", "intent-handoff events failed after preview");
}

// Phase E — AI agent handoff
const sampleCapture = captureResults[0];
const builderPath = sampleCapture?.builderRoute ?? "/apps/ai-agent-builder?source_type=intent_capture&intent=test";
const builder = await fetchText(builderPath.startsWith("http") ? builderPath : builderPath);
const builderUrl = new URL(builderPath.startsWith("http") ? builderPath : builderPath, BASE);
const builderPage = await fetchText(`/apps/ai-agent-builder${builderUrl.search}`);

const paramsPreserved =
  builderUrl.searchParams.get("source_type") === "intent_capture" &&
  Boolean(builderUrl.searchParams.get("source_reference_id")) &&
  Boolean(builderUrl.searchParams.get("intent"));

const builderHtmlOk =
  builderPage.response.status === 200 &&
  builderPage.text.includes("ai-agent-builder-form") &&
  builderPage.text.includes("intent_capture");

report.phases.aiAgentHandoff = {
  ok: builderPage.response.status === 200 && paramsPreserved && builderHtmlOk,
  status: builderPage.response.status,
  paramsPreserved,
  sourceType: builderUrl.searchParams.get("source_type"),
  hasIntentParam: Boolean(builderUrl.searchParams.get("intent")),
  hasPrefillScript: builderPage.text.includes("prefillFromQueryParams"),
  intentFlowsToPackageName: builderPage.text.includes('params.get("intent")'),
};

if (builderPage.response.status !== 200) {
  regression("BLOCKER", "AI_BUILDER_LOAD", "/apps/ai-agent-builder failed to load");
} else if (!paramsPreserved) {
  regression("MAJOR", "AI_BUILDER_PARAMS", "handoff query params not preserved");
}

// Phase F — automation boundary
const automationCapture = await fetchJson("/api/growth/intent-capture", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    sessionId: uuid(),
    page: "/enter",
    intent: "automate invoice reconciliation workflow",
    category: "automation",
    interactionDepth: { dwellMs: 20000, clicks: 2 },
  }),
});
const automationBuilderPath = automationCapture.json?.preview?.builderRoute ?? automationCapture.json?.builderRoute;
const automationPage = automationBuilderPath
  ? await fetchText(automationBuilderPath.startsWith("http") ? automationBuilderPath : automationBuilderPath)
  : null;
const automationApiProbe = await fetchJson("/api/automation-build-spec-generate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ source_type: "intent_capture", package_name: "smoke" }),
});

const automationBounded =
  automationCapture.json?.preview?.builderRoute?.includes("automation-builder") &&
  (automationApiProbe.response.status === 401 || automationApiProbe.response.status === 404);

report.phases.automationBoundary = {
  ok: automationBounded,
  routesToAutomationBuilder: automationCapture.json?.preview?.builderRoute?.includes("automation-builder") ?? false,
  automationApiStatus: automationApiProbe.response.status,
  automationApiAbsent: automationApiProbe.response.status === 404 || automationApiProbe.response.status === 401,
  prefillPresent: automationPage ? automationPage.text.includes('params.get("intent")') : false,
  submitShowsErrorNotFakeComplete:
    automationPage?.text.includes("automation-build-spec-generate") && automationPage.text.includes("error"),
  classification: "KNOWN_LIMITATION",
};

if (!automationCapture.json?.preview?.builderRoute?.includes("automation-builder")) {
  regression("MINOR", "AUTOMATION_ROUTE", "automation category should route to automation builder");
}
if (automationApiProbe.response.status === 200) {
  regression("MAJOR", "AUTOMATION_API_LEAK", "automation-build-spec-generate unexpectedly available publicly");
}

// Phase G — operator dashboard
let operatorToken = process.env.STAGING_OPERATOR_TOKEN?.trim() || null;
const operatorCallsign = process.env.STAGING_OPERATOR_CALLSIGN?.trim();
const operatorPassword = process.env.STAGING_OPERATOR_PASSWORD?.trim();

if (!operatorToken && operatorCallsign && operatorPassword) {
  const login = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callsign: operatorCallsign, password: operatorPassword }),
  });
  if (login.response.status === 200 && login.json?.accessToken) {
    operatorToken = login.json.accessToken;
  }
}

const dashboardShell = await fetchText("/dashboard");
const cockpitAssetMatch = dashboardShell.text.match(/cockpit-[^"']+\.js/);
let cockpitBundle = null;
if (cockpitAssetMatch) {
  cockpitBundle = await fetchText(`/assets/${cockpitAssetMatch[0]}`);
}

const bundlePanels = cockpitBundle
  ? {
      intentCapture: cockpitBundle.text.includes("Intent Capture"),
      flowIntelligence: cockpitBundle.text.includes("Flow Intelligence"),
      flowExperiment: cockpitBundle.text.includes("Flow Experiment"),
      intentRate: cockpitBundle.text.includes("intentRate") || cockpitBundle.text.includes("Intent rate"),
      intentReportApi: cockpitBundle.text.includes("intent-capture/report") || cockpitBundle.text.includes("growth/intent-capture"),
    }
  : null;

let dashboardApi = null;
if (operatorToken) {
  const authHeaders = { Authorization: `Bearer ${operatorToken}` };
  const [intentReport, flowIntel, flowExp] = await Promise.all([
    fetchJson("/api/growth/intent-capture/report", { headers: authHeaders }),
    fetchJson("/api/flow/intelligence", { headers: authHeaders }),
    fetchJson("/api/flow/experiment/report", { headers: authHeaders }),
  ]);
  dashboardApi = {
    intentReport: { status: intentReport.response.status, ok: intentReport.json?.ok === true },
    flowIntelligence: { status: flowIntel.response.status, ok: flowIntel.response.status === 200 },
    flowExperiment: { status: flowExp.response.status, ok: flowExp.json?.ok === true || flowExp.response.status === 200 },
    intentRatePresent:
      intentReport.json?.intentRate !== undefined || intentReport.json?.report?.includes("Intent rate"),
  };
  if (intentReport.response.status === 401 || intentReport.response.status === 403) {
    regression("MAJOR", "DASHBOARD_INTENT_REPORT_AUTH", "operator intent report failed with auth token");
  }
}

report.phases.dashboardValidation = {
  authMode: operatorToken ? "authenticated" : "auth_pending",
  dashboardShellStatus: dashboardShell.response.status,
  cockpitAsset: cockpitAssetMatch?.[0] ?? null,
  bundlePanels,
  dashboardApi,
};

if (dashboardShell.response.status !== 200) {
  regression("MAJOR", "DASHBOARD_SHELL", "/dashboard did not return 200");
}
if (cockpitBundle && cockpitBundle.text.length < 5000) {
  regression("MAJOR", "DASHBOARD_BUNDLE", "cockpit bundle appears truncated or wrong asset");
}
if (bundlePanels && (!bundlePanels.intentCapture || !bundlePanels.flowIntelligence || !bundlePanels.flowExperiment)) {
  regression("MINOR", "DASHBOARD_PANELS_MISSING", "one or more dashboard panels missing from deployed bundle");
}

// Phase H/I — classify + go/no-go
report.regressions = regressions;

const blockers = regressions.filter((r) => r.severity === "BLOCKER");
const majors = regressions.filter((r) => r.severity === "MAJOR");

let goNoGo = "READY_FOR_PRODUCTION";
if (blockers.length > 0) {
  goNoGo = "NOT_READY";
} else if (majors.length > 0 || !operatorToken) {
  goNoGo = "READY_FOR_STAGING_ONLY";
}

report.summary = {
  publicFunnel: report.phases.publicFunnel.ok ? "working" : "broken",
  flowTracking: report.phases.flowTracking.ok ? "working" : "broken",
  experimentAssignment: report.phases.experimentAssignment.ok ? "working" : "broken",
  intentCapture: report.phases.intentCapture.ok ? "working" : "broken",
  aiAgentHandoff: report.phases.aiAgentHandoff.ok ? "working" : "broken",
  automationBoundary: report.phases.automationBoundary.ok ? "bounded" : automationApiProbe.response.status === 200 ? "leaking" : "broken",
  dashboardValidation: operatorToken
    ? dashboardApi?.intentReport?.ok
      ? "working"
      : "broken"
    : bundlePanels?.intentCapture
      ? "auth_pending"
      : "broken",
  goNoGo,
};

console.log(JSON.stringify(report, null, 2));
process.exit(blockers.length > 0 || !report.phases.intentCapture.ok || !report.phases.aiAgentHandoff.ok ? 1 : 0);
