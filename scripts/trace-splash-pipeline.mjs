#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function row(path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const t = await r.text();
  return {
    path,
    status: r.status,
    xSplash: r.headers.get("x-splash-route"),
    xPages: r.headers.get("x-pages-bind"),
    cfCache: r.headers.get("cf-cache-status"),
    title: t.match(/<title>([^<]+)/)?.[1],
    splash: t.includes("MSHOPS Operator System") && t.includes("marketplace-launch"),
    spa: t.includes("Operator Terminal"),
    mshopsLanding: t.includes("MSHOPS Operator System"),
    hasRoot: t.includes('id="root"'),
    len: t.length,
  };
}

const paths = ["/", "/index.html", "/welcome", "/splash.html", "/login"];
const results = [];
for (const path of paths) {
  results.push(await row(path));
}

console.log(JSON.stringify({ base, results }, null, 2));
