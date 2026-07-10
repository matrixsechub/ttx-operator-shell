#!/usr/bin/env node
const bases = [
  "https://ttx-operator-shell.sogellagepul.workers.dev",
  "https://ttx-operator-shell.sogellagepul.workers.dev",
];
const paths = ["/", "/index.html", "/app", "/dist/"];

async function probe(base, path) {
  const r = await fetch(`${base}${path}`, {
    redirect: "manual",
    headers: { "Cache-Control": "no-cache" },
  });
  const t = await r.text();
  const refs = [...t.matchAll(/(?:src|href)="([^"#?]+)"/g)].map((m) => m[1]);
  return {
    base,
    path,
    status: r.status,
    location: r.headers.get("location"),
    contentType: r.headers.get("content-type"),
    title: t.match(/<title>([^<]+)/)?.[1],
    hasRoot: t.includes('id="root"'),
    moduleScript: refs.find((ref) => ref.includes(".js")),
    cssRef: refs.find((ref) => ref.includes(".css")),
    operatorTerminal: t.includes("Operator Terminal"),
    publicSurface: t.includes("Public Operator Surface"),
    len: t.length,
    refs: refs.slice(0, 8),
  };
}

const results = [];
for (const base of bases) {
  for (const path of paths) {
    results.push(await probe(base, path));
  }
}

// Probe asset paths referenced from ttx root
const rootHtml = await fetch("https://ttx-operator-shell.sogellagepul.workers.dev/").then((r) => r.text());
const refs = [...rootHtml.matchAll(/(?:src|href)="([^"#?]+)"/g)].map((m) => m[1]);
for (const ref of refs.filter((r) => r.startsWith("/")).slice(0, 6)) {
  const url = ref.startsWith("http") ? ref : `https://ttx-operator-shell.sogellagepul.workers.dev${ref}`;
  const r = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  results.push({
    base: "ttx-asset",
    path: ref,
    status: r.status,
    contentType: r.headers.get("content-type"),
    len: Number(r.headers.get("content-length")) || 0,
  });
}

console.log(JSON.stringify(results, null, 2));
