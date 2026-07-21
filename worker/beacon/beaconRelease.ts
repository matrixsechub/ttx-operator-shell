import releaseHistory from "../../msh-ops/beacon/releases/history.json" with { type: "json" };
import { BUNDLED_BEACON_V2_PRODUCTION_RELEASE } from "../../msh-ops/beacon/releases/bundledProductionRelease";
import { BUNDLED_BEACON_V2_STAGING_RELEASE } from "../../msh-ops/beacon/releases/bundledStagingRelease";
import {
  computeBeaconV2Hash,
  canonicalizeBeaconReleaseEnvelope,
  type BeaconReleaseHistoryEntry,
  type SignedBeaconRelease,
} from "../../msh-ops/beacon/signedBeaconRelease";
import {
  beaconSigningKeyDenialReason,
  normalizeDeployEnv,
  resolveBeaconSigningKey,
  type BeaconSigningEnv,
  type NormalizedDeployEnv,
  type ResolvedBeaconSigningKey,
} from "./beaconSigning";

export type BeaconReleaseEnv = BeaconSigningEnv;

export type BeaconV2DenialReason =
  | "BEACON_RELEASE_MISSING"
  | "BEACON_SIGNING_KEY_MISSING"
  | "BEACON_FIXTURE_KEY_DENIED"
  | "BEACON_ENV_MISMATCH"
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
  /** Test/injection override. `undefined` uses the env-selected bundled release slot. */
  release?: SignedBeaconRelease | null;
}

type ProtectedDeployEnv = Exclude<NormalizedDeployEnv, "unprotected">;

const testSlotCache: {
  staging: SignedBeaconRelease | null | undefined;
  production: SignedBeaconRelease | null | undefined;
} = {
  staging: undefined,
  production: undefined,
};

function loadBundledRelease(env: BeaconReleaseEnv): SignedBeaconRelease | null {
  const runtime = normalizeDeployEnv(env.DEPLOY_ENV);
  switch (runtime) {
    case "staging":
      return testSlotCache.staging !== undefined
        ? testSlotCache.staging
        : BUNDLED_BEACON_V2_STAGING_RELEASE;
    case "production":
      return testSlotCache.production !== undefined
        ? testSlotCache.production
        : BUNDLED_BEACON_V2_PRODUCTION_RELEASE;
    case "unprotected":
      return null;
    default: {
      const _exhaustive: never = runtime;
      return _exhaustive;
    }
  }
}

/** Test-only: install a fixture release into a protected env slot. */
export function setBundledBeaconReleaseForTests(
  env: ProtectedDeployEnv,
  release: SignedBeaconRelease | null,
): void {
  testSlotCache[env] = release;
}

/** Test-only: reset per-env bundled release caches so module defaults are reloaded. */
export function resetBeaconReleaseCacheForTests(): void {
  testSlotCache.staging = undefined;
  testSlotCache.production = undefined;
}

async function verifyRelease(
  release: SignedBeaconRelease,
  signing: ResolvedBeaconSigningKey,
  runtimeDeployEnv: string | undefined,
): Promise<{ ok: true } | { ok: false; reason: BeaconV2DenialReason }> {
  const runtime = normalizeDeployEnv(runtimeDeployEnv);
  if (release.environment !== "staging" && release.environment !== "production") {
    return { ok: false, reason: "BEACON_ENV_MISMATCH" };
  }
  if (runtime === "unprotected" || release.environment !== runtime) {
    return { ok: false, reason: "BEACON_ENV_MISMATCH" };
  }

  const computedHash = await computeBeaconV2Hash(release.beacon);
  if (computedHash !== release.beaconHash) {
    return { ok: false, reason: "BEACON_HASH_MISMATCH" };
  }

  const envelope = canonicalizeBeaconReleaseEnvelope({
    environment: release.environment,
    version: release.version,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    keyId: release.signature.keyId,
  });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signing.key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(envelope));
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
  const release = options.release !== undefined ? options.release : loadBundledRelease(env);
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
      reason: beaconSigningKeyDenialReason(env),
      version: release.version,
      beaconHash: release.beaconHash,
      publishedAt: release.publishedAt,
      keyId: release.signature.keyId,
      release,
    };
  }
  const result = await verifyRelease(release, signing, env.DEPLOY_ENV);
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

/** History is non-authoritative metadata only — never used for verification. */
export function getBeaconReleaseHistory(): BeaconReleaseHistoryEntry[] {
  return releaseHistory as BeaconReleaseHistoryEntry[];
}
