#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCfAccessServiceTokenHeaders } from "./lib/cfAccess.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.env.STAGING_BASE_URL ?? "").replace(/\/$/, "");
const evidencePath = process.argv[2] ?? process.env.OPERATOR_OS_EVIDENCE_PATH ?? "";
const runId = process.env.OPERATOR_OS_SMOKE_RUN_ID?.trim() ?? "unknown-run";

async function fetchJson(path, init = {}, token) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...readCfAccessServiceTokenHeaders(),
    ...(init.headers ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json };
}

async function main() {
  if (!baseUrl) {
    console.error("STAGING_BASE_URL required");
    process.exit(1);
  }

  const token =
    process.env.OPERATOR_AUTH_TOKEN?.trim() ??
    process.env.OPERATOR_BEARER_TOKEN?.trim();
  if (!token) {
    console.error("OPERATOR_AUTH_TOKEN required");
    process.exit(1);
  }

  let evidence = {};
  if (evidencePath && evidencePath !== "--dry-run") {
    try {
      evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
    } catch {
      console.error(`Unable to read evidence file: ${evidencePath}`);
      process.exit(1);
    }
  }

  const result = {
    run_id: evidence.run_id ?? runId,
    base_url: baseUrl,
    started_at: new Date().toISOString(),
    proposal_id: evidence.proposal_id ?? null,
    approval_id: evidence.approval_id ?? null,
    execution_id: evidence.execution_id ?? null,
    actions: [],
    overall_status: "PASS",
  };

  if (evidence.proposal_id) {
    const deny = await fetchJson(
      `/api/governance/proposals/${evidence.proposal_id}/deny`,
      {
        method: "POST",
        body: JSON.stringify({ reason: `operator-os cleanup ${result.run_id}` }),
      },
      token,
    );
    result.actions.push({
      action: "deny_proposal",
      proposal_id: evidence.proposal_id,
      status: deny.response.status,
      ok: deny.response.status === 200 || deny.response.status === 409,
    });
  }

  const organizer = await fetchJson("/api/operator/agents/organizer/report?scan=1", { method: "GET" }, token);
  result.actions.push({
    action: "organizer_scan_read_only",
    status: organizer.response.status,
    ok: organizer.response.status === 200,
  });

  result.completed_at = new Date().toISOString();
  result.overall_status = result.actions.every((a) => a.ok) ? "PASS" : "PARTIAL";
  result.note =
    "Cleanup only targets smoke-created governance proposals. Activation KV records with staging-proof prefixes may require manual KV purge if created outside governed deny path.";

  const out = join(root, "artifacts", `operator-os-staging-cleanup-${result.run_id}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`OPERATOR_OS_STAGING_CLEANUP::${result.overall_status}`);
  console.log(JSON.stringify({ cleanup_path: out }, null, 2));
  process.exit(result.overall_status === "PASS" ? 0 : 1);
}

if (process.argv.includes("--dry-run")) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "dry-run",
        script: "scripts/operator-os-staging-cleanup.mjs",
        required_env: ["STAGING_BASE_URL", "OPERATOR_AUTH_TOKEN", "CF_ACCESS_CLIENT_ID", "CF_ACCESS_CLIENT_SECRET"],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
