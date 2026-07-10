#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "http://127.0.0.1:8787";
const res = await fetch(`${base}/api/operator/activation/campaigns`, {
  headers: { Accept: "application/json" },
});
const ok = res.status === 401 || res.status === 200;
console.log(JSON.stringify({ script: "verify-campaign-registry", base, status: res.status, ok }, null, 2));
process.exit(ok ? 0 : 1);
