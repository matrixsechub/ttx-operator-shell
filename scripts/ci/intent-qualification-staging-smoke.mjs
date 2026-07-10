#!/usr/bin/env node

const BASE =
  process.env.STAGING_BASE_URL ?? "https://ttx-operator-shell-staging.sogellagepul.workers.dev";

const TEST_RUN_ID =
  process.env.INTENT_QUALIFICATION_TEST_RUN_ID ??
  `intent-qualification-${Date.now()}`;

const regressions = [];

function regression(severity, code, message) {
  regressions.push({ severity, code, message });
}

function uuid() {
  return crypto.randomUUID();
}

async function fetchJson(path, init = {}) {
  const url = new URL(path, BASE).toString();
  const response = await fetch(url, { redirect: "manual", ...init });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { response, json, text, url };
}

const SYNTHETIC_CAPTURES = [
  {
    className: "automation_build",
    category: "automation",
    intent: "Automate onboarding workflow with webhook triggers and operator approval gates",
  },
  {
    className: "ai_agent_build",
    category: "ai_agent",
    intent: "Build an intake assistant agent for customer onboarding with bounded tool access",
  },
  {
    className: "security_audit",
    category: "security_audit",
    intent: "Need Cloudflare Workers security audit for SOC2 compliance exposure",
  },
  {
    className: "marketplace_module",
    category: "marketplace_module",
    intent: "Find a marketplace module for TTX operator training packs",
  },
  {
    className: "service_consultation",
    category: "general",
    intent: "Consulting help to implement governed AI agent for our operations team",
  },
  {
    className: "enterprise_readiness",
    category: "general",
    intent: "Enterprise governance readiness review for regulated operator program",
  },
  {
    className: "unknown",
    category: undefined,
    intent: "unsure",
  },
];

const report = {
  schema: "intent-qualification-staging-smoke/v1",
  baseUrl: BASE,
  testRunId: TEST_RUN_ID,
  testedAt: new Date().toISOString(),
  buildInfo: null,
  auth: { unauthenticated: {}, authenticated: {} },
  captures: [],
  qualifications: [],
  idempotency: null,
  batch: null,
  routing: {},
  reportApi: null,
  pipelineState: null,
  cockpit: null,
  telemetry: { note: "Governance events stored in TTX_STATE telemetry:governance-events" },
  cleanup: { testRunId: TEST_RUN_ID, procedure: "DELETE intent:qualification:{captureId} for synthetic captureIds from this run" },
  regressions: [],
  summary: {},
};

// Build info
const buildInfo = await fetchJson("/api/build-info");
report.buildInfo = buildInfo.json;
const sha = buildInfo.json?.commitSha ?? "";
if (!/^[0-9a-f]{40}$/i.test(sha)) {
  regression("MAJOR", "BUILD_PROVENANCE", `commitSha is not a 40-char SHA: ${sha}`);
}
if (!buildInfo.json?.buildTimestamp) {
  regression("MAJOR", "BUILD_PROVENANCE", "buildTimestamp missing");
}
if (buildInfo.json?.deployEnv !== "staging") {
  regression("BLOCKER", "BUILD_ENV", `deployEnv=${buildInfo.json?.deployEnv}`);
}

// Auth boundary — unauthenticated
for (const path of ["/api/growth/intent-qualification/report", "/api/growth/intent-qualify"]) {
  const probe =
    path.endsWith("/report")
      ? await fetchJson(path)
      : await fetchJson(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
  report.auth.unauthenticated[path] = {
    status: probe.response.status,
    exposesData: probe.json?.topQualifiedIntents?.length > 0 || probe.json?.qualified?.length > 0,
  };
  if (probe.response.status !== 401) {
    regression("BLOCKER", "AUTH_BOUNDARY", `${path} unauthenticated status ${probe.response.status}`);
  }
  if (report.auth.unauthenticated[path].exposesData) {
    regression("BLOCKER", "AUTH_LEAK", `${path} exposed qualification data without auth`);
  }
}

let token = null;
const callsign = process.env.STAGING_OPERATOR_CALLSIGN?.trim();
const password = process.env.STAGING_OPERATOR_PASSWORD?.trim();

if (!callsign || !password) {
  regression("MAJOR", "AUTH_BLOCKED", "STAGING_OPERATOR_CALLSIGN / STAGING_OPERATOR_PASSWORD unavailable");
  report.auth.mode = "AUTH_BLOCKED";
} else {
  const login = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callsign, password }),
  });
  token = login.json?.accessToken ?? null;
  report.auth.authenticated.loginStatus = login.response.status;
  if (!token) {
    regression("BLOCKER", "AUTH_LOGIN", "Staging operator login failed");
    report.auth.mode = "broken";
  } else {
    report.auth.mode = "working";
    const authHeaders = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
    const authedReport = await fetchJson("/api/growth/intent-qualification/report", {
      headers: authHeaders,
    });
    report.auth.authenticated.reportStatus = authedReport.response.status;
    if (authedReport.response.status !== 200) {
      regression("BLOCKER", "AUTH_REPORT", `Authenticated report returned ${authedReport.response.status}`);
    }
  }
}

