#!/usr/bin/env node
/**
 * Provision Cloudflare AI Gateway for MSHOPS.NET.
 *
 * Prerequisites:
 *   - CF_API_TOKEN or CLOUDFLARE_API_TOKEN with Account.AI + AI Gateway Edit
 *   - Account ID in AI_GATEWAY_ACCOUNT_ID (default: f02eebce2a5c46b33b0d204f3cd4950a)
 *
 * Usage:
 *   node scripts/provision-ai-gateway.mjs [--dry-run]
 *
 * After provisioning:
 *   wrangler secret put CF_AI_API_TOKEN
 *   wrangler secret put CF_AI_API_TOKEN --env staging
 *   wrangler secret put N8N_WEBHOOK_SECRET
 */
const ACCOUNT_ID = process.env.AI_GATEWAY_ACCOUNT_ID ?? "f02eebce2a5c46b33b0d204f3cd4950a";
const GATEWAY_ID = process.env.AI_GATEWAY_ID ?? "mshops-net-governance";
const DRY_RUN = process.argv.includes("--dry-run");

const token = process.env.CF_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;

const gatewayConfig = {
  id: GATEWAY_ID,
  cache_ttl: 3600,
  collect_logs: true,
  log_management: [{ enabled: true, name: "default" }],
  rate_limiting_limit: 100,
  rate_limiting_interval: 60,
  rate_limiting_technique: "fixed",
};

async function cfRequest(method, path, body) {
  if (!token) {
    console.error("Missing CF_API_TOKEN or CLOUDFLARE_API_TOKEN");
    process.exit(1);
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${path}`;
  const init = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) init.body = JSON.stringify(body);
  const response = await fetch(url, init);
  const json = await response.json();
  return { status: response.status, json };
}

async function main() {
  console.log(`Account: ${ACCOUNT_ID}`);
  console.log(`Gateway: ${GATEWAY_ID}`);
  if (DRY_RUN) {
    console.log("[dry-run] Would create/update gateway with:", JSON.stringify(gatewayConfig, null, 2));
    console.log("\nSecrets to set manually:");
    console.log("  wrangler secret put CF_AI_API_TOKEN");
    console.log("  wrangler secret put N8N_WEBHOOK_SECRET");
    return;
  }

  const list = await cfRequest("GET", "/ai-gateway/gateways");
  const existing = list.json?.result?.find?.((g) => g.id === GATEWAY_ID);

  if (existing) {
    console.log(`Gateway "${GATEWAY_ID}" already exists — updating settings`);
    const update = await cfRequest("PATCH", `/ai-gateway/gateways/${GATEWAY_ID}`, gatewayConfig);
    if (!update.json?.success) {
      console.error("Update failed:", update.json?.errors ?? update.status);
      process.exit(1);
    }
    console.log("Gateway updated.");
  } else {
    console.log(`Creating gateway "${GATEWAY_ID}"…`);
    const create = await cfRequest("POST", "/ai-gateway/gateways", gatewayConfig);
    if (!create.json?.success) {
      console.error("Create failed:", create.json?.errors ?? create.status);
      process.exit(1);
    }
    console.log("Gateway created.");
  }

  console.log("\nNext steps:");
  console.log("  wrangler secret put CF_AI_API_TOKEN");
  console.log("  wrangler secret put CF_AI_API_TOKEN --env staging");
  console.log("  wrangler secret put N8N_WEBHOOK_SECRET");
  console.log("  npm run build && wrangler deploy --env staging");
  console.log("  node scripts/verify-ai-gateway.mjs https://ttx-operator-shell-staging.sogellagepul.workers.dev");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
