import { getBeaconV2Draft, type BeaconV2 } from "./beaconV2Schema";

export const BEACON_RELEASE_DOMAIN = "MSHOPS::BEACON_RELEASE::V2";
export const BEACON_SIGNING_KEY_ID = "beacon-signing-key-v1";

export interface SignedBeaconRelease {
  version: string;
  beacon: BeaconV2;
  beaconHash: string;
  signature: {
    algorithm: "HMAC-SHA-256";
    keyId: string;
    value: string;
  };
  publishedAt: string;
}

export interface BeaconReleaseHistoryEntry {
  version: string;
  beaconHash: string;
  publishedAt: string;
  keyId: string;
}

export function canonicalizeBeaconV2(beacon: BeaconV2): string {
  return JSON.stringify(beacon);
}

export async function computeBeaconV2Hash(beacon: BeaconV2): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalizeBeaconV2(beacon)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signBeaconRelease(
  release: Omit<SignedBeaconRelease, "signature"> & { keyId: string },
  signingKey: string,
): Promise<SignedBeaconRelease> {
  const envelope = {
    domain: BEACON_RELEASE_DOMAIN,
    version: release.version,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    keyId: release.keyId,
  };
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(JSON.stringify(envelope)));
  const value = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return {
    version: release.version,
    beacon: release.beacon,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    signature: { algorithm: "HMAC-SHA-256", keyId: release.keyId, value },
  };
}

export async function verifySignedBeaconRelease(
  release: SignedBeaconRelease,
  signingKey: string,
): Promise<{ valid: boolean; reason: string }> {
  const computedHash = await computeBeaconV2Hash(release.beacon);
  if (computedHash !== release.beaconHash) {
    return { valid: false, reason: "BEACON_HASH_MISMATCH" };
  }
  const expected = await signBeaconRelease(
    {
      version: release.version,
      beacon: release.beacon,
      beaconHash: release.beaconHash,
      publishedAt: release.publishedAt,
      keyId: release.signature.keyId,
    },
    signingKey,
  );
  if (expected.signature.value.length !== release.signature.value.length) {
    return { valid: false, reason: "signature length mismatch" };
  }
  let mismatch = 0;
  for (let i = 0; i < expected.signature.value.length; i++) {
    mismatch |= expected.signature.value.charCodeAt(i) ^ release.signature.value.charCodeAt(i);
  }
  return mismatch === 0
    ? { valid: true, reason: "BEACON_VERIFIED" }
    : { valid: false, reason: "BEACON_SIGNATURE_INVALID" };
}

export async function buildUnsignedBeaconV2Release(
  version = "2.0.0",
  options: { publishedAt?: string; keyId?: string } = {},
): Promise<{
  version: string;
  beacon: BeaconV2;
  beaconHash: string;
  publishedAt: string;
  keyId: string;
}> {
  const beacon = getBeaconV2Draft();
  const beaconHash = await computeBeaconV2Hash(beacon);
  return {
    version,
    beacon,
    beaconHash,
    publishedAt: options.publishedAt ?? new Date().toISOString(),
    keyId: options.keyId ?? BEACON_SIGNING_KEY_ID,
  };
}
