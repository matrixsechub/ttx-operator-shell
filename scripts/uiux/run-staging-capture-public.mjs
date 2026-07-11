#!/usr/bin/env node
import { join } from "node:path";
import { runStagingCapture } from "./staging/captureStaging.ts";

const runId = process.env.PRISM_STAGING_RUN_ID ?? crypto.randomUUID();
const artifactDir = join(process.cwd(), "artifacts", "uiux", "staging", runId, "public-capture");
const result = await runStagingCapture({
  scope: "public",
  captureId: crypto.randomUUID(),
  artifactDir,
});
console.log(JSON.stringify({ ok: result.manifest.status !== "failed", captureId: result.manifest.captureId, runId }));
if (result.manifest.status === "failed") process.exit(1);
