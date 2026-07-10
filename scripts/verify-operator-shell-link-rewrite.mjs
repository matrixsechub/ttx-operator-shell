#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const t = await r.text();
  return {
    path,
    status: r.status,
    xEntry: r.headers.get("x-entry-route"),
    xProxied: r.headers.get("x-proxied-path"),
    title: t.match(/<title>([^<]+)/)?.[1],
    publicSurface: t.includes("Public Operator Surface"),
    operatorTerminal: t.includes("Operator Terminal"),
    hasBrokenOrigin: t.includes("ttx-operator-shell.sogellagepul.workers.dev"),
    len: t.length,
  };
}

const paths = ["/", "/enter", "/ecosystem", "/register", "/status", "/marketplace"];
const results = [];
for (const path of paths) results.push(await probe(path));

const checks = {
  rootProxied: results.find((r) => r.path === "/")?.xEntry === "operator-shell-proxy",
  enterProxied: results.find((r) => r.path === "/enter")?.xEntry === "operator-shell-page",
  ecosystemProxied: results.find((r) => r.path === "/ecosystem")?.xEntry === "operator-shell-page",
  registerProxied: results.find((r) => r.path === "/register")?.xEntry === "operator-shell-page",
  statusProxied: results.find((r) => r.path === "/status")?.xEntry === "operator-shell-page",
  allNav200: ["/", "/enter", "/ecosystem", "/register", "/status"].every(
    (p) => results.find((r) => r.path === p)?.status === 200,
  ),
  noUpstreamOrigin: results.every((r) => !r.hasBrokenOrigin),
  marketplaceStillMshops:
    results.find((r) => r.path === "/marketplace")?.title === "MSH OPS Storefront",
};

console.log(JSON.stringify({ base, results, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
