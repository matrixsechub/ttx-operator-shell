import manifestDocument from "../../codex/manifest.json" with { type: "json" };

export interface CodexManifestSnapshot {
  manifestHash: string;
  manifestVersion: string;
  lastValidatedAt: string | null;
  driftCount: number;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let cachedHash: string | null = null;

export async function computeCodexManifestHash(source: unknown = manifestDocument): Promise<string> {
  const canonical = JSON.stringify(source);
  return sha256Hex(canonical);
}

export async function getCodexManifestSnapshot(): Promise<CodexManifestSnapshot> {
  if (!cachedHash) {
    cachedHash = await computeCodexManifestHash();
  }
  const manifest = manifestDocument as {
    system?: { last_validated_at?: string | null; drift_count?: number; codex_version?: string };
  };
  return {
    manifestHash: cachedHash,
    manifestVersion: manifest.system?.codex_version ?? "1.0.0",
    lastValidatedAt: manifest.system?.last_validated_at ?? null,
    driftCount: manifest.system?.drift_count ?? 0,
  };
}

export function getCodexManifest(): typeof manifestDocument {
  return manifestDocument;
}
