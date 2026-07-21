/**
 * Sign a Beacon v2 release using BEACON_SIGNING_KEY from the environment.
 * Never prints the key. Refuses missing/malformed keys and missing/unknown target env.
 *
 * Usage:
 *   BEACON_SIGNING_KEY="<secret>" BEACON_PUBLISHED_AT="2026-07-19T00:00:00.000Z" \
 *     node --import tsx scripts/sign-beacon-v2-release.ts --env staging|production [--out path] [--version 2.0.0]
 *
 * Target env may also be supplied via BEACON_TARGET_ENV=staging|production.
 * This mission does not sign the real staging release.
 */
import { writeFileSync } from "node:fs";
import {
  BEACON_SIGNING_KEY_ID,
  buildUnsignedBeaconV2Release,
  signBeaconRelease,
  type BeaconReleaseEnvironment,
} from "../msh-ops/beacon/signedBeaconRelease.ts";

function usage(): never {
  console.error(
    "Usage: BEACON_SIGNING_KEY=<secret> [BEACON_PUBLISHED_AT=<iso>] [BEACON_TARGET_ENV=staging|production] node --import tsx scripts/sign-beacon-v2-release.ts --env staging|production [--out <file>] [--version <ver>]",
  );
  process.exit(1);
}

function parseArgs(argv: string[]): {
  out: string | null;
  version: string;
  environment: BeaconReleaseEnvironment | null;
} {
  let out: string | null = null;
  let version = "2.0.0";
  let environment: BeaconReleaseEnvironment | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") {
      out = argv[++i] ?? null;
      if (!out) usage();
      continue;
    }
    if (arg === "--version") {
      version = argv[++i] ?? "";
      if (!version) usage();
      continue;
    }
    if (arg === "--env") {
      const value = argv[++i] ?? "";
      if (value !== "staging" && value !== "production") {
        console.error(`Unknown or missing --env value: ${value || "(empty)"}`);
        usage();
      }
      environment = value;
      continue;
    }
    if (arg === "--help" || arg === "-h") usage();
    console.error(`Unknown argument: ${arg}`);
    usage();
  }
  return { out, version, environment };
}

function resolveTargetEnv(
  fromArgs: BeaconReleaseEnvironment | null,
): BeaconReleaseEnvironment {
  if (fromArgs === "staging" || fromArgs === "production") return fromArgs;
  const fromEnv = process.env.BEACON_TARGET_ENV?.trim() ?? "";
  if (fromEnv === "staging" || fromEnv === "production") return fromEnv;
  console.error("Target environment required: pass --env staging|production or set BEACON_TARGET_ENV.");
  process.exit(1);
}

const key = process.env.BEACON_SIGNING_KEY?.trim() ?? "";
if (key.length < 32) {
  console.error("BEACON_SIGNING_KEY is missing or too short (minimum 32 characters).");
  process.exit(1);
}

const { out, version, environment: envArg } = parseArgs(process.argv.slice(2));
const environment = resolveTargetEnv(envArg);
const publishedAt = process.env.BEACON_PUBLISHED_AT?.trim() || undefined;
const unsigned = await buildUnsignedBeaconV2Release(version, {
  environment,
  publishedAt,
  keyId: BEACON_SIGNING_KEY_ID,
});
const release = await signBeaconRelease(unsigned, key);
const serialized = `${JSON.stringify(release, null, 2)}\n`;

if (out) {
  writeFileSync(out, serialized, { encoding: "utf8" });
  console.error(
    `Wrote signed Beacon v2 release env=${release.environment} version=${release.version} hash=${release.beaconHash} keyId=${release.signature.keyId} to ${out}`,
  );
} else {
  process.stdout.write(serialized);
  console.error(
    `Signed Beacon v2 release env=${release.environment} version=${release.version} hash=${release.beaconHash} keyId=${release.signature.keyId}`,
  );
}
