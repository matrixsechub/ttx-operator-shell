#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const t = await r.text();
  return {
    path,
    status: r.status,
    xEcosystem: r.headers.get("x-ecosystem-route"),
    xSplash: r.headers.get("x-splash-route"),
    xStorefront: r.headers.get("x-storefront-route"),
    xOperator: r.headers.get("x-operator-route"),
    title: t.match(/<title>([^<]+)/)?.[1],
    hasRoot: t.includes('id="root"'),
    staticSplash: t.includes("launch-screen-x1a0") || t.includes("MSHOPS Operator System"),
    storefront: t.includes("MSH OPS Storefront"),
    operator: t.includes("Operator Terminal"),
    homePage: t.includes("Cockpit Storefront") || t.includes("landing-layout"),
    len: t.length,
  };
}

const paths = ["/", "/welcome", "/splash.html", "/marketplace", "/login", "/ops/fedgrade"];
const results = [];
for (const path of paths) results.push(await probe(path));

const root = results.find((row) => row.path === "/");
const splash = results.find((row) => row.path === "/splash.html");

const checks = {
  rootIsEcosystemEntry: root?.xEcosystem === "unified-entry" && root?.xStorefront === "mshops-spa",
  rootNotStaticSplash: !root?.staticSplash && !root?.xSplash,
  splashBlocked: splash?.status === 410,
  marketplaceStorefront: results.find((row) => row.path === "/marketplace")?.storefront,
  loginOperator: results.find((row) => row.path === "/login")?.operator,
};

console.log(JSON.stringify({ base, results, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
