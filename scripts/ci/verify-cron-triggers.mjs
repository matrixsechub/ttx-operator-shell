#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { validateCronTriggerPolicy } from "../lib/wranglerCronPolicy.mjs";

function main() {
  const result = validateCronTriggerPolicy();

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(`CRON_TRIGGERS::WARN ${warning}`);
    }
  }

  if (result.ok) {
    console.log("CRON_TRIGGERS::PASS");
    console.log(`  worker_exports_scheduled: ${result.exportsScheduled}`);
    console.log(`  configured_crons: ${result.configuredCrons.length}`);
    for (const config of result.configs) {
      console.log(`  ${config.label}: [${config.crons.join(", ")}]`);
    }
    process.exit(0);
  }

  console.error("CRON_TRIGGERS::FAIL");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export { main };
