#!/usr/bin/env node
const bases = [
  process.argv[2] || "https://mshops-public.sogellagepul.workers.dev",
  "https://ttx-operator-shell.sogellagepul.workers.dev",
];

async function probe(base, path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const t = await r.text();
  return {
    base,
    path,
    status: r.status,
    xEntry: r.headers.get("x-entry-route"),
    is1042: t.includes("1042"),
    hasHtml: t.includes("<!DOCTYPE html>"),
    title: t.match(/<title>([^<]+)/)?.[1],
  };
}

const paths = ["/", "/styles/rgbgold-tokens.css", "/enter"];
const results = [];
for (const base of bases) {
  for (const path of paths) {
    results.push(await probe(base, path));
  }
}

const checks = {
  workersDevRoot200: results.some((r) => r.base.includes("workers.dev") && r.path === "/" && r.status === 200 && !r.is1042),
  workersDevNo1042: results.filter((r) => r.base.includes("workers.dev")).every((r) => !r.is1042),
  pagesRoot200: results.some((r) => r.base.includes("pages.dev") && r.path === "/" && r.status === 200 && !r.is1042),
  asset200: results.some((r) => r.path.includes("rgbgold") && r.status === 200),
};

console.log(JSON.stringify({ results, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
