import releaseHistory from "../../msh-ops/beacon/releases/history.json";
import type { BeaconReleaseHistoryEntry } from "../../msh-ops/beacon/signedBeaconRelease";
import { resolveBeaconSigningKey, type SigningKeyEnv } from "../governance/signingKeys";
import { BEACON_RELEASE_DOMAIN } from "../governance/signingKeys";
import type { SignedBeaconRelease } from "../../msh-ops/beacon/signedBeaconRelease";
import { computeBeaconV2Hash } from "../../msh-ops/beacon/signedBeaconRelease";
import type { ModeEnv } from "../mode";
import type { BuildInfoEnv } from "../buildInfo";

export type BeaconReleaseEnv = SigningKeyEnv & ModeEnv & BuildInfoEnv;

export interface VerifiedBeaconV2State {
  verified: boolean;
  reason: string;
  version: string | null;
  beaconHash: string | null;
  publishedAt: string | null;
  keyId: string | null;
  release: SignedBeaconRelease | null;
}

let cachedRelease: SignedBeaconRelease | null | undefined;

async function loadBundledRelease(): Promise<SignedBeaconRelease | null> {
  if (cachedRelease !== undefined) return cachedRelease;
  try {
    const module = await import("../../msh-ops/beacon/releases/current.json");
    cachedRelease = module.default as SignedBeaconRelease;
    return cachedRelease;
  } catch {
    cachedRelease = null;
    return null;
  }
}

async function verifyRelease(release: SignedBeaconRelease, signing: NonNullable<ReturnType<typeof resolveBeaconSigningKey>>): Promise<boolean> {
  const computedHash = await computeBeaconV2Hash(release.beacon);
  if (computedHash !== release.beaconHash) return false;
  const envelope = {
    domain: BEACON_RELEASE_DOMAIN,
    version: release.version,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    keyId: signing.keyId,
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
  if (expected.length !== release.signature.value.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ release.signature.value.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function getVerifiedBeaconV2State(env: BeaconReleaseEnv): Promise<VerifiedBeaconV2State> {
  const signing = resolveBeaconSigningKey(env);
  const release = await loadBundledRelease();
  if (!release) {
    return {
      verified: false,
      reason: "no signed beacon v2 release published",
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
      reason: "beacon signing key not configured",
      version: release.version,
      beaconHash: release.beaconHash,
      publishedAt: release.publishedAt,
      keyId: release.signature.keyId,
      release,
    };
  }
  const valid = await verifyRelease(release, signing);
  return {
    verified: valid,
    reason: valid ? "verified" : "invalid signature",
    version: release.version,
    beaconHash: release.beaconHash,
    publishedAt: release.publishedAt,
    keyId: release.signature.keyId,
    release: valid ? release : null,
  };
}

export function getBeaconReleaseHistory(): BeaconReleaseHistoryEntry[] {
  return releaseHistory as BeaconReleaseHistoryEntry[];
}
