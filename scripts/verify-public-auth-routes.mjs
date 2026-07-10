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
    redirectsToLogin: location?.includes("/login") ?? false,
    bodyRedirectsToLogin: t.includes('to="/login"') || t.includes("Navigate to=\"/login\""),
    title: t.match(/<title>([^<]+)/)?.[1],
    hasLanding: t.includes("Enter the System") || t.includes("MatrixSecHub // Ops Division"),
    hasLoginForm: t.includes("Operator Login") || t.includes("Sign in"),
    isStorefront: t.includes("MSH OPS Storefront"),
  };
}

const publicPaths = ["/", "/enter", "/login", "/marketplace", "/storefront"];
const protectedPaths = ["/systems", "/dashboard", "/ops/fedgrade"];

const results = [];
for (const path of [...publicPaths, ...protectedPaths]) {
  results.push(await probe(path));
}

const checks = {
  publicNoServerLoginRedirect: publicPaths.every((p) => {
    const row = results.find((r) => r.path === p);
    return row && !row.redirectsToLogin && row.status === 200;
  }),
  rootShowsSplash: results.find((r) => r.path === "/")?.title?.includes("Operator Terminal") === true,
  enterShowsLanding: results.find((r) => r.path === "/enter")?.status === 200,
  loginAccessible: results.find((r) => r.path === "/login")?.status === 200,
  marketplacePublic: results.find((r) => r.path === "/marketplace")?.isStorefront === true,
  storefrontPublic: results.find((r) => r.path === "/storefront")?.isStorefront === true,
};

console.log(JSON.stringify({ base, results, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
