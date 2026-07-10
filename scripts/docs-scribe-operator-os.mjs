#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs/operator-os");
const generatedAt = new Date().toISOString();
const beaconHash = createHash("sha256")
  .update(readFileSync(path.join(root, "msh-ops/beacon/releases/current.json"), "utf8"))
  .digest("hex");
const codexHash = createHash("sha256")
  .update(readFileSync(path.join(root, "codex/manifest.json"), "utf8"))
  .digest("hex");

const header = `<!-- DOCS_SCRIBE_GENERATED
generated_at: ${generatedAt}
beacon_hash: ${beaconHash}
codex_hash: ${codexHash}
-->

`;

const files = {
  "architecture.md": `${header}# Operator OS Architecture

Governed operator storefront on Cloudflare Workers with multi-surface SPAs, KV-backed governance state, and signed Beacon/Codex validation gates.

## Spine

Intent → Action Proposal → Beacon/Codex validation → Operator Approval → Signed Receipt → Pre-execution revalidation → Governed execution → Execution receipt → Audit bundle.
`,
  "governance-flow.md": `${header}# Governance Flow

C2–C6 mutations require a signed approval receipt. Boolean \`operatorApproval: true\` is rejected in staging and production.
`,
  "beacon-v2.md": `${header}# Beacon v2

Signed immutable release at \`msh-ops/beacon/releases/current.json\`. Verified via \`GET /api/beacon/v2\`. Publish with \`node scripts/publish-beacon-v2.mjs\` using \`BEACON_SIGNING_KEY\`.
`,
  "codex-manifest.md": `${header}# Codex Manifest v1

Inventory in \`codex/manifest.json\`. Validate with \`npm run codex:validate\`.
`,
  "approval-and-execution.md": `${header}# Approval and Execution

Receipts bind proposal revision, action digest, beacon hash, codex hash, environment, nonce, and expiry. Consumed once per approval.
`,
  "audit-ledger.md": `${header}# Audit Ledger

KV-backed audit events with optional D1 adapter. C2–C6 pre-execution audit failure blocks mutation; post-execution failure marks \`audit_incomplete\`.
`,
  "mcp-governance-deltas.md": `${header}# MCP Governance Deltas

Advisory upstream fragments compared to local Beacon. No direct Beacon mutation. Quarantine on northstar conflict.
`,
  "organizer-agent.md": `${header}# Organizer Agent

Read-only repository scan. Proposals only — no writes, commits, or Beacon changes.
`,
};

mkdirSync(docsDir, { recursive: true });
for (const [name, body] of Object.entries(files)) {
  const target = path.join(docsDir, name);
  if (!existsSync(target)) {
    writeFileSync(target, body);
  } else {
    const existing = readFileSync(target, "utf8");
    if (!existing.includes("DOCS_SCRIBE_GENERATED")) {
      writeFileSync(target, `${body}\n\n---\n\n${existing}`);
    }
  }
}

console.log(JSON.stringify({ ok: true, generatedAt, docsDir }, null, 2));
