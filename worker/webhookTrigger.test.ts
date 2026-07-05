import { describe, expect, it, vi } from "vitest";
import { checkRepeat, verifySignature } from "./webhookTrigger";

async function hmacSignHex(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

describe("verifySignature", () => {
  const secret = "webhook-secret";
  const body = JSON.stringify({ hello: "world" });

  it("accepts a signature computed with the correct secret", async () => {
    const signature = await hmacSignHex(body, secret);
    expect(await verifySignature(body, signature, secret)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const signature = await hmacSignHex(body, "a-different-secret");
    expect(await verifySignature(body, signature, secret)).toBe(false);
  });

  it("rejects a signature for a different body", async () => {
    const signature = await hmacSignHex(body, secret);
    expect(await verifySignature("tampered body", signature, secret)).toBe(false);
  });

  it("rejects a missing signature", async () => {
    expect(await verifySignature(body, "", secret)).toBe(false);
  });

  it("rejects non-hex signature input without throwing", async () => {
    expect(await verifySignature(body, "not-a-real-signature", secret)).toBe(false);
  });
});

type RepeatEntry = { count: number; windowStart: number; flagged: boolean };

describe("checkRepeat", () => {
  it("does not flag while under the threshold", () => {
    const map = new Map<string, RepeatEntry>();
    for (let i = 0; i < 3; i++) {
      expect(checkRepeat(map, "key", 60_000, 3)).toBe(false);
    }
  });

  it("flags exactly once when the threshold is exceeded", () => {
    const map = new Map<string, RepeatEntry>();
    const results: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(checkRepeat(map, "key", 60_000, 3));
    }
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results[3]).toBe(true); // 4th call is the first with count > threshold
  });

  it("resets the window once it elapses, allowing a fresh count", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const map = new Map<string, RepeatEntry>();
      for (let i = 0; i < 4; i++) checkRepeat(map, "key", 1000, 3); // triggers the flag

      vi.setSystemTime(2000); // past the 1000ms window
      expect(checkRepeat(map, "key", 1000, 3)).toBe(false); // fresh window, count resets to 1
    } finally {
      vi.useRealTimers();
    }
  });

  it("tracks separate keys independently", () => {
    const map = new Map<string, RepeatEntry>();
    for (let i = 0; i < 5; i++) checkRepeat(map, "a", 60_000, 3);
    expect(checkRepeat(map, "b", 60_000, 3)).toBe(false);
  });
});

// checkSpike carries module-level state (no params), so each test that cares
// about its counters loads a fresh module instance rather than sharing the
// statically-imported one across cases.
describe("checkSpike", () => {
  async function freshModule() {
    vi.resetModules();
    return import("./webhookTrigger");
  }

  it("does not flag at or below the threshold", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const mod = await freshModule();
      for (let i = 0; i < 20; i++) {
        expect(mod.checkSpike()).toBe(false);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("flags exactly once per window when the threshold is exceeded", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const mod = await freshModule();
      const results: boolean[] = [];
      for (let i = 0; i < 25; i++) {
        results.push(mod.checkSpike());
      }
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(mod.checkSpike()).toBe(false); // still same window, no re-flag
    } finally {
      vi.useRealTimers();
    }
  });

  it("can flag again once a new window starts", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const mod = await freshModule();
      for (let i = 0; i < 25; i++) mod.checkSpike();

      vi.setSystemTime(20_000); // new 10s window
      const results: boolean[] = [];
      for (let i = 0; i < 25; i++) results.push(mod.checkSpike());
      expect(results.filter(Boolean)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
