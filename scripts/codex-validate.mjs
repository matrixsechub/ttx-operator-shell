import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "codex", "manifest.json");
const wranglerPath = path.join(root, "wrangler.jsonc");
const receiptSchemaPath = path.join(root, "schemas", "approval-receipt.schema.json");
const reportPath = path.join(root, "artifacts", "codex-validation-report.json");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function stripJsoncComments(input) {
  return input.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function hashManifest(manifest) {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

function actionClassRank(actionClass) {
  const rank = Number(String(actionClass).slice(1));
  return Number.isFinite(rank) ? rank : -1;
}

function main() {
  const manifest = readJson(manifestPath);
  const wranglerRaw = readFileSync(wranglerPath, "utf8");
  const wrangler = JSON.parse(stripJsoncComments(wranglerRaw));

  const critical = [];
  const warnings = [];
  const manifestHash = hashManifest(manifest);

  if (!manifest.system?.name) critical.push("manifest.system.name is required");
  if (!Array.isArray(manifest.agents) || manifest.agents.length === 0) {
    critical.push("manifest.agents must not be empty");
  }

  const componentIds = new Set();
  for (const component of manifest.components ?? []) {
    if (componentIds.has(component.id)) critical.push(`duplicate component id: ${component.id}`);
    componentIds.add(component.id);
    if (!component.owner) critical.push(`component ${component.id} missing owner`);
    for (const sourcePath of component.sourcePaths ?? []) {
      if (!existsSync(path.join(root, sourcePath)) && !existsSync(path.join(root, sourcePath.replace(/\/$/, "")))) {
        warnings.push(`component ${component.id} source path missing: ${sourcePath}`);
      }
    }
    for (const actionClass of component.actionClasses ?? []) {
      const rank = actionClassRank(actionClass);
      if (rank >= 2 && !component.approvalPath) {
        critical.push(`component ${component.id} missing approvalPath for ${actionClass}`);
      }
    }
    if ((component.actionClasses ?? []).some((c) => actionClassRank(c) >= 2)) {
      if (!component.tests?.length) warnings.push(`component ${component.id} missing tests`);
      if (!component.runbook) warnings.push(`component ${component.id} missing runbook`);
    }
  }

  const wranglerDoClasses = new Set((wrangler.durable_objects?.bindings ?? []).map((b) => b.class_name));
  for (const entry of manifest.durable_objects ?? []) {
    const className = entry.class_name ?? entry.class;
    if (!className || !wranglerDoClasses.has(className)) {
      critical.push(`DO class missing from wrangler.jsonc: ${className ?? "unknown"}`);
    }
  }

  const wranglerKv = new Set((wrangler.kv_namespaces ?? []).map((b) => b.binding));
  for (const entry of manifest.kv_namespaces ?? []) {
    if (!wranglerKv.has(entry.binding)) {
      critical.push(`KV binding missing from wrangler.jsonc: ${entry.binding}`);
    }
  }

  const secretNames = new Set((manifest.secret_scopes ?? []).map((s) => s.name));
  for (const required of ["GOVERNANCE_RECEIPT_SIGNING_KEY", "BEACON_SIGNING_KEY"]) {
    if (!secretNames.has(required)) {
      critical.push(`secret_scopes missing required secret: ${required}`);
    }
  }
  const authScope = (manifest.secret_scopes ?? []).find((s) => s.name === "AUTH_SIGNING_KEY");
  if (authScope && !String(authScope.purpose).includes("auth")) {
    warnings.push("AUTH_SIGNING_KEY purpose should be auth-only");
  }

  const beaconRelease =
    path.join(root, "msh-ops/beacon/releases/development/current.json");
  const canonicalBeacon = path.join(root, "msh-ops/beacon/releases/canonical.payload.json");
  if (!existsSync(beaconRelease) && !existsSync(path.join(root, "msh-ops/beacon/releases/current.json"))) {
    warnings.push("signed beacon v2 development release missing");
  }
  if (!existsSync(canonicalBeacon)) {
    warnings.push("canonical beacon payload missing at msh-ops/beacon/releases/canonical.payload.json");
  }

  if (!existsSync(receiptSchemaPath)) {
    critical.push("schemas/approval-receipt.schema.json missing");
  } else {
    const schema = readJson(receiptSchemaPath);
    if (!schema.schemaVersion || schema.schemaVersion !== "1.0.0") {
      critical.push("approval receipt schemaVersion must be 1.0.0");
    }
    if (schema.properties?.approval_id || schema.properties?.approved_action_exact_hash) {
      critical.push("approval receipt schema uses obsolete snake_case fields");
    }
  }

  const mutationRoutes = manifest.mutation_routes ?? [];
  if (!mutationRoutes.length) {
    critical.push("mutation_routes registry is empty");
  }

  let ungovernedC2C6 = 0;
  let enabledUnmigratedC2C6 = 0;
  const disabledHandlerFiles = {
    "POST /api/governance/propose": "worker/backbone.ts",
    "POST /api/governance/approve": "worker/backbone.ts",
    "POST /api/ttx/local-scenarios/create": "worker/localScenarioRoutes.ts",
    "POST /api/register": "worker/funnelRecovery.ts",
  };

  for (const route of mutationRoutes) {
    const rank = actionClassRank(route.action_class);
    const governed = route.governed === true;
    const disabled = route.enforcement === "disabled_staging_prod";
    if (rank >= 2 && rank <= 6 && !governed && !disabled) {
      ungovernedC2C6 += 1;
      critical.push(`ungoverned C2-C6 route: ${route.method} ${route.path}`);
    }
    if (rank >= 2 && rank <= 6 && !governed && disabled) {
      const handlerKey = `${route.method} ${route.path}`;
      const handlerFile = disabledHandlerFiles[handlerKey];
      if (!handlerFile || !existsSync(path.join(root, handlerFile))) {
        enabledUnmigratedC2C6 += 1;
        critical.push(`disabled route missing handler mapping: ${handlerKey}`);
      } else {
        const source = readFileSync(path.join(root, handlerFile), "utf8");
        if (!source.includes("routeDisabledInGovernedEnvironment")) {
          enabledUnmigratedC2C6 += 1;
          critical.push(`enabled unmigrated C2-C6 route (missing staging guard): ${handlerKey}`);
        }
      }
    }
    if (governed) {
      const handlerHints = [
        path.join(root, "worker/activation/activationRoutes.ts"),
        path.join(root, "worker/fulfillmentAgentRoutes.ts"),
        path.join(root, "worker/northstarBeaconRoutes.ts"),
        path.join(root, "worker/aiGatewayRoutes.ts"),
        path.join(root, "worker/governance/governedMutation.ts"),
      ];
      const governedSource = handlerHints
        .filter((file) => existsSync(file))
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");
      if (!governedSource.includes("runGovernedMutation") && !governedSource.includes("runGovernedRoute")) {
        warnings.push(`governed route ${route.path} — handler grep did not find governed wrapper`);
      }
    }
  }

  if (ungovernedC2C6 > 0) {
    critical.push(`ungoverned_c2_c6_routes=${ungovernedC2C6}`);
  }
  if (enabledUnmigratedC2C6 > 0) {
    critical.push(`enabled_unmigrated_c2_c6_routes=${enabledUnmigratedC2C6}`);
  }

  if (!manifest.telemetry_events?.includes("organizer.scan.completed")) {
    warnings.push("telemetry_events missing organizer.scan.completed");
  }
  if (!manifest.telemetry_events?.length) warnings.push("telemetry_events inventory is empty");

  const report = {
    ok: critical.length === 0,
    status: critical.length === 0 ? (warnings.length ? "warnings" : "pass") : "fail",
    manifest_hash: manifestHash,
    manifest_version: manifest.system?.codex_version ?? "unknown",
    drift_count: critical.length + warnings.length,
    ungoverned_c2_c6_routes: ungovernedC2C6,
    enabled_unmigrated_c2_c6_routes: enabledUnmigratedC2C6,
    critical,
    warnings,
    validated_at: new Date().toISOString(),
  };

  try {
    readFileSync(reportPath);
  } catch {
    // artifacts dir may not exist in all contexts
  }

  console.log(JSON.stringify(report, null, 2));
  if (critical.length > 0) process.exit(1);
}

main();
