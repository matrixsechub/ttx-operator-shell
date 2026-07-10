#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStorefrontBundle } from "../lib/storefrontBundle.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const distApp = join(root, "dist", "app");
const artifactPath =
  process.env.ARTIFACT_PATH ?? join(root, "artifacts", "storefront-assembly-report.json");

function main() {
  const allowPlaceholder = process.env.ALLOW_STOREFRONT_PLACEHOLDER === "1";
  if (!existsSync(join(distApp, "index.html"))) {
    console.error("STOREFRONT_ASSEMBLY::FAIL");
    console.error("  - dist/app/index.html is missing");
    process.exit(1);
  }

  const report = validateStorefrontBundle(distApp);
  if (!report.ok) {
    console.error("STOREFRONT_ASSEMBLY::FAIL");
    for (const error of report.errors) {
      console.error(`  - ${error}`);
    }
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  if (allowPlaceholder && report.placeholderDetected) {
    console.warn("STOREFRONT_ASSEMBLY::WARN placeholder allowed by ALLOW_STOREFRONT_PLACEHOLDER=1");
    process.exit(0);
  }

  console.log("STOREFRONT_ASSEMBLY::PASS");
  console.log(JSON.stringify(report, null, 2));
}

main();
