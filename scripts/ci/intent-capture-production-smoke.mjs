#!/usr/bin/env node

const BASE =
  process.env.PRODUCTION_BASE_URL ?? "https://ttx-operator-shell.sogellagepul.workers.dev";

const regressions = [];

function regression(severity, code, message) {
  regressions.push({ severity, code, message });
}

function uuid() {
  return crypto.randomUUID();
}

async function fetchText(path, init) {
  const url = new URL(path, BASE).toString();
  const response = await fetch(url, { redirect: "manual", ...init });
  const text = await response.text();
  return { response, text };
}

async function fetchJson(path, init) {
  const { response, text } = await fetchText(path, init);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { response, json, text };
}

function hasFunnelAssets(html) {
  return {
    flow: html.includes("flow-tracker.js"),
    intent: html.includes("intent-capture.js") && html.includes("intent-capture.css"),
    shellBroken: /storefront shell missing|error code 503/i.test(html),
  };
}

const report = {
  schema: "intent-capture-production-smoke/v1",
  baseUrl: BASE,
  testedAt: new Date().toISOString(),
  checks: {},
  regressions: [],
};

const buildInfo = await fetchJson("/api/build-info");
report.buildInfo = buildInfo.json;
report.checks.buildInfo = buildInfo.response.status === 200;

const root = await fetchText("/");
const rootAssets = hasFunnelAssets(root.text);
report.checks.root = {
  status: root.response.status,
  ...rootAssets,
  ok: root.response.status === 200 && rootAssets.flow && rootAssets.intent && !rootAssets.shellBroken,
};
if (!report.checks.root.ok) regression("BLOCKER", "ROOT_FUNNEL", `/ failed: status ${root.response.status}`);

const welcome = await fetchText("/welcome");
const welcomeLocation = welcome.response.headers.get("location") ?? "";
const welcomeRedirectOk =
  (welcome.response.status === 301 || welcome.response.status === 302) &&
  new URL(welcomeLocation, BASE).pathname === "/";
report.checks.welcome = {
  status: welcome.response.status,
  location: welcomeLocation,
  ok: welcomeRedirectOk,
};
if (!welcomeRedirectOk) regression("BLOCKER", "WELCOME_REDIRECT", `/welcome did not redirect to /`);

const enter = await fetchText("/enter");
const enterAssets = hasFunnelAssets(enter.text);
report.checks.enter = {
  status: enter.response.status,
  ...enterAssets,
  ok: enter.response.status === 200 && enterAssets.flow && enterAssets.intent && !enterAssets.shellBroken,
};
if (!report.checks.enter.ok) regression("BLOCKER", "ENTER_FUNNEL", `/enter failed`);

const sessionId = uuid();
const flowEvent = await fetchJson("/api/flow/event", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    sessionId,
    event: "page_view",
    page: "/enter",
    dwellMs: 800,
    trafficSource: "production_smoke",
  }),
});
report.checks.flowEvent = {
  status: flowEvent.response.status,
  ok: flowEvent.response.status === 200 && flowEvent.json?.ok === true,
};
if (!report.checks.flowEvent.ok) regression("BLOCKER", "FLOW_EVENT", "POST /api/flow/event failed");

const capture = await fetchJson("/api/growth/intent-capture", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    sessionId: uuid(),
    page: "/enter",
    intent: "Production smoke intent capture validation",
    category: "ai_agent",
    interactionDepth: { dwellMs: 20000, clicks: 2 },
  }),
});
const builderRoute = capture.json?.builderRoute ?? capture.json?.preview?.builderRoute ?? null;
report.checks.intentCapture = {
  status: capture.response.status,
  hasPreview: Boolean(capture.json?.preview),
  builderRoute,
  ok: capture.response.status === 200 && Boolean(capture.json?.preview),
};
if (!report.checks.intentCapture.ok) regression("BLOCKER", "INTENT_CAPTURE", "POST /api/growth/intent-capture failed");

