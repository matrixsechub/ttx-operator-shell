import type { SignedBeaconRelease } from "../signedBeaconRelease";

/**
 * Staging-only bundled Beacon v2 release slot.
 * Remains null until an authorized staging activation mission publishes an env-bound signed release.
 */
export const BUNDLED_BEACON_V2_STAGING_RELEASE: SignedBeaconRelease | null = null;
