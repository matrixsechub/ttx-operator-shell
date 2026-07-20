import type { SignedBeaconRelease } from "../signedBeaconRelease";

/**
 * Bundled signed Beacon v2 release.
 * Remains null until an authorized activation mission publishes a newly signed release.
 * Do not copy sibling-history releases into this slot.
 */
export const BUNDLED_BEACON_V2_RELEASE: SignedBeaconRelease | null = null;
