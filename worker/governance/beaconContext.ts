import type { BeaconReleaseEnv } from "../beacon/beaconRelease";
import { resolveBeaconRuntimeState } from "./beaconRuntime";

export async function getActiveBeaconHash(env: BeaconReleaseEnv): Promise<{
  hash: string;
  source: "beacon-v2-signed" | "beacon-v1";
  verified: boolean;
}> {
  const state = await resolveBeaconRuntimeState(env);
  return {
    hash: state.hash ?? "",
    source: state.status === "verified_v2" ? "beacon-v2-signed" : "beacon-v1",
    verified: state.status === "verified_v2",
  };
}
