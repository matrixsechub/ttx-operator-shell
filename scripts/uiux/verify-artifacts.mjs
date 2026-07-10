#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { assertNoSecretsInArtifact } from "./redact.ts";

const root = join(process.cwd(), "artifacts", "uiux");
let scanned = 0;
const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(json|txt|log)$/i.test(entry)) continue;
    scanned += 1;
    const text = readFileSync(full, "utf8");
    for (const issue of assertNoSecretsInArtifact(text)) {
      violations.push(`${full}: ${issue}`);
    }
  }
}

try {
  walk(root);
} catch (err) {
  if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
    console.log(JSON.stringify({ ok: true, scanned: 0, violations: [] }));
    process.exit(0);
  }
  throw err;
}

if (violations.length > 0) {
  console.error(JSON.stringify({ ok: false, scanned, violations }));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, scanned, violations: [] }));
