#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "http://127.0.0.1:8787";
const sessionId = crypto.randomUUID();
const res = await fetch(`${base}/api/usage/event`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event: "visit",
    sessionId,
    trafficSource: "linkedin",
    campaignId: "00000000-0000-4000-8000-000000000001",
  }),
});
const json = await res.json().catch(() => ({}));
const ok = res.status === 200 && json.ok === true;
console.log(JSON.stringify({ script: "verify-attribution-capture", base, status: res.status, counted: json.counted, ok }, null, 2));
process.exit(ok ? 0 : 1);
