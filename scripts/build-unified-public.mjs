import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storefrontDir = path.join(root, "MSHOPS-Storefront", "public");
const splashDir = path.join(root, "splash-site", "public");
const outputDir = path.join(root, "public");

const splashOverlayFiles = [
  "index.html",
  "_redirects",
  path.join("styles", "splash.css"),
  path.join("scripts", "splash.js"),
];

function overlayDirectory(source, destination, filter) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      overlayDirectory(sourcePath, destinationPath, filter);
      continue;
    }

    if (filter && !filter(sourcePath, entry.name)) {
      continue;
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function mergeRedirects(...sources) {
  const lines = [];

  for (const source of sources) {
    if (!fs.existsSync(source)) {
      continue;
    }

    const content = fs.readFileSync(source, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      lines.push(trimmed);
    }
  }

  return `${Array.from(new Set(lines)).join("\n")}\n`;
}

if (!fs.existsSync(storefrontDir)) {
  console.error(`Missing storefront source: ${storefrontDir}`);
  process.exit(1);
}

if (!fs.existsSync(splashDir)) {
  console.error(`Missing splash source: ${splashDir}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
overlayDirectory(storefrontDir, outputDir);

for (const relativePath of splashOverlayFiles) {
  const splashPath = path.join(splashDir, relativePath);
  if (!fs.existsSync(splashPath)) {
    continue;
  }

  const outputPath = path.join(outputDir, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.copyFileSync(splashPath, outputPath);
}

const redirects = mergeRedirects(
  path.join(storefrontDir, "_redirects"),
  path.join(splashDir, "_redirects"),
);
fs.writeFileSync(path.join(outputDir, "_redirects"), redirects, "utf8");

console.log(`Unified public surface built at ${outputDir}`);
