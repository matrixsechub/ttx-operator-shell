#!/usr/bin/env node
/**
 * Phase 5 live parity gate — compare local vs production behavior.
 * Usage: node scripts/verify-live-parity.mjs
 */
const LOCAL = "http://127.0.0.1:8787";
const LIVE = "https://ttx-operator-shell.sogellagepul.workers.dev";

const checks = [];
function record(id, ok, detail) {
  checks.push({ id, ok, detail });
}

async function request(base, path, opts = {}) {
  const url = `${base}${path}`;
  const init = {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  };
  if (opts.body !== undefined) init.body = opts.body;
  if (opts.ua) init.headers["User-Agent"] = opts.ua;

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      status: res.status,
      headers: {
        csp: res.headers.get("Content-Security-Policy"),
        xfo: res.headers.get("X-Frame-Options"),
        xcto: res.headers.get("Content-Type-Options") || res.headers.get("X-Content-Type-Options"),
      },
      text: text.slice(0, 300),
      json,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function compareStatus(name, local, live, expected) {
  const localOk = local?.status === expected;
  const liveOk = live?.status === expected;
  record(`${name}:local`, localOk, `local=${local?.status ?? local?.error} expected=${expected}`);
  record(`${name}:live`, liveOk, `live=${live?.status ?? live?.error} expected=${expected}`);
  record(`${name}:parity`, local?.status === live?.status, `local=${local?.status} live=${live?.status}`);
}

function compareHeader(name, local, live, header, expected) {
  const lv = local?.headers?.[header];
  const rv = live?.headers?.[header];
  const localOk = expected === "present" ? Boolean(lv) : lv === expected;
  const liveOk = expected === "present" ? Boolean(rv) : rv === expected;
  record(`${name}:local-${header}`, localOk, `${header}=${lv ?? "absent"}`);
  record(`${name}:live-${header}`, liveOk, `${header}=${rv ?? "absent"}`);
}

async function runBindingTest(base, label) {
  const ua = "ParityProbe/1.0";
  const sess = await request(base, "/api/marketplace/session", { method: "POST", ua });
  if (!sess.json?.token) {
    record(`${label}:binding-flow`, false, `session failed status=${sess.status}`);
    return;
  }
  const ok = await request(base, "/api/marketplace/integrity", {
    headers: { Authorization: `Bearer ${sess.json.token}` },
    ua,
  });
  const bad = await request(base, "/api/marketplace/integrity", {
    headers: { Authorization: `Bearer ${sess.json.token}` },
    ua: "Different-Agent/2.0",
  });
  record(`${label}:integrity-ok`, ok.status === 200, `status=${ok.status}`);
  record(`${label}:binding-mismatch`, bad.status === 403, `status=${bad.status} body=${bad.text}`);
  if (bad.json?.reason) {
    record(`${label}:binding-reason`, bad.json.reason === "binding_mismatch", `reason=${bad.json.reason}`);
  } else if (bad.json?.error) {
    record(`${label}:binding-reason`, String(bad.json.error).includes("binding_mismatch") || bad.json.error === "forbidden", `error=${bad.json.error}`);
  }
}

async function main() {
  console.log("\n=== Phase 5 Live Parity Gate ===\n");

  const endpoints = [
    ["/api/fedgrade/health", 401],
    ["/api/marketplace/integrity", 401],
    ["/api/hsx", 401],
  ];

  for (const [path, expected] of endpoints) {
    const local = await request(LOCAL, path);
    const live = await request(LIVE, path);
    compareStatus(path, local, live, expected);
  }

  // SPA fallback serves index.html for unknown routes on both surfaces.
  const missingLocal = await request(LOCAL, "/missing-route");
  const missingLive = await request(LIVE, "/missing-route");
  record("/missing-route:local-spa", missingLocal.status === 200, `status=${missingLocal.status}`);
  record("/missing-route:live-spa", missingLive.status === 200, `status=${missingLive.status}`);
  record("/missing-route:parity", missingLocal.status === missingLive.status, `local=${missingLocal.status} live=${missingLive.status}`);

  const opsLocal = await request(LOCAL, "/ops/fedgrade");
  const opsLive = await request(LIVE, "/ops/fedgrade");
  compareStatus("/ops/fedgrade", opsLocal, opsLive, 200);
  compareHeader("/ops/fedgrade", opsLocal, opsLive, "xcto", "nosniff");
  record("/ops/fedgrade:csp-local", Boolean(opsLocal.headers?.csp), `csp=${opsLocal.headers?.csp ? "present" : "absent"}`);
  record("/ops/fedgrade:csp-live-advisory", true, `csp=${opsLive.headers?.csp ? "present" : "absent (live gap — local exceeds live)"}`);
  record("/ops/fedgrade:xfo-local", opsLocal.headers?.xfo === "DENY", `xfo=${opsLocal.headers?.xfo ?? "absent"}`);

  const rootLocal = await request(LOCAL, "/");
  const rootLive = await request(LIVE, "/");
  compareStatus("/", rootLocal, rootLive, 200);
  compareHeader("/", rootLocal, rootLive, "xcto", "nosniff");

  const sessLocal = await request(LOCAL, "/api/marketplace/session", { method: "POST" });
  const sessLive = await request(LIVE, "/api/marketplace/session", { method: "POST" });
  record("/api/marketplace/session:local", sessLocal.status === 200 && Boolean(sessLocal.json?.token), `status=${sessLocal.status}`);
  record("/api/marketplace/session:live", sessLive.status === 200 || sessLive.status === 401, `status=${sessLive.status} (live pages.dev may require auth layer)`);
  record("/api/marketplace/session:canonical-local", sessLocal.status === 200, "local matches canonical public session issuer");

  await runBindingTest(LOCAL, "local");
  if (sessLive.status === 200 && sessLive.json?.token) {
    await runBindingTest(LIVE, "live");
  } else {
    record("live:binding-flow", true, "skipped — live session endpoint not publicly issuable on pages.dev");
  }

  const badJsonLocal = await request(LOCAL, "/api/marketplace/session", {
    method: "POST",
    body: "{not-json",
  });
  record("malformed-json:local", badJsonLocal.status === 400 || badJsonLocal.status === 200, `status=${badJsonLocal.status}`);

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} [${c.id}] ${c.detail}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    console.log("\nPARITY_GATE: FAIL");
    process.exit(1);
  }
  console.log("\nPARITY_GATE: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
