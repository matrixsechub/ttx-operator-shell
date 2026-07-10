#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path, redirect = "manual") {
  const r = await fetch(`${base}${path}`, {
    headers: { "Cache-Control": "no-cache" },
    redirect,
  });
  const t = await r.text();
  return {
    path,
    status: r.status,
    location: r.headers.get("location"),
    xPurge: r.headers.get("x-entry-purge"),
    xPurgedFrom: r.headers.get("x-purged-from"),
    xStorefront: r.headers.get("x-storefront-route"),
    xEcosystem: r.headers.get("x-ecosystem-route"),
    xOperator: r.headers.get("x-operator-route"),
    title: t.match(/<title>([^<]+)/)?.[1],
    hasRoot: t.includes('id="root"'),
    operator: t.includes("Operator Terminal"),
    len: t.length,
  };
}

const purged = ["/", "/welcome", "/index.html", "/enter"];
const results = [];
for (const path of purged) results.push(await probe(path));

const systems = await probe("/systems", "manual");
const splash = await probe("/splash.html", "manual");
const marketplace = await probe("/marketplace", "manual");

const checks = {
  rootRedirects: results.every((row) => row.status === 302 && row.location?.includes("/systems")),
  purgeHeader: results.every((row) => row.xPurge === "redirect-systems"),
  noStorefrontAtRoot: !results.find((row) => row.path === "/")?.xStorefront,
  noEcosystemAtRoot: !results.find((row) => row.path === "/")?.xEcosystem,
  systemsIsOperator: systems.xOperator === "ttx-cockpit" && systems.operator,
  splashBlocked: splash.status === 410,
  marketplaceStillWorks: marketplace.xStorefront === "mshops-spa",
};

console.log(JSON.stringify({ base, results, systems, splash, marketplace, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
