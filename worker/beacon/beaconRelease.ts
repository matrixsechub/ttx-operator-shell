import releaseHistory from "../../msh-ops/beacon/releases/history.json" with { type: "json" };
import { BUNDLED_BEACON_V2_RELEASE } from "../../msh-ops/beacon/releases/bundledRelease";
import {
  computeBeaconV2Hash,
  type BeaconReleaseHistoryEntry,
  type SignedBeaconRelease,
} from "../../msh-ops/beacon/signedBeaconRelease";
import {
  BEACON_RELEASE_DOMAIN,
  resolveBeaconSigningKey,
  type BeaconSigningEnv,
  type ResolvedBeaconSigningKey,
} from "./beaconSigning";

export type BeaconReleaseEnv = BeaconSigningEnv;

export type BeaconV2DenialReason =
  | "BEACON_RELEASE_MISSING"
  | "BEACON_SIGNING_KEY_MISSING"
  | "BEACON_HASH_MISMATCH"
  | "BEACON_SIGNATURE_INVALID"
  | "BEACON_VERIFIED";

export interface VerifiedBeaconV2State {
  verified: boolean;
  reason: BeaconV2DenialReason | string;
  version: string | null;
  beaconHash: string | null;
  publishedAt: string | null;
  keyId: string | null;
  release: SignedBeaconRelease | null;
}

export interface BeaconReleaseResolveOptions {
  /** Test/injection override. `undefined` uses the bundled release slot. */
  release?: SignedBeaconRelease | null;
}

let cachedRelease: SignedBeaconRelease | null | undefined;

function loadBundledRelease(): SignedBeaconRelease | null {
  if (cachedRelease !== undefined) return cachedRelease;
  cachedRelease = BUNDLED_BEACON_V2_RELEASE;
  return cachedRelease;
}

/** Test-only: install a fixture release into the bundled slot. */
export function setBundledBeaconReleaseForTests(release: SignedBeaconRelease | null): void {
  cachedRelease = release;
}

/** Test-only: reset bundled release cache so the module default is reloaded. */
export function resetBeaconReleaseCacheForTests(): void {
  cachedRelease = undefined;
}

async function verifyRelease(
  release: SignedBeaconRelease,
  signing: ResolvedBeaconSigningKey,
): Promise<{ ok: true } | { ok: false; reason: BeaconV2DenialReason }> {
  const computedHash = await computeBeaconV2Hash(release.beacon);
  if (computedHash !== release.beaconHash) {
    return { ok: false, reason: "BEACON_HASH_MISMATCH" };
  }
  const envelope = {
    domain: BEACON_RELEASE_DOMAIN,
    version: release.version,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    keyId: release.signature.keyId,
  };
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signing.key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(JSON.stringify(envelope)));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== release.signature.value.length) {
    return { ok: false, reason: "BEACON_SIGNATURE_INVALID" };
  }
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ release.signature.value.charCodeAt(i);
  }
  return mismatch === 0 ? { ok: true } : { ok: false, reason: "BEACON_SIGNATURE_INVALID" };
}

export async function getVerifiedBeaconV2State(
  env: BeaconReleaseEnv,
  options: BeaconReleaseResolveOptions = {},
): Promise<VerifiedBeaconV2State> {
  const signing = resolveBeaconSigningKey(env);
  const release = options.release !== undefined ? options.release : loadBundledRelease();
  if (!release) {
    return {
      verified: false,
      reason: "BEACON_RELEASE_MISSING",
      version: null,
      beaconHash: null,
      publishedAt: null,
      keyId: null,
      release: null,
    };
  }
  if (!signing) {
    return {
      verified: false,
      reason: "BEACON_SIGNING_KEY_MISSING",
      version: release.version,
      beaconHash: release.beaconHash,
      publishedAt: release.publishedAt,
      keyId: release.signature.keyId,
      release,
    };
  }
  const result = await verifyRelease(release, signing);
  if (!result.ok) {
    return {
      verified: false,
      reason: result.reason,
      version: release.version,
      beaconHash: release.beaconHash,
      publishedAt: release.publishedAt,
      keyId: release.signature.keyId,
      release,
    };
  }
  return {
    verified: true,
    reason: "BEACON_VERIFIED",
    version: release.version,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    keyId: release.signature.keyId,
    release,
  };
}

export function getBeaconReleaseHistory(): BeaconReleaseHistoryEntry[] {
  return releaseHistory as BeaconReleaseHistoryEntry[];
}
