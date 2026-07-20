/**
 * Sign a Beacon v2 release using BEACON_SIGNING_KEY from the environment.
 * Never prints the key. Refuses missing/malformed keys.
 *
 * Usage:
 *   BEACON_SIGNING_KEY="<secret>" BEACON_PUBLISHED_AT="2026-07-19T00:00:00.000Z" \
 *     node --import tsx scripts/sign-beacon-v2-release.ts [--out path] [--version 2.0.0]
 *
 * This mission does not sign the real staging release.
 */
import { writeFileSync } from "node:fs";
import {
  BEACON_SIGNING_KEY_ID,
  buildUnsignedBeaconV2Release,
  signBeaconRelease,
} from "../msh-ops/beacon/signedBeaconRelease.ts";

function usage(): never {
  console.error(
    "Usage: BEACON_SIGNING_KEY=<secret> [BEACON_PUBLISHED_AT=<iso>] node --import tsx scripts/sign-beacon-v2-release.ts [--out <file>] [--version <ver>]",
  );
  process.exit(1);
}

function parseArgs(argv: string[]): { out: string | null; version: string } {
  let out: string | null = null;
  let version = "2.0.0";
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
    if (arg === "--help" || arg === "-h") usage();
    console.error(`Unknown argument: ${arg}`);
    usage();
  }
  return { out, version };
}

const key = process.env.BEACON_SIGNING_KEY?.trim() ?? "";
if (key.length < 32) {
  console.error("BEACON_SIGNING_KEY is missing or too short (minimum 32 characters).");
  process.exit(1);
}

const { out, version } = parseArgs(process.argv.slice(2));
const publishedAt = process.env.BEACON_PUBLISHED_AT?.trim() || undefined;
const unsigned = await buildUnsignedBeaconV2Release(version, {
  publishedAt,
  keyId: BEACON_SIGNING_KEY_ID,
});
const release = await signBeaconRelease(unsigned, key);
const serialized = `${JSON.stringify(release, null, 2)}\n`;

if (out) {
  writeFileSync(out, serialized, { encoding: "utf8" });
  console.error(
    `Wrote signed Beacon v2 release version=${release.version} hash=${release.beaconHash} keyId=${release.signature.keyId} to ${out}`,
  );
} else {
  process.stdout.write(serialized);
  console.error(
    `Signed Beacon v2 release version=${release.version} hash=${release.beaconHash} keyId=${release.signature.keyId}`,
  );
}
