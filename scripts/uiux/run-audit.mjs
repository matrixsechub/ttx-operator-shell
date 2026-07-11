#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToAuditRequest } from "./prismAdapter.ts";
import { submitPrismAudit } from "./prismSubmit.ts";

const captureId = process.argv[2] ?? process.env.PRISM_CAPTURE_ID;
if (!captureId) {
  console.error("Usage: uiux:audit <captureId>");
  process.exit(1);
}

const artifactDir = join(process.cwd(), "artifacts", "uiux", captureId);
const manifest = JSON.parse(readFileSync(join(artifactDir, "manifest.json"), "utf8"));
const request = manifestToAuditRequest(manifest, process.env.PRISM_AUDIT_MODE ?? "ACCESSIBILITY_CHECK");
const origin = process.env.PRISM_SUBMIT_ORIGIN ?? manifest.origin;

const result = await submitPrismAudit({
  origin,
  request,
  artifactDir,
  skipIfDuplicate: true,
});

if (!result.ok) {
  console.error(JSON.stringify(result));
  process.exit(1);
}

console.log(JSON.stringify(result));
