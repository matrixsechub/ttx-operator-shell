#!/usr/bin/env node
const base = "https://ttx-operator-shell.sogellagepul.workers.dev";
const paths = [
  "/",
  "/index.html",
  "/operator-shell.html",
  "/systems",
  "/login",
  "/assets/index-Bxi0HaNq.js",
  "/styles/rgbgold-tokens.css",
  "/scripts/rgbgold-motion.js",
];

async function probe(path) {
  const r = await fetch(`${base}${path}`, { redirect: "manual", headers: { "Cache-Control": "no-cache" } });
  const ct = r.headers.get("content-type") || "";
  let title;
  let snippet;
  if (ct.includes("html")) {
    const t = await r.text();
    title = t.match(/<title>([^<]+)/)?.[1];
    snippet = t.slice(0, 200);
  } else {
    snippet = `body-bytes:${(await r.arrayBuffer()).byteLength}`;
  }
  return { path, status: r.status, ct, title, snippet };
}

const results = [];
for (const path of paths) results.push(await probe(path));

// mshops.pages.dev asset resolution for proxied page
const mshopsPaths = ["/styles/rgbgold-tokens.css", "/scripts/rgbgold-motion.js", "/assets/index-Bxi0HaNq.js"];
const mshops = [];
for (const path of mshopsPaths) {
  const r = await fetch(`https://ttx-operator-shell.sogellagepul.workers.dev${path}`, { headers: { "Cache-Control": "no-cache" } });
  mshops.push({ path, status: r.status, ct: r.headers.get("content-type") });
}

console.log(JSON.stringify({ ttx: results, mshopsAssets: mshops }, null, 2));
