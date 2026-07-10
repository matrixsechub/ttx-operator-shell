#!/usr/bin/env node
import { runCaptureEngine } from "./captureEngine.ts";

const scope = process.env.PRISM_CAPTURE_SCOPE === "operator" ? "operator" : "public";
const origin = process.env.PRISM_CAPTURE_ORIGIN ?? "http://127.0.0.1:4175";

const manifest = await runCaptureEngine({
  origin,
  scope,
  actorType: process.env.CI ? "ci" : "local",
  dryRun: process.env.PRISM_CAPTURE_DRY_RUN === "true",
  mode: process.env.PRISM_AUDIT_MODE ?? "ACCESSIBILITY_CHECK",
});

console.log(JSON.stringify({ ok: true, captureId: manifest.captureId, status: manifest.status }));

if (manifest.status === "failed" && manifest.evidence.length === 0) {
  process.exit(1);
}
