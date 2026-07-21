import type { SignedBeaconRelease } from "../signedBeaconRelease";

/**
 * Production-only bundled Beacon v2 release slot.
 * Remains null until an authorized production activation mission publishes an env-bound signed release.
 */
export const BUNDLED_BEACON_V2_PRODUCTION_RELEASE: SignedBeaconRelease | null = null;
