import { describe, expect, it } from "vitest";
import { enforceRetention, recordSecurityEvent } from "./security";
import { createMockKv } from "./testUtils/mockKv";

const MAX_STORED_SECURITY_EVENTS = 50;

function isoTimestamp(secondsFromEpoch: number): string {
  return new Date(secondsFromEpoch * 1000).toISOString();
}

describe("enforceRetention", () => {
  it("leaves the store untouched when under the cap", async () => {
    const kv = createMockKv();
    for (let i = 0; i < 10; i++) {
      await kv.put(`sec:${isoTimestamp(i)}:id${i}`, "{}");
    }

    await enforceRetention(kv);

    const listed = await kv.list({ prefix: "sec:" });
    expect(listed.keys).toHaveLength(10);
  });

  it("deletes only the oldest excess keys once over the cap", async () => {
    const kv = createMockKv();
    const total = MAX_STORED_SECURITY_EVENTS + 10;
    for (let i = 0; i < total; i++) {
      await kv.put(`sec:${isoTimestamp(i)}:id${i}`, "{}");
    }

    await enforceRetention(kv);

    const listed = await kv.list({ prefix: "sec:" });
    expect(listed.keys).toHaveLength(MAX_STORED_SECURITY_EVENTS);

    // The oldest 10 (id0..id9) must be gone; the newest 50 must remain.
    const names = listed.keys.map((key) => key.name);
    for (let i = 0; i < 10; i++) {
      expect(names.some((name) => name.endsWith(`:id${i}`))).toBe(false);
    }
    for (let i = 10; i < total; i++) {
      expect(names.some((name) => name.endsWith(`:id${i}`))).toBe(true);
    }
  });
});

describe("recordSecurityEvent", () => {
  it("stores an event and enforces retention afterward", async () => {
    const kv = createMockKv();
    const total = MAX_STORED_SECURITY_EVENTS + 5;
    for (let i = 0; i < total; i++) {
      await recordSecurityEvent(kv, "auth_failed", { attempt: i });
    }

    const listed = await kv.list({ prefix: "sec:" });
    expect(listed.keys).toHaveLength(MAX_STORED_SECURITY_EVENTS);
  });

  it("never throws when the KV write fails", async () => {
    const failingKv = createMockKv();
    failingKv.put = () => {
      throw new Error("kv unavailable");
    };

    await expect(recordSecurityEvent(failingKv, "invalid_token", {})).resolves.toBeUndefined();
  });
});
