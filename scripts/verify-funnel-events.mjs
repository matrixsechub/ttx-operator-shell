#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "http://127.0.0.1:8787";
const sessionId = crypto.randomUUID();
await fetch(`${base}/api/usage/event`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ event: "visit", sessionId, trafficSource: "email" }),
});
const res = await fetch(`${base}/api/usage/event`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ event: "service_view", sessionId }),
});
const json = await res.json().catch(() => ({}));
const ok = res.status === 200 && json.ok === true;
console.log(JSON.stringify({ script: "verify-funnel-events", base, status: res.status, counted: json.counted, ok }, null, 2));
process.exit(ok ? 0 : 1);
