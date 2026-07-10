#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { proveStagingSubmission } from "./staging/submissionProof.ts";
import { resolveStagingTarget } from "./staging/targetPolicy.ts";

const runId = process.argv[2] ?? process.env.PRISM_STAGING_RUN_ID;
if (!runId) {
  console.error("Usage: uiux:staging:submit <runId>");
  process.exit(1);
}

const artifactRoot = join(process.cwd(), "artifacts", "uiux", "staging", runId);
const manifest = JSON.parse(readFileSync(join(artifactRoot, "public-capture", "manifest.json"), "utf8"));
const target = resolveStagingTarget();
const proof = await proveStagingSubmission(target.origin, manifest, artifactRoot);
console.log(JSON.stringify({ ok: proof.passed, auditId: proof.auditId }));
