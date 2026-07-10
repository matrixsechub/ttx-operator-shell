import type { CustomerBeaconDocument } from "./types";

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

export function canonicalizeCustomerBeacon(doc: CustomerBeaconDocument): string {
  return JSON.stringify(sortKeys(doc));
}

export async function computeCustomerBeaconHash(canonical: string): Promise<string> {
  const data = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashCustomerBeacon(doc: CustomerBeaconDocument): Promise<string> {
  return computeCustomerBeaconHash(canonicalizeCustomerBeacon(doc));
}