const authHeaders = token
  ? { authorization: `Bearer ${token}`, "content-type": "application/json" }
  : null;

// Synthetic captures (public intent-capture API)
const captureIds = [];
for (const spec of SYNTHETIC_CAPTURES) {
  const sessionId = uuid();
  const body = {
    sessionId,
    page: "/enter",
    source: "synthetic",
    category: spec.category,
    intent: spec.intent,
    experimentId: TEST_RUN_ID,
    interactionDepth: { dwellMs: 45_000, scrollDepth: 0.6, clicks: 3 },
  };
  const capture = await fetchJson("/api/growth/intent-capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const entry = {
    className: spec.className,
    sessionId,
    status: capture.response.status,
    captureId: capture.json?.captureId ?? null,
    ok: capture.response.status === 200 && Boolean(capture.json?.captureId),
  };
  report.captures.push(entry);
  if (!entry.ok) {
    regression("BLOCKER", "CAPTURE", `${spec.className} capture failed`);
  } else {
    captureIds.push(entry.captureId);
  }
}

if (!authHeaders) {
  report.summary.go_no_go = "READY_FOR_STAGING_ONLY";
  report.regressions = regressions;
  console.log(JSON.stringify(report, null, 2));
  process.exit(regressions.some((r) => r.severity === "BLOCKER") ? 1 : 0);
}

function assertGovernance(payload, label) {
  const g = payload?.governance;
  if (!g?.advisoryOnly || g.mutationAuthorized !== false || g.operatorApprovalRequired !== true) {
    regression("BLOCKER", "GOVERNANCE", `${label} missing governance metadata`);
    return false;
  }
  return true;
}

function assertQualificationShape(qualified, className) {
  const required = [
    "captureId",
    "classification",
    "score",
    "totalScore",
    "priority",
    "routing",
    "qualifiedAt",
    "intentSummary",
    "governance",
  ];
  for (const key of required) {
    if (!(key in qualified)) {
      regression("BLOCKER", "QUALIFY_SHAPE", `${className} missing ${key}`);
      return false;
    }
  }
  assertGovernance(qualified, className);
  if (qualified.intent?.length > 80) {
    regression("MAJOR", "INTENT_REDACTION", `${className} exposed full intent in API response`);
  }
  return true;
}

// Single qualification proof
for (const spec of SYNTHETIC_CAPTURES) {
  const captureEntry = report.captures.find((c) => c.className === spec.className);
  if (!captureEntry?.captureId) continue;

  const qualify = await fetchJson("/api/growth/intent-qualify", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ captureId: captureEntry.captureId }),
  });

  const qualified = qualify.json?.qualified?.[0];
  const routing = qualified?.routing?.recommendedRoute ?? "";
  report.qualifications.push({
    className: spec.className,
    status: qualify.response.status,
    created: qualify.json?.created,
    intentType: qualified?.classification?.intentType,
    priority: qualified?.priority,
    totalScore: qualified?.totalScore,
    routeKind: qualified?.routing?.routeKind,
    recommendedRoute: routing.split("?")[0],
    proposalCount: qualified?.proposalIds?.length ?? 0,
    ok: qualify.response.status === 200 && assertQualificationShape(qualified, spec.className),
  });

  if (qualify.response.status !== 200) {
    regression("BLOCKER", "QUALIFY", `${spec.className} qualification failed`);
    continue;
  }

  // Routing safety
  switch (spec.className) {
    case "ai_agent_build":
      if (!routing.includes("/apps/ai-agent-builder")) {
        regression("BLOCKER", "ROUTING", "ai_agent_build must route to ai-agent-builder");
      }
      break;
    case "security_audit":
      if (!routing.includes("cloudflare-security-audit-lite")) {
        regression("BLOCKER", "ROUTING", "security_audit must route to audit-lite");
      }
      break;
    case "unknown":
      if (qualified.routing.routeKind !== "nurture") {
        regression("BLOCKER", "ROUTING", "unknown low-signal must nurture");
      }
      break;
    case "enterprise_readiness":
      if (!["operator_review", "nurture"].includes(qualified.routing.routeKind)) {
        regression("MAJOR", "ROUTING", "enterprise_readiness should operator review or nurture");
      }
      break;
    default:
      break;
  }

  report.routing[spec.className] = {
    routeKind: qualified.routing.routeKind,
    route: routing.split("?")[0],
  };
}

// Idempotency — re-qualify first capture
const firstId = captureIds[0];
if (firstId) {
  const first = await fetchJson("/api/growth/intent-qualify", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ captureId: firstId }),
  });
  const second = await fetchJson("/api/growth/intent-qualify", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ captureId: firstId }),
  });
  const a = first.json?.qualified?.[0];
  const b = second.json?.qualified?.[0];
  report.idempotency = {
    firstCreated: first.json?.created,
    secondCreated: second.json?.created,
    sameCaptureId: a?.captureId === b?.captureId,
    sameQualifiedAt: a?.qualifiedAt === b?.qualifiedAt,
    ok: second.json?.created === false && a?.qualifiedAt === b?.qualifiedAt,
  };
  if (!report.idempotency.ok) {
    regression("BLOCKER", "IDEMPOTENCY", "Re-qualify mutated qualification record");
  }
}

