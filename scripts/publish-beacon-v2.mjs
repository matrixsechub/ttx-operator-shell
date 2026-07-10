import { createHmac, createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BEACON_RELEASE_DOMAIN = "MSHOPS::BEACON_RELEASE::V2";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draftPath = path.join(root, "msh-ops/beacon/northstar-v2.json");
const releaseDir = path.join(root, "msh-ops/beacon/releases");
const currentPath = path.join(releaseDir, "current.json");
const historyPath = path.join(releaseDir, "history.json");

const signingKey = process.env.BEACON_SIGNING_KEY ?? process.env.AUTH_SIGNING_KEY;
if (!signingKey) {
  console.error("BEACON_SIGNING_KEY or AUTH_SIGNING_KEY required to publish beacon v2 release");
  process.exit(1);
}

const version = process.argv[2] ?? "2.0.0";
const keyId = process.env.BEACON_SIGNING_KEY_ID ?? "beacon-signing-key-v1";
const beacon = JSON.parse(readFileSync(draftPath, "utf8"));
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

mkdirSync(releaseDir, { recursive: true });
writeFileSync(currentPath, `${JSON.stringify(release, null, 2)}\n`);
const history = [
  {
    version,
    beaconHash,
    publishedAt,
    keyId,
  },
];
writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, version, beaconHash, publishedAt, output: currentPath }, null, 2));
