#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, { redirect: "manual", headers: { "Cache-Control": "no-cache" } });
  const location = r.headers.get("location");
  const t = r.status === 301 || r.status === 302 ? "" : await r.text();
  return {
    path,
    status: r.status,
    location,
    surface: r.headers.get("x-surface"),
    xEcosystem: r.headers.get("x-ecosystem-route"),
    xStorefront: r.headers.get("x-surface-route"),
    xCockpit: r.headers.get("x-operator-route"),
    xAuth: r.headers.get("x-auth-route"),
    xGov: r.headers.get("x-governance-route"),
    title: t.match(/<title>([^<]+)/)?.[1],
    isEcosystem: t.includes("Ecosystem Entry"),
    isStorefront: t.includes("MSH OPS Storefront"),
    isCockpit: t.includes("Operator Terminal"),
    isAuth: t.includes("Operator Auth"),
    isCouncil: t.includes("Operator Council"),
    redirectsToLogin: location?.includes("/login") ?? false,
  };
}

const paths = ["/", "/marketplace", "/login", "/council", "/systems", "/ops/fedgrade"];
const results = [];
for (const path of paths) results.push(await probe(path));

const checks = {
  rootIsEcosystem: results.find((r) => r.path === "/")?.surface === "ecosystem",
  rootNotStorefront: results.find((r) => r.path === "/")?.isStorefront === false,
  rootNotCockpit: results.find((r) => r.path === "/")?.isCockpit === false,
  marketplaceStorefront: results.find((r) => r.path === "/marketplace")?.surface === "storefront",
  loginIsAuth: results.find((r) => r.path === "/login")?.surface === "auth",
  councilIsGovernance: results.find((r) => r.path === "/council")?.surface === "governance",
  systemsIsCockpit: results.find((r) => r.path === "/systems")?.surface === "cockpit",
  opsIsCockpit: results.find((r) => r.path === "/ops/fedgrade")?.surface === "cockpit",
  noServerLoginRedirectOnPublic: ["/", "/marketplace"].every((p) => {
    const row = results.find((r) => r.path === p);
    return row && !row.redirectsToLogin;
  }),
  shellsIsolated:
    results.find((r) => r.path === "/")?.isEcosystem === true &&
    results.find((r) => r.path === "/")?.isStorefront === false &&
    results.find((r) => r.path === "/systems")?.isStorefront === false &&
    results.find((r) => r.path === "/login")?.isStorefront === false,
};

console.log(JSON.stringify({ base, results, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
