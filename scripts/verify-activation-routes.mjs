#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "http://127.0.0.1:8787";
const routes = [
  ["/api/traffic/interaction", "POST"],
  ["/api/traffic/activation", "GET"],
  ["/api/operator/activation/overview", "GET"],
  ["/api/operator/activation/campaigns", "GET"],
];
const results = [];
for (const [path, method] of routes) {
  const res = await fetch(`${base}${path}`, {
    method: method === "POST" ? "POST" : "GET",
    headers: method === "POST" ? { "Content-Type": "application/json" } : { Accept: "application/json" },
    body:
      method === "POST"
        ? JSON.stringify({ sessionId: crypto.randomUUID(), signal: "scroll_depth", timestamp: new Date().toISOString() })
        : undefined,
  });
  const acceptable = path.startsWith("/api/operator") ? [401, 403, 200, 503].includes(res.status) : [200, 400, 405].includes(res.status);
  results.push({ path, method, status: res.status, acceptable });
}
const ok = results.every((r) => r.acceptable);
console.log(JSON.stringify({ script: "verify-activation-routes", base, results, ok }, null, 2));
process.exit(ok ? 0 : 1);
