import {
  BEACON_RELEASE_DOMAIN,
  BEACON_SIGNING_KEY_ID,
} from "../../msh-ops/beacon/signedBeaconRelease";

export { BEACON_RELEASE_DOMAIN, BEACON_SIGNING_KEY_ID };

export type BeaconSigningEnv = {
  BEACON_SIGNING_KEY?: string;
  AUTH_SIGNING_KEY?: string;
  DEPLOY_ENV?: string;
};

export interface ResolvedBeaconSigningKey {
  key: string;
  keyId: string;
  domain: string;
  source: "beacon" | "auth_fallback";
}

function resolveDeployEnv(env: BeaconSigningEnv): "development" | "staging" | "production" {
  if (env.DEPLOY_ENV === "production") return "production";
  if (env.DEPLOY_ENV === "staging") return "staging";
  return "development";
}

/**
 * Staging/production require BEACON_SIGNING_KEY.
 * Development may fall back to AUTH_SIGNING_KEY for local fixture tests only.
 */
export function resolveBeaconSigningKey(env: BeaconSigningEnv): ResolvedBeaconSigningKey | null {
  const key = env.BEACON_SIGNING_KEY?.trim();
  if (key) {
    return {
      key,
      keyId: BEACON_SIGNING_KEY_ID,
      domain: BEACON_RELEASE_DOMAIN,
      source: "beacon",
    };
  }
  const runtime = resolveDeployEnv(env);
  const authFallback = env.AUTH_SIGNING_KEY?.trim();
  if (runtime === "development" && authFallback) {
    return {
      key: authFallback,
      keyId: "auth-signing-key-dev-fallback",
      domain: BEACON_RELEASE_DOMAIN,
      source: "auth_fallback",
    };
  }
  return null;
}
