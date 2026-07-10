import type { Beacon } from "./beaconSchema";
import { EXPECTED_BEACON_SHA256 } from "./beaconHash";

export { EXPECTED_BEACON_SHA256 } from "./beaconHash";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(record[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonicalizeBeacon(doc: Beacon): string {
  return JSON.stringify(sortKeys(doc));
}

export async function computeBeaconHash(canonical: string): Promise<string> {
  const data = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export class BeaconIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BeaconIntegrityError";
  }
}

export async function verifyBeaconIntegrity(
  beacon: Beacon,
  expectedHash: string = EXPECTED_BEACON_SHA256,
): Promise<string> {
  const canonical = canonicalizeBeacon(beacon);
  const hash = await computeBeaconHash(canonical);
  if (hash !== expectedHash) {
    throw new BeaconIntegrityError(
      `Beacon integrity hash mismatch (expected ${expectedHash}, got ${hash})`,
    );
  }
  return hash;
}
