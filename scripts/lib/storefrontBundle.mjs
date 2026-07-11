import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const PLACEHOLDER_DESCRIPTION =
  "MSHOPS marketplace storefront shell — operator bundle placeholder until MSHOPS build is assembled.";

export const FAILURE_CODES = {
  SOURCE_MISSING: "STOREFRONT_SOURCE_MISSING",
  BUILD_FAILED: "STOREFRONT_BUILD_FAILED",
  ENTRY_MISSING: "STOREFRONT_ENTRY_MISSING",
  ASSETS_MISSING: "STOREFRONT_ASSETS_MISSING",
  ASSET_REFERENCE_BROKEN: "STOREFRONT_ASSET_REFERENCE_BROKEN",
  PLACEHOLDER_DETECTED: "STOREFRONT_PLACEHOLDER_DETECTED",
  ECOSYSTEM_SHELL_LEAK: "STOREFRONT_ECOSYSTEM_SHELL_LEAK",
  BASE_PATH_INVALID: "STOREFRONT_BASE_PATH_INVALID",
};

export const ECOSYSTEM_SHELL_MARKERS = ["Ecosystem Entry", "ecosystem-shell.html"];

export function resolveMshopsRoot(root) {
  return process.env.MSHOPS_ROOT?.trim() || join(root, "..", "MSHOPS");
}

export function resolveStorefrontSourceApp(root) {
  const mshopsRoot = resolveMshopsRoot(root);
  const relative = process.env.MSHOPS_BUILD_APP?.trim() || join("build-final", "app");
  return join(mshopsRoot, relative);
}

export function isPlaceholderHtml(html) {
  if (!html || typeof html !== "string") return true;
  if (html.includes(PLACEHOLDER_DESCRIPTION)) return true;
  const hasGeneratedScript = /\/app\/assets\/[^"']+\.js/.test(html);
  const hasGeneratedStylesheet = /<link[^>]+href="\/app\/assets\/[^"']+\.css"/i.test(html);
  return !hasGeneratedScript && !hasGeneratedStylesheet;
}

export function hasEcosystemShellLeak(html) {
  if (!html || typeof html !== "string") return false;
  return ECOSYSTEM_SHELL_MARKERS.some((marker) => html.includes(marker));
}

export function extractAssetReferences(html) {
  const scripts = [...html.matchAll(/(?:src|href)="(\/app\/assets\/[^"']+)"/g)].map((match) => match[1]);
  return [...new Set(scripts)];
}

export function countFilesRecursive(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) count += countFilesRecursive(path);
    else count += 1;
  }
  return count;
}

export function validateStorefrontBundle(distAppDir, options = {}) {
  const entryFile = join(distAppDir, "index.html");
  const assetsDir = join(distAppDir, "assets");
  const errors = [];
  const failureCodes = [];

  if (!existsSync(entryFile)) {
    errors.push("dist/app/index.html is missing");
    failureCodes.push(FAILURE_CODES.ENTRY_MISSING);
    return buildValidationResult({ distAppDir, entryFile, errors, failureCodes });
  }

  const html = readFileSync(entryFile, "utf8");

  if (!html.includes('id="root"')) {
    errors.push('dist/app/index.html is missing id="root"');
    failureCodes.push(FAILURE_CODES.ENTRY_MISSING);
  }

  if (!html.includes("MSH OPS Storefront")) {
    errors.push("dist/app/index.html is missing storefront semantic marker");
    failureCodes.push(FAILURE_CODES.ENTRY_MISSING);
  }

  if (isPlaceholderHtml(html)) {
    errors.push("dist/app/index.html matches placeholder-only storefront signature");
    failureCodes.push(FAILURE_CODES.PLACEHOLDER_DETECTED);
  }

  if (hasEcosystemShellLeak(html)) {
    errors.push("dist/app/index.html contains ecosystem shell markers — storefront assembly leak");
    failureCodes.push(FAILURE_CODES.ECOSYSTEM_SHELL_LEAK);
  }

  const assetRefs = extractAssetReferences(html);
  if (assetRefs.length === 0) {
    errors.push("dist/app/index.html has no /app/assets references");
    failureCodes.push(FAILURE_CODES.BASE_PATH_INVALID);
  }

  for (const ref of assetRefs) {
    if (!ref.startsWith("/app/assets/")) {
      errors.push(`invalid asset reference ${ref}`);
      failureCodes.push(FAILURE_CODES.BASE_PATH_INVALID);
      continue;
    }
    const relative = ref.replace(/^\/app\//, "");
    const assetPath = join(distAppDir, relative);
    if (!existsSync(assetPath)) {
      errors.push(`referenced asset missing on disk: ${ref}`);
      failureCodes.push(FAILURE_CODES.ASSET_REFERENCE_BROKEN);
    }
  }

  if (!existsSync(assetsDir)) {
    errors.push("dist/app/assets directory is missing");
    failureCodes.push(FAILURE_CODES.ASSETS_MISSING);
  } else if (countFilesRecursive(assetsDir) === 0) {
    errors.push("dist/app/assets directory is empty");
    failureCodes.push(FAILURE_CODES.ASSETS_MISSING);
  }

  if (/localhost|127\.0\.0\.1|file:\/\//i.test(html)) {
    errors.push("dist/app/index.html contains development-only URLs");
    failureCodes.push(FAILURE_CODES.BASE_PATH_INVALID);
  }

  const jsAssets = assetRefs.filter((ref) => ref.endsWith(".js"));
  const cssAssets = assetRefs.filter((ref) => ref.endsWith(".css"));

  return buildValidationResult({
    distAppDir,
    entryFile,
    html,
    assetRefs,
    jsAssets,
    cssAssets,
    errors,
    failureCodes,
    sourceDirectory: options.sourceDirectory ?? null,
  });
}

function buildValidationResult({
  distAppDir,
  entryFile,
  html = "",
  assetRefs = [],
  jsAssets = [],
  cssAssets = [],
  errors,
  failureCodes,
  sourceDirectory,
}) {
  const assetCount = countFilesRecursive(join(distAppDir, "assets"));
  const report = {
    schema_version: "1.0",
    status: errors.length === 0 ? "pass" : "fail",
    sourceDirectory,
    destinationDirectory: "dist/app",
    entryFile: "dist/app/index.html",
    assetCount,
    jsAssets,
    cssAssets,
    referencedAssets: assetRefs,
    placeholderDetected: isPlaceholderHtml(html),
    missingAssets: errors.filter((error) => error.includes("referenced asset missing")),
    failureCodes: [...new Set(failureCodes)],
    basePath: "/app/",
    tested_at: new Date().toISOString(),
    ok: errors.length === 0,
    errors,
  };
  return report;
}

export function injectStorefrontSurfaceMarker(html) {
  if (html.includes('name="mshops-surface"')) return html;
  return html.replace(
    "<head>",
    '<head>\n    <meta name="mshops-surface" content="marketplace" />',
  );
}
