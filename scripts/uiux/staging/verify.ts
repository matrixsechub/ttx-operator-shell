import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { assertNoSecretsInArtifact } from "../redact.ts";
import { emitStagingTelemetry } from "./telemetry.ts";

export type SecretScanResult = {
  ok: boolean;
  scanned: number;
  violations: Array<{ file: string; category: string }>;
};

const SCANNED_EXTENSIONS = /\.(json|txt|log|html|md)$/i;

export function scanArtifactDirectory(root: string): SecretScanResult {
  const violations: SecretScanResult["violations"] = [];
  let scanned = 0;

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry === "storage-state" || entry === "trace") continue;
        walk(full);
        continue;
      }
      if (!SCANNED_EXTENSIONS.test(entry)) continue;
      scanned += 1;
      const text = readFileSync(full, "utf8");
      for (const category of assertNoSecretsInArtifact(text)) {
        violations.push({ file: full, category });
      }
    }
  }

  try {
    walk(root);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return { ok: true, scanned: 0, violations: [] };
    }
    throw err;
  }

  const result = { ok: violations.length === 0, scanned, violations };
  emitStagingTelemetry({
    event: "prism_staging_secret_scan_completed",
    violationCount: violations.length,
    result: result.ok ? "ok" : "failed",
    timestamp: new Date().toISOString(),
  });
  return result;
}
