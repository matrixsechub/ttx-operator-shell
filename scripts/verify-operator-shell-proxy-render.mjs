#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, { headers: { "Cache-Control": "no-cache" } });
  const ct = r.headers.get("content-type") || "";
  let extra = {};
  if (ct.includes("html")) {
    const t = await r.text();
    extra = {
      title: t.match(/<title>([^<]+)/)?.[1],
      hasStylesheet: t.includes("/styles/rgbgold-tokens.css"),
      hasScript: t.includes("/scripts/rgbgold-motion.js"),
      len: t.length,
    };
  } else {
    extra = { bytes: (await r.arrayBuffer()).byteLength };
  }
  return {
    path,
    status: r.status,
    ct,
    xProxy: r.headers.get("x-operator-shell-proxy"),
    ...extra,
  };
}

const root = await probe("/");
const css = await probe("/styles/rgbgold-tokens.css");
const js = await probe("/scripts/rgbgold-motion.js");
const motionCss = await probe("/styles/rgbgold-motion.css");

const checks = {
  rootHtml: root.status === 200 && root.hasStylesheet && root.hasScript,
  cssProxied: css.status === 200 && css.ct.includes("css") && css.bytes > 1000,
  jsProxied: js.status === 200 && js.ct.includes("javascript") && js.bytes > 100,
  motionCssProxied: motionCss.status === 200 && motionCss.ct.includes("css"),
};

console.log(JSON.stringify({ base, root, css, js, motionCss, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
