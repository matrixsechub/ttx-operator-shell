#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "http://127.0.0.1:8787";
const res = await fetch(`${base}/api/operator/activation/overview`, {
  headers: { Accept: "application/json" },
});
const json = await res.json().catch(() => ({}));
const ok = res.status === 401 || (res.status === 200 && json.overview?.safeMode);
console.log(JSON.stringify({ script: "verify-activation-safe-mode", base, status: res.status, ok }, null, 2));
process.exit(ok ? 0 : 1);