let handoffOk = false;
if (builderRoute) {
  const builder = await fetchText(builderRoute.startsWith("http") ? builderRoute : builderRoute);
  const url = new URL(builderRoute, BASE);
  handoffOk =
    builder.response.status === 200 &&
    url.searchParams.get("source_type") === "intent_capture" &&
    Boolean(url.searchParams.get("source_reference_id")) &&
    Boolean(url.searchParams.get("intent")) &&
    Boolean(url.searchParams.get("source_route"));
  report.checks.aiAgentBuilder = {
    status: builder.response.status,
    sourceType: url.searchParams.get("source_type"),
    sourceReferenceId: url.searchParams.get("source_reference_id"),
    intent: url.searchParams.get("intent"),
    sourceRoute: url.searchParams.get("source_route"),
    ok: handoffOk,
  };
} else {
  report.checks.aiAgentBuilder = { ok: false };
  regression("BLOCKER", "AI_BUILDER_HANDOFF", "missing builder route from capture response");
}

const builderPage = await fetchText("/apps/ai-agent-builder");
report.checks.aiAgentBuilderPage = {
  status: builderPage.response.status,
  ok: builderPage.response.status === 200,
};
if (!report.checks.aiAgentBuilderPage.ok) regression("MAJOR", "AI_BUILDER_PAGE", "/apps/ai-agent-builder failed");

let operatorToken = process.env.PRODUCTION_OPERATOR_TOKEN?.trim() || process.env.STAGING_OPERATOR_TOKEN?.trim() || null;
const callsign = process.env.PRODUCTION_OPERATOR_CALLSIGN?.trim() || process.env.STAGING_OPERATOR_CALLSIGN?.trim();
const password = process.env.PRODUCTION_OPERATOR_PASSWORD?.trim() || process.env.STAGING_OPERATOR_PASSWORD?.trim();

if (!operatorToken && callsign && password) {
  const login = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callsign, password }),
  });
  if (login.response.status === 200 && login.json?.accessToken) {
    operatorToken = login.json.accessToken;
  }
}

if (operatorToken) {
  const headers = { Authorization: `Bearer ${operatorToken}` };
  const [intentReport, flowIntel, flowExp, dashboard] = await Promise.all([
    fetchJson("/api/growth/intent-capture/report", { headers }),
    fetchJson("/api/flow/intelligence", { headers }),
    fetchJson("/api/flow/experiment/report", { headers }),
    fetchText("/dashboard"),
  ]);
  report.checks.dashboardAuth = {
    authMode: "authenticated",
    intentReport: intentReport.response.status,
    flowIntelligence: flowIntel.response.status,
    flowExperiment: flowExp.response.status,
    dashboardShell: dashboard.response.status,
    ok:
      intentReport.response.status === 200 &&
      flowIntel.response.status === 200 &&
      flowExp.response.status === 200 &&
      dashboard.response.status === 200,
  };
  if (!report.checks.dashboardAuth.ok) {
    regression("MAJOR", "DASHBOARD_AUTH", "authenticated dashboard APIs failed on production");
  }
} else {
  const dashboard = await fetchText("/dashboard");
  const cockpitRef = dashboard.text.match(/cockpit-[^"']+\.js/)?.[0];
  let bundlePanels = null;
  if (cockpitRef) {
    const bundle = await fetchText(`/assets/${cockpitRef}`);
    bundlePanels = {
      intentCapture: bundle.text.includes("Intent Capture"),
      flowIntelligence: bundle.text.includes("Flow Intelligence"),
      flowExperiment: bundle.text.includes("Flow Experiment"),
    };
  }
  report.checks.dashboardAuth = {
    authMode: "auth_pending",
    dashboardShell: dashboard.response.status,
    cockpitRef,
    bundlePanels,
    ok: dashboard.response.status === 200 && bundlePanels?.intentCapture === true,
  };
}

report.regressions = regressions;
report.summary = {
  publicFunnel:
    report.checks.root.ok && report.checks.welcome.ok && report.checks.enter.ok ? "working" : "broken",
  intentCapture: report.checks.intentCapture.ok ? "working" : "broken",
  aiAgentHandoff: handoffOk && report.checks.aiAgentBuilderPage.ok ? "working" : "broken",
  dashboardAuthValidation: operatorToken
    ? report.checks.dashboardAuth.ok
      ? "working"
      : "broken"
    : report.checks.dashboardAuth.ok
      ? "auth_pending"
      : "broken",
  finalState:
    regressions.some((r) => r.severity === "BLOCKER")
      ? "ROLLBACK_REQUIRED"
      : regressions.length > 0
        ? "PARTIAL"
        : "LIVE",
};

console.log(JSON.stringify(report, null, 2));
process.exit(regressions.some((r) => r.severity === "BLOCKER") ? 1 : 0);
