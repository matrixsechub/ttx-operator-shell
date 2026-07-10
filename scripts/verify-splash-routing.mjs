#!/usr/bin/env node
const base = process.argv[2] || "http://127.0.0.1:8787";

async function check(path, expect) {
  const r = await fetch(`${base}${path}`);
  const t = await r.text();
  const isSplash =
    t.includes("MSHOPS Operator System") &&
    t.includes("marketplace-launch") &&
    !t.includes('id="root"');
  const isSpa = t.includes('id="root"') && t.includes("Operator Terminal");
  const ok =
    expect === "splash"
      ? isSplash && !isSpa
      : expect === "spa"
        ? isSpa
        : r.status === expect;
  console.log(`${ok ? "PASS" : "FAIL"} ${path} status=${r.status} splash=${isSplash} spa=${isSpa} csp=${Boolean(r.headers.get("content-security-policy"))}`);
  return ok;
}

const results = await Promise.all([
  check("/", "splash"),
  check("/welcome", "splash"),
  check("/login", "spa"),
  check("/ops/fedgrade", "spa"),
  check("/api/fedgrade/health", 401),
  check("/api/marketplace/integrity", 401),
]);

process.exit(results.every(Boolean) ? 0 : 1);
