import {
  BEACON_RELEASE_DOMAIN,
  BEACON_SIGNING_KEY_ID,
} from "../../msh-ops/beacon/signedBeaconRelease";
import {
  BEACON_FIXTURE_SIGNING_KEY_DENYLIST,
  isBeaconFixtureSigningKey,
} from "../../msh-ops/beacon/beaconFixtureKeys";

export { BEACON_RELEASE_DOMAIN, BEACON_SIGNING_KEY_ID, BEACON_FIXTURE_SIGNING_KEY_DENYLIST };

export type BeaconSigningEnv = {
  BEACON_SIGNING_KEY?: string;
  AUTH_SIGNING_KEY?: string;
  DEPLOY_ENV?: string;
};

export type NormalizedDeployEnv = "staging" | "production" | "unprotected";

export interface ResolvedBeaconSigningKey {
  key: string;
  keyId: string;
  domain: string;
  source: "beacon" | "auth_fallback";
}

/**
 * Exact-match DEPLOY_ENV normalization after trim.
 * No case-folding. Unknown / missing / development / test → unprotected.
 */
export function normalizeDeployEnv(raw?: string): NormalizedDeployEnv {
  const value = raw?.trim() ?? "";
  if (value === "staging") return "staging";
  if (value === "production") return "production";
  return "unprotected";
}

/**
 * Resolve the Beacon HMAC signing key.
 *
 * Staging and production BEACON_SIGNING_KEY values must be distinct in Cloudflare
 * (separate wrangler env secrets). Never log key material.
 *
 * Protected envs reject the known fixture denylist entry and require a non-empty
 * key of at least 32 characters. AUTH_SIGNING_KEY fallback is only for unprotected.
 */
export function resolveBeaconSigningKey(env: BeaconSigningEnv): ResolvedBeaconSigningKey | null {
  const runtime = normalizeDeployEnv(env.DEPLOY_ENV);
  const key = env.BEACON_SIGNING_KEY?.trim() ?? "";

  if (key) {
    if (runtime !== "unprotected" && isBeaconFixtureSigningKey(key)) {
      return null;
    }
    if (key.length < 32) {
      return null;
    }
    return {
      key,
      keyId: BEACON_SIGNING_KEY_ID,
      domain: BEACON_RELEASE_DOMAIN,
      source: "beacon",
    };
  }

  if (runtime === "unprotected") {
    const authFallback = env.AUTH_SIGNING_KEY?.trim() ?? "";
    if (authFallback.length >= 32) {
      return {
        key: authFallback,
        keyId: "auth-signing-key-dev-fallback",
        domain: BEACON_RELEASE_DOMAIN,
        source: "auth_fallback",
      };
    }
  }

  return null;
}

/** Map a failed key resolve to a denial reason without logging key material. */
export function beaconSigningKeyDenialReason(
  env: BeaconSigningEnv,
): "BEACON_FIXTURE_KEY_DENIED" | "BEACON_SIGNING_KEY_MISSING" {
  const runtime = normalizeDeployEnv(env.DEPLOY_ENV);
  const key = env.BEACON_SIGNING_KEY?.trim() ?? "";
  if (key && runtime !== "unprotected" && isBeaconFixtureSigningKey(key)) {
    return "BEACON_FIXTURE_KEY_DENIED";
  }
  return "BEACON_SIGNING_KEY_MISSING";
}
