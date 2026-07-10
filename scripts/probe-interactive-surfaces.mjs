#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const t = await r.text();
  return {
    path,
    status: r.status,
    xSplash: r.headers.get("x-splash-route"),
    title: t.match(/<title>([^<]+)/)?.[1],
    hasRoot: t.includes('id="root"'),
    staticAgentsGrid: t.includes("agents-grid-g4"),
    reactCatalogGrid: t.includes("CatalogGrid") || t.includes("Loading catalog"),
    browseAgents: t.includes("Browse agents"),
    marketplaceSection: t.includes("MarketplaceSection") || t.includes("marketplace-launch"),
    operatorShell: t.includes("Operator Terminal") || t.includes("OperatorShell"),
    spaBundle: /\/assets\/index-[^"']+\.js/.test(t),
    len: t.length,
  };
}

const paths = ["/", "/login", "/marketplace", "/dashboard", "/systems", "/app", "/app/marketplace"];
const results = [];
for (const path of paths) results.push(await probe(path));
console.log(JSON.stringify({ base, results }, null, 2));
