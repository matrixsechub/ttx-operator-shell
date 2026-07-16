import { jsonResponse } from "./http";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon";
import { getBeaconV2Draft } from "../msh-ops/beacon/beaconV2Schema";
import { getBeaconReleaseHistory, getVerifiedBeaconV2State } from "./beacon/beaconRelease";
import type { BeaconReleaseEnv } from "./beacon/beaconRelease";
export async function handleBeaconRoute(
  _request: Request,
  pathname: string,
  method: string,
  env?: BeaconReleaseEnv,
): Promise<Response | null> {
  if (method === "GET" && pathname === "/api/beacon") {
    const result = await ensureBeaconLoaded();
    return jsonResponse({
      version: 1,
      id: result.beacon.id,
      hash: result.integrityHash,
      safe_mode: result.safeMode,
      payload: result.beacon,
      draft_v2_available: true,
    });
  }

  if (method === "GET" && pathname === "/api/beacon/v2/draft") {
    try {
      const draft = getBeaconV2Draft();
      return jsonResponse({
        version: 2,
        draft: true,
        active: false,
        payload: draft,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "beacon-v2-invalid";
      return jsonResponse({ error: message }, 400);
    }
  }

  if (method === "GET" && pathname === "/api/beacon/v2") {
    if (!env) return jsonResponse({ error: "Beacon release env unavailable" }, 500);
    const state = await getVerifiedBeaconV2State(env);
    if (!state.verified || !state.release) {
      return jsonResponse(
        {
          ok: false,
          verified: false,
          reason: state.reason,
          version: state.version,
          history: getBeaconReleaseHistory(),
        },
        503,
      );
    }
    return jsonResponse({
      ok: true,
      verified: true,
      version: state.version,
      beaconHash: state.beaconHash,
      publishedAt: state.publishedAt,
      keyId: state.keyId,
      release: state.release,
      history: getBeaconReleaseHistory(),
    });
  }

  return null;
}
