#!/usr/bin/env node
const base = process.argv[2] || "https://mshops-operator.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const t = await r.text();
  const ct = (r.headers.get("content-type") || "").toLowerCase();
  return {
    path,
    status: r.status,
    xOperator: r.headers.get("x-operator-route"),
    xStorefront: r.headers.get("x-storefront-route"),
    title: t.match(/<title>([^<]+)/)?.[1],
    hasRoot: t.includes('id="root"'),
    operatorTerminal: t.includes("Operator Terminal"),
    storefront: t.includes("MSH OPS Storefront"),
    jsAsset: ct.includes("javascript") || ct.includes("ecmascript"),
    len: t.length,
  };
}

const paths = ["/", "/login", "/dashboard", "/ops/fedgrade", "/marketplace", "/systems"];
const results = [];
for (const path of paths) results.push(await probe(path));

const assetPath =
  results
    .find((row) => row.path === "/")
    ?.title === "MSH OPS // Operator Terminal"
    ? "/assets/"
    : null;

let bundleProbe = null;
if (assetPath) {
  const shell = await fetch(`${base}/`, { headers: { "Cache-Control": "no-cache" } }).then((r) => r.text());
  const bundle = shell.match(/\/assets\/[^"']+\.js/)?.[0];
  if (bundle) bundleProbe = await probe(bundle);
}

const root = results.find((row) => row.path === "/");
const checks = {
  rootOperatorShell: root?.operatorTerminal && root?.hasRoot && !root?.storefront,
  rootOperatorHeader: root?.xOperator === "ttx-cockpit",
  noStorefrontHeader: !root?.xStorefront,
  loginOperatorShell: results.find((row) => row.path === "/login")?.operatorTerminal,
  opsRouteShell: results.find((row) => row.path === "/ops/fedgrade")?.operatorTerminal,
  bundleServed: bundleProbe ? bundleProbe.jsAsset && bundleProbe.status === 200 : false,
};

console.log(JSON.stringify({ base, results, bundleProbe, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
