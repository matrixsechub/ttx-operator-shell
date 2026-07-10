#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "http://127.0.0.1:8787";
const sessionId = crypto.randomUUID();
const res = await fetch(`${base}/api/traffic/interaction`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId, signal: "pointer_move", timestamp: new Date().toISOString() }),
});
const json = await res.json().catch(() => ({}));
const ok = res.status === 200 && json.ok === true;
console.log(JSON.stringify({ script: "verify-traffic-quality", base, status: res.status, quality: json.quality, ok }, null, 2));
process.exit(ok ? 0 : 1);