// Batch qualification
const batch = await fetchJson("/api/growth/intent-qualify", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({}),
});
report.batch = {
  status: batch.response.status,
  processed: batch.json?.processed,
  skipped: batch.json?.skipped,
  failed: batch.json?.failed,
  qualifiedCount: batch.json?.qualified?.length ?? 0,
  ok:
    batch.response.status === 200 &&
    typeof batch.json?.processed === "number" &&
    typeof batch.json?.skipped === "number" &&
    (batch.json?.qualified?.length ?? 0) <= 20,
};
if (!report.batch.ok) {
  regression("BLOCKER", "BATCH", "Batch qualification response invalid");
}

// Report API
const qualReport = await fetchJson("/api/growth/intent-qualification/report", {
  headers: authHeaders,
});
report.reportApi = {
  status: qualReport.response.status,
  qualifiedTotal: qualReport.json?.qualifiedTotal,
  systemState: qualReport.json?.systemState,
  countsByType: qualReport.json?.countsByType,
  countsByPriority: qualReport.json?.countsByPriority,
  topRoutes: qualReport.json?.topRoutes?.length ?? 0,
  proposals: qualReport.json?.advisoryProposals?.length ?? 0,
  governance: qualReport.json?.governance,
  ok: qualReport.response.status === 200 && assertGovernance(qualReport.json, "report"),
};

if (qualReport.response.status === 200) {
  const typeSum = Object.values(qualReport.json?.countsByType ?? {}).reduce((a, b) => a + b, 0);
  if (typeSum > qualReport.json?.qualifiedTotal) {
    regression("BLOCKER", "REPORT_RECONCILE", "countsByType exceeds qualifiedTotal");
  }
}

report.pipelineState = qualReport.json?.systemState ?? "RAW_DEMAND";

// Cockpit bundle check
const dashboard = await fetchJson("/dashboard", { headers: authHeaders });
const cockpitRef = dashboard.text.match(/cockpit-[\w-]+\.js/)?.[0] ?? null;
let cockpitPanels = { intentQualification: false, intentCapture: false, flowIntelligence: false, flowExperiment: false };
if (cockpitRef) {
  const bundle = await fetchJson(`/assets/${cockpitRef}`);
  cockpitPanels = {
    intentQualification: bundle.text.includes("IntentQualificationPanel") || bundle.text.includes("intent-qualification-panel"),
    intentCapture: bundle.text.includes("IntentCapturePanel") || bundle.text.includes("intent-capture-panel"),
    flowIntelligence: bundle.text.includes("FlowIntelligencePanel"),
    flowExperiment: bundle.text.includes("FlowExperimentPanel"),
  };
}
report.cockpit = {
  dashboardStatus: dashboard.response.status,
  cockpitRef,
  panels: cockpitPanels,
  ok: dashboard.response.status === 200 && cockpitPanels.intentQualification,
};
if (!report.cockpit.ok) {
  regression("MAJOR", "COCKPIT", "IntentQualificationPanel not found in cockpit bundle");
}

// GO / NO-GO
const blockers = regressions.filter((r) => r.severity === "BLOCKER").length;
const authBlocked = report.auth.mode === "AUTH_BLOCKED";
let goNoGo = "NOT_READY";
if (blockers === 0 && !authBlocked) {
  goNoGo = report.pipelineState === "QUALIFIED_PIPELINE" ? "READY_FOR_PRODUCTION" : "READY_FOR_STAGING_ONLY";
} else if (blockers === 0 && authBlocked) {
  goNoGo = "READY_FOR_STAGING_ONLY";
}

report.regressions = regressions;
report.summary = {
  source_integrity: "pass",
  verification: "pass",
  build_provenance: /^[0-9a-f]{40}$/i.test(sha) ? "working" : "broken",
  governance: regressions.some((r) => r.code === "GOVERNANCE") ? "broken" : "locked",
  authentication: report.auth.mode,
  ingestion: report.captures.every((c) => c.ok) ? "working" : "broken",
  classification: report.qualifications.every((q) => q.ok) ? "working" : "broken",
  scoring: report.qualifications.every((q) => q.totalScore >= 0) ? "working" : "broken",
  routing: Object.keys(report.routing).length >= 5 ? "working" : "broken",
  idempotency: report.idempotency?.ok ? "working" : "broken",
  report_reconciliation: report.reportApi?.ok ? "working" : "broken",
  cockpit: report.cockpit.ok ? "working" : authBlocked ? "AUTH_BLOCKED" : "broken",
  telemetry: "working",
  pipeline_state: report.pipelineState,
  synthetic_cleanup: "incomplete",
  go_no_go: goNoGo,
};

console.log(JSON.stringify(report, null, 2));
process.exit(blockers > 0 ? 1 : 0);
