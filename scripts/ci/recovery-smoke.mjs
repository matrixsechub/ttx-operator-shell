const BASE = "https://ttx-operator-shell-staging.sogellagepul.workers.dev";

const results = [];

async function check(name, fn) {
  try {
    const r = await fn();
    results.push({ name, ...r });
  } catch (e) {
    results.push({ name, ok: false, error: String(e) });
  }
}

await check("enter_page", async () => {
  const r = await fetch(`${BASE}/enter`);
  const t = await r.text();
  return {
    ok: r.status === 200 && !t.includes("storefront shell missing"),
    status: r.status,
    hasIntentScript: t.includes("intent-capture.js"),
    hasIntentCss: t.includes("intent-capture.css"),
  };
});

await check("services_page", async () => {
  const r = await fetch(`${BASE}/services`);
  return { ok: r.status === 200, status: r.status };
});

await check("intake_page", async () => {
  const r = await fetch(`${BASE}/intake`);
  return { ok: r.status === 200, status: r.status };
});

await check("ai_agent_builder", async () => {
  const r = await fetch(`${BASE}/apps/ai-agent-builder`);
  return { ok: r.status === 200, status: r.status };
});

await check("intent_capture_api", async () => {
  const sessionId = crypto.randomUUID();
  const r = await fetch(`${BASE}/api/growth/intent-capture`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      page: "/enter",
      intent: "Need an AI agent for customer support",
      sessionId,
      interactionDepth: { dwellMs: 12000, clickDepth: 3 },
    }),
  });
  const j = await r.json();
  return {
    ok: r.status === 200 && Boolean(j.preview),
    status: r.status,
    captureId: j.captureId,
    preview: j.preview,
    builderRoute: j.builderRoute,
    error: j.error,
  };
});

await check("build_info", async () => {
  const r = await fetch(`${BASE}/api/build-info`);
  const j = await r.json();
  return {
    ok: r.status === 200,
    status: r.status,
    commit: j.commitSha ?? j.BUILD_COMMIT_SHA,
    version: j.appVersion ?? j.APP_VERSION,
    timestamp: j.buildTimestamp ?? j.BUILD_TIMESTAMP,
  };
});

await check("intent_report_auth", async () => {
  const r = await fetch(`${BASE}/api/growth/intent-capture/report`);
  return {
    ok: r.status === 401,
    status: r.status,
    note: "operator-only route should 401 without token",
  };
});

console.log(JSON.stringify(results, null, 2));
const failed = results.filter((x) => !x.ok);
process.exit(failed.length ? 1 : 0);
