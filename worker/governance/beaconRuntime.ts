import { ensureBeaconLoaded } from "../../msh-ops/beacon/loadBeacon";
import {
  getVerifiedBeaconV2State,
  type BeaconReleaseEnv,
  type BeaconReleaseResolveOptions,
} from "../beacon/beaconRelease";

export type { BeaconReleaseEnv };

export type BeaconRuntimeReasonCode =
  | "BEACON_VERIFIED"
  | "SIGNED_BEACON_NOT_ACTIVE"
  | "BEACON_RELEASE_MISSING"
  | "BEACON_SIGNING_KEY_MISSING"
  | "BEACON_HASH_MISMATCH"
  | "BEACON_SIGNATURE_INVALID"
  | "BEACON_SAFE_MODE"
  | "BEACON_INVALID"
  | string;

export type BeaconRuntimeState =
  | {
      status: "verified_v2";
      hash: string;
      version: string;
      mutationAllowed: true;
      reasonCode: "BEACON_VERIFIED";
    }
  | {
      status: "legacy_v1";
      hash: string;
      mutationAllowed: false;
      reasonCode: BeaconRuntimeReasonCode;
    }
  | {
      status: "invalid";
      hash: string | null;
      mutationAllowed: false;
      reasonCode: BeaconRuntimeReasonCode;
    };

/**
 * Prefer cryptographically verified Beacon v2.
 * Fall back to integrity-checked Beacon v1 as legacy_v1 (never upgraded to verified_v2).
 * Fail closed to invalid when no usable hash exists.
 */
export async function resolveBeaconRuntimeState(
  env: BeaconReleaseEnv,
  options: BeaconReleaseResolveOptions = {},
): Promise<BeaconRuntimeState> {
  const v2 = await getVerifiedBeaconV2State(env, options);
  if (v2.verified && v2.beaconHash && v2.version) {
    return {
      status: "verified_v2",
      hash: v2.beaconHash,
      version: v2.version,
      mutationAllowed: true,
      reasonCode: "BEACON_VERIFIED",
    };
  }

  const v1 = await ensureBeaconLoaded();
  if (v1.integrityHash && !v1.safeMode) {
    return {
      status: "legacy_v1",
      hash: v1.integrityHash,
      mutationAllowed: false,
      reasonCode: v2.reason === "BEACON_RELEASE_MISSING"
        ? "SIGNED_BEACON_NOT_ACTIVE"
        : v2.reason || "SIGNED_BEACON_NOT_ACTIVE",
    };
  }

  return {
    status: "invalid",
    hash: v2.beaconHash ?? v1.integrityHash ?? null,
    mutationAllowed: false,
    reasonCode: v1.safeMode ? "BEACON_SAFE_MODE" : (v2.reason || "BEACON_INVALID"),
  };
}

export async function getBeaconHashForReads(
  env: BeaconReleaseEnv,
  options: BeaconReleaseResolveOptions = {},
): Promise<string> {
  const state = await resolveBeaconRuntimeState(env, options);
  if (state.hash) return state.hash;
  const v1 = await ensureBeaconLoaded();
  return v1.integrityHash;
}
