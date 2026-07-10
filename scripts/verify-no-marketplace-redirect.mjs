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
    redirectsToMarketplace: location?.includes("/marketplace") ?? false,
    title: t.match(/<title>([^<]+)/)?.[1],
    hasMarketplaceCatchAll: t.includes('Navigate to="/marketplace"') || t.includes('to="/marketplace"'),
    isOperatorTerminal: t.includes("Operator Terminal"),
    isStorefrontOnly: t.includes("MSH OPS Storefront") && !t.includes("Operator Terminal"),
  };
}

const root = await probe("/");
const marketplace = await probe("/marketplace");

const checks = {
  rootNoServerRedirect: root.status === 200 && !root.redirectsToMarketplace,
  rootIsOperator: root.isOperatorTerminal === true,
  rootNotStorefrontCatchAll: !root.isStorefrontOnly,
  marketplaceIsStorefront: marketplace.title === "MSH OPS Storefront",
  marketplaceStillWorks: marketplace.status === 200,
};

console.log(JSON.stringify({ base, root, marketplace, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
