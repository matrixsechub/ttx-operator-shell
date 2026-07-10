#!/usr/bin/env node
import { CANONICAL_ENTRY, DECOMMISSIONED } from "./lib/canonical-entry.mjs";

async function probe(url, opts = {}) {
  const r = await fetch(url, { redirect: "manual", ...opts });
  const location = r.headers.get("location");
  const t = r.status === 301 || r.status === 302 ? "" : await r.text();
  return {
    url,
    status: r.status,
    location,
    xEntry: r.headers.get("x-entry-route"),
    xProxy: r.headers.get("x-operator-shell-proxy"),
    is1042: t.includes("1042"),
    hasHtml: t.includes("<!DOCTYPE html>"),
    title: t.match(/<title>([^<]+)/)?.[1],
  };
}

const canonicalRoot = await probe(`${CANONICAL_ENTRY}/`, { headers: { "Cache-Control": "no-cache" } });
const mshopsPages = await probe(`${DECOMMISSIONED}/`);
const mshopsWorker = await probe("https://mshops-public.sogellagepul.workers.dev/");

const checks = {
  canonicalLoads: canonicalRoot.status === 200 && !canonicalRoot.is1042 && Boolean(canonicalRoot.title),
  noProxyHeaders: !canonicalRoot.xEntry && !canonicalRoot.xProxy,
  mshopsPagesRedirects:
    (mshopsPages.status === 301 || mshopsPages.status === 302) &&
    mshopsPages.location?.startsWith(CANONICAL_ENTRY),
  mshopsWorkerRedirects:
    (mshopsWorker.status === 301 || mshopsWorker.status === 302) &&
    mshopsWorker.location?.startsWith(CANONICAL_ENTRY),
  no1042Anywhere: [canonicalRoot, mshopsPages, mshopsWorker].every((r) => !r.is1042),
};

console.log(JSON.stringify({ CANONICAL_ENTRY, results: { canonicalRoot, mshopsPages, mshopsWorker }, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
