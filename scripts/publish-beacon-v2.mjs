import { createHmac, createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BEACON_RELEASE_DOMAIN = "MSHOPS::BEACON_RELEASE::V2";
const ALLOWED_ENVS = new Set(["development", "staging", "production"]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draftPath = path.join(root, "msh-ops/beacon/northstar-v2.json");
const releaseDir = path.join(root, "msh-ops/beacon/releases");
const canonicalPath = path.join(releaseDir, "canonical.payload.json");

function parseArgs(argv) {
  let env = process.env.BEACON_RELEASE_ENV?.trim() ?? "development";
  let version = "2.0.0";
  let force = false;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--force") force = true;
    else if (arg === "--env" && argv[i + 1]) env = argv[++i];
    else if (/^--env=/.test(arg)) env = arg.slice("--env=".length);
    else if (!arg.startsWith("-")) version = arg;
  }
  return { env, version, force };
}

const { env, version, force } = parseArgs(process.argv);
if (!ALLOWED_ENVS.has(env)) {
  console.error(`Invalid --env ${env}. Allowed: development, staging, production`);
  process.exit(1);
}

const signingKey = process.env.BEACON_SIGNING_KEY ?? (env === "development" ? process.env.AUTH_SIGNING_KEY : undefined);
if (!signingKey) {
  console.error(
    `BEACON_SIGNING_KEY required for ${env} publish` +
      (env === "development" ? " (AUTH_SIGNING_KEY accepted only for development)" : ""),
  );
  process.exit(1);
}

const keyId = process.env.BEACON_SIGNING_KEY_ID ?? "beacon-signing-key-v1";
const beacon = JSON.parse(readFileSync(draftPath, "utf8"));
mkdirSync(releaseDir, { recursive: true });
writeFileSync(canonicalPath, `${JSON.stringify(beacon, null, 2)}\n`);

const beaconHash = createHash("sha256").update(JSON.stringify(beacon)).digest("hex");
const publishedAt = new Date().toISOString();
const envelope = { domain: BEACON_RELEASE_DOMAIN, version, beaconHash, publishedAt, keyId };
const signatureValue = createHmac("sha256", signingKey).update(JSON.stringify(envelope)).digest("hex");

const release = {
  version,
  beacon,
  beaconHash,
  publishedAt,
  signature: {
    algorithm: "HMAC-SHA-256",
    keyId,
    value: signatureValue,
  },
};

const envDir = path.join(releaseDir, env);
const outputPath = path.join(envDir, "current.json");
mkdirSync(envDir, { recursive: true });

if (existsSync(outputPath) && !force) {
  console.error(
    `Refusing to overwrite ${outputPath} without --force. Use explicit --env and --force when rotating a signed envelope.`,
  );
  process.exit(1);
}

for (const otherEnv of ALLOWED_ENVS) {
  if (otherEnv === env) continue;
  const otherPath = path.join(releaseDir, otherEnv, "current.json");
  if (existsSync(otherPath) && path.resolve(otherPath) === path.resolve(outputPath)) {
    console.error("Output path collision with another environment release");
    process.exit(1);
  }
}

writeFileSync(outputPath, `${JSON.stringify(release, null, 2)}\n`);

if (env === "development") {
  const legacyPath = path.join(releaseDir, "current.json");
  copyFileSync(outputPath, legacyPath);
}

if (env === "staging") {
  const legacyPath = path.join(releaseDir, "current.json");
  copyFileSync(outputPath, legacyPath);
}

const historyPath = path.join(envDir, "history.json");
writeFileSync(
  historyPath,
  `${JSON.stringify([{ version, beaconHash, publishedAt, keyId, environment: env }], null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      environment: env,
      version,
      beaconHash,
      publishedAt,
      keyId,
      domain: BEACON_RELEASE_DOMAIN,
      canonical: canonicalPath,
      output: outputPath,
      note: "Signing key value is never printed",
    },
    null,
    2,
  ),
);
