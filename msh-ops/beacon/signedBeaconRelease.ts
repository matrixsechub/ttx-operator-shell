import { assertBeaconSigningKeyAllowedForRelease } from "./beaconFixtureKeys";
import { getBeaconV2Draft, type BeaconV2 } from "./beaconV2Schema";

export const BEACON_RELEASE_DOMAIN = "MSHOPS::BEACON_RELEASE::V2";
export const BEACON_SIGNING_KEY_ID = "beacon-signing-key-v1";
export {
  BEACON_FIXTURE_KEY_DENIED,
  BEACON_FIXTURE_SIGNING_KEY_DENYLIST,
  assertBeaconSigningKeyAllowedForRelease,
  isBeaconFixtureSigningKey,
} from "./beaconFixtureKeys";

export type BeaconReleaseEnvironment = "staging" | "production";

export interface SignedBeaconRelease {
  version: string;
  environment: BeaconReleaseEnvironment;
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

export type UnsignedBeaconRelease = {
  version: string;
  environment: BeaconReleaseEnvironment;
  beacon: BeaconV2;
  beaconHash: string;
  publishedAt: string;
  keyId: string;
};

function isBeaconReleaseEnvironment(value: unknown): value is BeaconReleaseEnvironment {
  return value === "staging" || value === "production";
}

/**
 * Canonical HMAC envelope bytes.
 * LOCKED key order: domain, environment, version, beaconHash, publishedAt, keyId.
 * No legacy envelope without environment.
 */
export function canonicalizeBeaconReleaseEnvelope(parts: {
  environment: BeaconReleaseEnvironment;
  version: string;
  beaconHash: string;
  publishedAt: string;
  keyId: string;
}): string {
  return JSON.stringify({
    domain: BEACON_RELEASE_DOMAIN,
    environment: parts.environment,
    version: parts.version,
    beaconHash: parts.beaconHash,
    publishedAt: parts.publishedAt,
    keyId: parts.keyId,
  });
}

export function canonicalizeBeaconV2(beacon: BeaconV2): string {
  return JSON.stringify(beacon);
}

export async function computeBeaconV2Hash(beacon: BeaconV2): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalizeBeaconV2(beacon)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signBeaconRelease(
  release: UnsignedBeaconRelease,
  signingKey: string,
): Promise<SignedBeaconRelease> {
  if (!isBeaconReleaseEnvironment(release.environment)) {
    throw new Error("signBeaconRelease requires environment staging|production");
  }
  // Fail closed before any crypto, artifact construction, or file write.
  assertBeaconSigningKeyAllowedForRelease(signingKey, release.environment);
  const envelope = canonicalizeBeaconReleaseEnvelope({
    environment: release.environment,
    version: release.version,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    keyId: release.keyId,
  });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(envelope));
  const value = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return {
    version: release.version,
    environment: release.environment,
    beacon: release.beacon,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    signature: { algorithm: "HMAC-SHA-256", keyId: release.keyId, value },
  };
}

export async function verifySignedBeaconRelease(
  release: SignedBeaconRelease,
  signingKey: string,
  runtimeDeployEnv: string | undefined,
): Promise<{ valid: boolean; reason: string }> {
  if (!isBeaconReleaseEnvironment(release.environment)) {
    return { valid: false, reason: "BEACON_ENV_MISMATCH" };
  }

  const normalizedRuntime =
    runtimeDeployEnv?.trim() === "staging"
      ? "staging"
      : runtimeDeployEnv?.trim() === "production"
        ? "production"
        : "unprotected";

  if (normalizedRuntime === "unprotected" || normalizedRuntime !== release.environment) {
    return { valid: false, reason: "BEACON_ENV_MISMATCH" };
  }

  const computedHash = await computeBeaconV2Hash(release.beacon);
  if (computedHash !== release.beaconHash) {
    return { valid: false, reason: "BEACON_HASH_MISMATCH" };
  }

  const expected = await signBeaconRelease(
    {
      version: release.version,
      environment: release.environment,
      beacon: release.beacon,
      beaconHash: release.beaconHash,
      publishedAt: release.publishedAt,
      keyId: release.signature.keyId,
    },
    signingKey,
  );
  if (expected.signature.value.length !== release.signature.value.length) {
    return { valid: false, reason: "BEACON_SIGNATURE_INVALID" };
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
  options: {
    environment: BeaconReleaseEnvironment;
    publishedAt?: string;
    keyId?: string;
  },
): Promise<UnsignedBeaconRelease> {
  if (!isBeaconReleaseEnvironment(options.environment)) {
    throw new Error("buildUnsignedBeaconV2Release requires environment staging|production");
  }
  const beacon = getBeaconV2Draft();
  const beaconHash = await computeBeaconV2Hash(beacon);
  return {
    version,
    environment: options.environment,
    beacon,
    beaconHash,
    publishedAt: options.publishedAt ?? new Date().toISOString(),
    keyId: options.keyId ?? BEACON_SIGNING_KEY_ID,
  };
}
