#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const FAILURE_CODES = {
  TOKEN_MISSING: "MSHOPS_CHECKOUT_TOKEN_MISSING",
  CHECKOUT_MISSING: "MSHOPS_CHECKOUT_MISSING",
  WEB_SOURCE_MISSING: "MSHOPS_WEB_SOURCE_MISSING",
  BUILD_SCRIPT_MISSING: "MSHOPS_BUILD_SCRIPT_MISSING",
  BUILD_OUTPUT_MISSING: "MSHOPS_BUILD_OUTPUT_MISSING",
};

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function resolveMshopsRoot() {
  const fromEnv = process.env.MSHOPS_ROOT?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "MSHOPS");
}

export function validateMshopsCheckoutLayout(mshopsRoot = resolveMshopsRoot()) {
  if (!mshopsRoot || !existsSync(mshopsRoot)) {
    fail(FAILURE_CODES.CHECKOUT_MISSING, `MSHOPS root not found at ${mshopsRoot}`);
  }

  const webDir = join(mshopsRoot, "web");
  if (!existsSync(webDir)) {
    fail(FAILURE_CODES.WEB_SOURCE_MISSING, `MSHOPS web source not found at ${webDir}`);
  }

  const buildScript = join(mshopsRoot, "scripts", "build-pages-final.mjs");
  if (!existsSync(buildScript)) {
    fail(FAILURE_CODES.BUILD_SCRIPT_MISSING, `MSHOPS build script not found at ${buildScript}`);
  }

  let commitSha = "unknown";
  try {
    commitSha = execSync("git rev-parse HEAD", {
      cwd: mshopsRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    commitSha = "unknown";
  }

  const report = {
    ok: true,
    mshopsRoot,
    commitSha,
    validatedAt: new Date().toISOString(),
  };

  const outPath = process.env.MSHOPS_CHECKOUT_REPORT_PATH?.trim();
  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2));
  }

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `mshops_commit_sha=${commitSha}\n`);
  }

  console.log(`MSHOPS_PREFLIGHT::PASS commit=${commitSha}`);
  return report;
}

export function validateMshopsBuildOutput(mshopsRoot = resolveMshopsRoot()) {
  const buildApp = join(mshopsRoot, "build-final", "app", "index.html");
  const altBuildApp = join(mshopsRoot, process.env.MSHOPS_BUILD_APP?.trim() || "build-final", "app", "index.html");
  const target = existsSync(buildApp) ? buildApp : altBuildApp;

  if (!existsSync(target)) {
    fail(
      FAILURE_CODES.BUILD_OUTPUT_MISSING,
      `MSHOPS build output not found (expected ${buildApp})`,
    );
  }

  const html = readFileSync(target, "utf8");
  if (html.includes("operator bundle placeholder until MSHOPS build is assembled")) {
    fail(FAILURE_CODES.BUILD_OUTPUT_MISSING, "MSHOPS build output is placeholder-only");
  }

  return { ok: true, entryFile: target };
}

export function assertMshopsCheckoutTokenPresent() {
  const token = process.env.MSHOPS_CHECKOUT_TOKEN?.trim();
  if (!token) {
    fail(FAILURE_CODES.TOKEN_MISSING, "MSHOPS_CHECKOUT_TOKEN is not configured");
  }
  return true;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
const modulePath = resolve(fileURLToPath(import.meta.url));

if (invokedPath === modulePath) {
  try {
    const mode = process.argv[2] ?? "layout";
    if (mode === "token") {
      assertMshopsCheckoutTokenPresent();
      console.log("MSHOPS_PREFLIGHT::TOKEN_PRESENT");
    } else if (mode === "build-output") {
      validateMshopsBuildOutput();
      console.log("MSHOPS_PREFLIGHT::BUILD_OUTPUT_OK");
    } else {
      validateMshopsCheckoutLayout();
    }
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN";
    console.error(`MSHOPS_PREFLIGHT::FAIL`);
    console.error(`  code: ${code}`);
    console.error(`  message: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
