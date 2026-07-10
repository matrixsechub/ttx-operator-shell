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
    xEntry: r.headers.get("x-entry-route"),
    xAuthority: r.headers.get("x-ui-authority"),
    xStorefront: r.headers.get("x-storefront-route"),
    title: t.match(/<title>([^<]+)/)?.[1],
    storefront: t.includes("MSH OPS Storefront"),
    len: t.length,
  };
}

const root = await probe("/", "follow");
const rootHead = await probe("/", "manual");
const marketplace = await probe("/marketplace");
const storefront = await probe("/storefront");
const ghost = await probe("/ghost-layer");

const checks = {
  rootProxied: rootHead.status === 200 && rootHead.xEntry === "operator-shell-proxy",
  rootAuthority: rootHead.xAuthority === "ttx-operator-shell",
  rootNotRedirect: rootHead.status !== 302,
  marketplaceOk: marketplace.xStorefront === "mshops-spa" && marketplace.storefront,
  storefrontOk: storefront.xStorefront === "mshops-spa",
  ghostNotStorefront: ghost.status === 404 || !ghost.storefront,
};

console.log(JSON.stringify({ base, root, rootHead, marketplace, storefront, ghost, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
