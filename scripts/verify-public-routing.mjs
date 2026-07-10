#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const t = await r.text();
  const ct = (r.headers.get("content-type") || "").toLowerCase();
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
    jsAsset: ct.includes("javascript") || ct.includes("ecmascript"),
    len: t.length,
  };
}

const paths = ["/", "/welcome", "/splash.html", "/storefront", "/marketplace", "/app", "/login", "/ops/fedgrade"];
const results = [];
for (const path of paths) results.push(await probe(path));

const root = results.find((row) => row.path === "/");
const welcome = results.find((row) => row.path === "/welcome");
const splash = results.find((row) => row.path === "/splash.html");
const marketplace = results.find((row) => row.path === "/marketplace");
const login = results.find((row) => row.path === "/login");
const ops = results.find((row) => row.path === "/ops/fedgrade");

const checks = {
  rootEcosystemHeader: root?.xEcosystem === "unified-entry",
  rootStorefrontShell: root?.storefront && root?.xStorefront === "mshops-spa" && root?.hasRoot,
  welcomeEcosystem: results.find((row) => row.path === "/welcome")?.xEcosystem === "unified-entry",
  splashBlocked: splash?.status === 410,
  noSplashHeader: !root?.xSplash && !welcome?.xSplash,
  marketplaceStorefront: marketplace?.storefront && marketplace?.xStorefront === "mshops-spa",
  loginOperator: login?.operator && login?.xOperator === "ttx-cockpit",
  opsCockpit: ops?.operator && ops?.xOperator === "ttx-cockpit",
};

console.log(JSON.stringify({ base, results, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
