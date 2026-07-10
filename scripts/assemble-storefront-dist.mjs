#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAILURE_CODES,
  injectStorefrontSurfaceMarker,
  resolveStorefrontSourceApp,
  validateStorefrontBundle,
} from "./lib/storefrontBundle.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const distApp = join(dist, "app");
const sourceApp = resolveStorefrontSourceApp(root);
const artifactPath =
  process.env.ARTIFACT_PATH ?? join(root, "artifacts", "storefront-assembly-report.json");

function clearDistApp() {
  if (!existsSync(distApp)) {
    mkdirSync(distApp, { recursive: true });
    return;
  }
  for (const entry of readdirSync(distApp)) {
    rmSync(join(distApp, entry), { recursive: true, force: true });
  }
}

function main() {
  if (!existsSync(join(sourceApp, "index.html"))) {
    const report = {
      schema_version: "1.0",
      status: "fail",
      sourceDirectory: sourceApp,
      destinationDirectory: "dist/app",
      entryFile: "dist/app/index.html",
      assetCount: 0,
      placeholderDetected: true,
      missingAssets: [],
      failureCodes: [FAILURE_CODES.SOURCE_MISSING],
      tested_at: new Date().toISOString(),
      ok: false,
      errors: [`Storefront source missing at ${sourceApp}`],
    };
    writeReport(report);
    fail(report);
  }

  if (!existsSync(join(sourceApp, "assets"))) {
    const report = {
      schema_version: "1.0",
      status: "fail",
      sourceDirectory: sourceApp,
      destinationDirectory: "dist/app",
      entryFile: "dist/app/index.html",
      assetCount: 0,
      placeholderDetected: true,
      missingAssets: [],
      failureCodes: [FAILURE_CODES.ASSETS_MISSING],
      tested_at: new Date().toISOString(),
      ok: false,
      errors: [`Storefront assets missing at ${join(sourceApp, "assets")}`],
    };
    writeReport(report);
    fail(report);
  }

  mkdirSync(dist, { recursive: true });
  clearDistApp();
  cpSync(sourceApp, distApp, { recursive: true });

  const entryPath = join(distApp, "index.html");
  const html = injectStorefrontSurfaceMarker(readFileSync(entryPath, "utf8"));
  writeFileSync(entryPath, html);

  const report = validateStorefrontBundle(distApp, { sourceDirectory: sourceApp });
  writeReport(report);

  if (!report.ok) {
    fail(report);
  }

  console.log("STOREFRONT_ASSEMBLY::PASS");
  console.log(JSON.stringify(report, null, 2));
}

function writeReport(report) {
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
}

function fail(report) {
  console.error("STOREFRONT_ASSEMBLY::FAIL");
  for (const error of report.errors ?? []) {
    console.error(`  - ${error}`);
  }
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

main();
