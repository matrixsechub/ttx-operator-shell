import type { BeaconReleaseEnv } from "../beacon/beaconRelease";
import { getVerifiedBeaconV2State } from "../beacon/beaconRelease";
import { ensureBeaconLoaded } from "../../msh-ops/beacon/loadBeacon";

export type BeaconRuntimeState =
  | {
      status: "verified_v2";
      hash: string;
      version: string;
      mutationAllowed: true;
    }
  | {
      status: "legacy_v1";
      hash: string;
      mutationAllowed: false;
      reasonCode: "SIGNED_BEACON_NOT_ACTIVE";
    }
  | {
      status: "invalid";
      hash: string | null;
      mutationAllowed: false;
      reasonCode: string;
    };

export async function resolveBeaconRuntimeState(env: BeaconReleaseEnv): Promise<BeaconRuntimeState> {
  const v2 = await getVerifiedBeaconV2State(env);
  if (v2.verified && v2.beaconHash && v2.version) {
    return {
      status: "verified_v2",
      hash: v2.beaconHash,
      version: v2.version,
      mutationAllowed: true,
    };
  }
  const v1 = await ensureBeaconLoaded();
  if (!v2.verified && v1.integrityHash) {
    return {
      status: "legacy_v1",
      hash: v1.integrityHash,
      mutationAllowed: false,
      reasonCode: "SIGNED_BEACON_NOT_ACTIVE",
    };
  }
  return {
    status: "invalid",
    hash: v2.beaconHash ?? v1.integrityHash ?? null,
    mutationAllowed: false,
    reasonCode: v2.reason || "BEACON_INVALID",
  };
}

export async function getBeaconHashForReads(env: BeaconReleaseEnv): Promise<string> {
  const state = await resolveBeaconRuntimeState(env);
  if (state.hash) return state.hash;
  const v1 = await ensureBeaconLoaded();
  return v1.integrityHash;
}
