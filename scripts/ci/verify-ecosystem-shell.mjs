#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ECOSYSTEM_SHELL_MARKERS } from "../lib/storefrontBundle.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const shellPath = join(root, "dist", "ecosystem-shell.html");

const FORBIDDEN_MARKERS = ["MSH OPS Storefront", "Operator Terminal"];

function main() {
  if (!existsSync(shellPath)) {
    console.error("ECOSYSTEM_SHELL::FAIL");
    console.error(`  - missing ${shellPath}`);
    process.exit(1);
  }

  const html = readFileSync(shellPath, "utf8");
  const errors = [];

  for (const marker of ECOSYSTEM_SHELL_MARKERS) {
    if (marker === "ecosystem-shell.html") continue;
    if (!html.includes(marker)) {
      errors.push(`missing required marker: ${marker}`);
    }
  }

  if (!html.includes('id="root"')) {
    errors.push('missing required marker: id="root"');
  }

  for (const marker of FORBIDDEN_MARKERS) {
    if (html.includes(marker)) {
      errors.push(`forbidden marker present: ${marker}`);
    }
  }

  if (html.includes("Ecosystem Overview")) {
    errors.push("static MSHOPS overview page detected — expected Vite ecosystem SPA shell");
  }

  if (errors.length > 0) {
    console.error("ECOSYSTEM_SHELL::FAIL");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log("ECOSYSTEM_SHELL::PASS");
  console.log(`  shell: dist/ecosystem-shell.html`);
}

main();
