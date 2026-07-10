import { createHash } from "node:crypto";

export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (v as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return v;
  });
}

export function evidenceHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export async function routeHash(route: string): Promise<string> {
  const normalized = route.replace(/\/$/, "") || "/";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export function idempotencyKey(parts: {
  origin: string;
  routes: string[];
  viewports: string[];
  mode: string;
  evidenceHash: string;
}): string {
  return evidenceHash(parts);
}
