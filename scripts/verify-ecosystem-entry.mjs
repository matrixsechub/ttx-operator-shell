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
    title: t.match(/<title>([^<]+)/)?.[1],
    hasRoot: t.includes('id="root"'),
    staticSplash: t.includes("launch-screen-x1a0"),
    storefrontShell: t.includes("MSH OPS Storefront"),
    len: t.length,
  };
}

const paths = ["/", "/welcome", "/storefront", "/systems", "/marketplace", "/splash.html"];
const results = [];
for (const path of paths) results.push(await probe(path));

const root = results.find((row) => row.path === "/");
const systems = results.find((row) => row.path === "/systems");

const checks = {
  rootEcosystemHeader: root?.xEcosystem === "unified-entry",
  rootStorefrontShell: root?.xStorefront === "mshops-spa" && root?.hasRoot,
  noStaticSplash: !root?.staticSplash && !root?.xSplash,
  splashBlocked: results.find((row) => row.path === "/splash.html")?.status === 410,
  systemsOperator: systems?.title?.includes("Operator"),
  marketplaceOk: results.find((row) => row.path === "/marketplace")?.xStorefront === "mshops-spa",
};

console.log(JSON.stringify({ base, results, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
