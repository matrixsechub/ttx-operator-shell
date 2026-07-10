#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function analyze(label, html) {
  const pages = [...html.matchAll(/data-page="([^"]+)"/g)].map((m) => m[1]);
  return {
    label,
    bytes: html.length,
    lines: html.split("\n").length,
    dataPages: [...new Set(pages)],
    sectionPadCount: (html.match(/section-pad/g) || []).length,
    hasLaunchScreen: html.includes("launch-screen-x1a0"),
    hasDivisionsPreview: html.includes("divisions-preview-s5e4"),
    hasAgentsPreview: html.includes("agents-preview-s6f5"),
    hasAgentsGrid: html.includes("agents-grid-g4"),
    hasMultiPageNav: html.includes('data-route="agents"'),
    isSpaRoot: html.includes('id="root"'),
    isStorefront: html.includes("MSH OPS Storefront"),
    isOperatorTerminal: html.includes("Operator Terminal"),
  };
}

const splash = readFileSync(join(root, "public/splash.html"), "utf8");
const local = analyze("public/splash.html", splash);

const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";
const liveRes = await fetch(`${base}/`, { headers: { "Cache-Control": "no-cache" } });
const liveHtml = await liveRes.text();
const live = {
  ...analyze("live /", liveHtml),
  status: liveRes.status,
  xSplash: liveRes.headers.get("x-splash-route"),
};

console.log(JSON.stringify({ local, live }, null, 2));
