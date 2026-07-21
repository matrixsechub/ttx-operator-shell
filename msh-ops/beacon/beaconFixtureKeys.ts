/**
 * Exact fixture signing keys denied for staging/production release signing.
 * Single source of truth — do not duplicate this list elsewhere.
 */
export const BEACON_FIXTURE_SIGNING_KEY_DENYLIST = [
  "test-only-beacon-signing-key-do-not-use-in-production-01",
] as const;

export const BEACON_FIXTURE_KEY_DENIED = "BEACON_FIXTURE_KEY_DENIED";

export type BeaconProtectedReleaseEnvironment = "staging" | "production";

/** Exact-match check against the fixture denylist (caller should trim). */
export function isBeaconFixtureSigningKey(key: string): boolean {
  return (BEACON_FIXTURE_SIGNING_KEY_DENYLIST as readonly string[]).includes(key);
}

/**
 * Fail closed when a fixture key is used to sign a protected release environment.
 * Error messages must never include key material.
 */
export function assertBeaconSigningKeyAllowedForRelease(
  key: string,
  environment: BeaconProtectedReleaseEnvironment,
): void {
  if (environment !== "staging" && environment !== "production") {
    throw new Error("signBeaconRelease requires environment staging|production");
  }
  if (isBeaconFixtureSigningKey(key)) {
    throw new Error(BEACON_FIXTURE_KEY_DENIED);
  }
}
