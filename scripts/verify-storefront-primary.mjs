#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const t = await r.text();
  const ct = (r.headers.get("content-type") || "").toLowerCase();
  return {
    path,
    status: r.status,
    xStorefront: r.headers.get("x-storefront-route"),
    xSplash: r.headers.get("x-splash-route"),
    title: t.match(/<title>([^<]+)/)?.[1],
    hasRoot: t.includes('id="root"'),
    storefront: t.includes("MSH OPS Storefront"),
    legacyOperator: t.includes("Operator Terminal"),
    mshopsBundle: t.includes("/app/assets/index-"),
    browseAgents: t.includes("Browse agents"),
    jsAsset: ct.includes("javascript") || ct.includes("ecmascript"),
    len: t.length,
  };
}

const paths = ["/", "/marketplace", "/login", "/app/assets/index-CIRprURT.js"];
const results = [];
for (const path of paths) results.push(await probe(path));

const root = results.find((row) => row.path === "/");
const bundle = results.find((row) => row.path.includes("/app/assets/"));
const marketplace = results.find((row) => row.path === "/marketplace");

const checks = {
  rootStorefrontShell: root?.storefront && root?.hasRoot && !root?.legacyOperator,
  rootStorefrontHeader: root?.xStorefront === "mshops-spa",
  bundleServed: bundle?.jsAsset && bundle?.status === 200,
  marketplaceShell: marketplace?.storefront && marketplace?.hasRoot,
  noSplashHeader: !root?.xSplash,
};

console.log(JSON.stringify({ base, results, checks }, null, 2));

const failed = Object.entries(checks).filter(([, ok]) => !ok);
process.exit(failed.length ? 1 : 0);
