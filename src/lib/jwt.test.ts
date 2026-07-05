import { describe, expect, it } from "vitest";
import { decodeJwtPayload, getTokenExpiryMs, isTokenExpired } from "./jwt";

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${base64url({ alg: "none", typ: "JWT" })}.${base64url(payload)}.signature`;
}

describe("decodeJwtPayload", () => {
  it("decodes a well-formed token's payload", () => {
    const token = makeToken({ sub: "operator", exp: 123 });
    expect(decodeJwtPayload(token)).toEqual({ sub: "operator", exp: 123 });
  });

  it("returns null for a token without three segments", () => {
    expect(decodeJwtPayload("onlyonepart")).toBeNull();
    expect(decodeJwtPayload("two.parts")).toBeNull();
  });

  it("returns null for a payload segment that isn't valid base64url JSON", () => {
    expect(decodeJwtPayload("header.not-valid-base64===.signature")).toBeNull();
  });

  it("returns null when the decoded payload isn't a JSON object", () => {
    const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${base64url("header")}.${base64url("just a string")}.signature`;
    expect(decodeJwtPayload(token)).toBeNull();
  });
});

describe("getTokenExpiryMs", () => {
  it("returns exp converted to milliseconds", () => {
    const token = makeToken({ exp: 1_700_000_000 });
    expect(getTokenExpiryMs(token)).toBe(1_700_000_000 * 1000);
  });

  it("returns null when exp is missing", () => {
    const token = makeToken({ sub: "operator" });
    expect(getTokenExpiryMs(token)).toBeNull();
  });

  it("returns null for a malformed token", () => {
    expect(getTokenExpiryMs("garbage")).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("returns false for a token expiring in the future", () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isTokenExpired(token)).toBe(false);
  });

  it("returns true for a token that already expired", () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 10 });
    expect(isTokenExpired(token)).toBe(true);
  });

  it("treats a malformed token as expired", () => {
    expect(isTokenExpired("garbage")).toBe(true);
  });

  it("honors the buffer, expiring early when within the buffer window", () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 30 });
    expect(isTokenExpired(token, 0)).toBe(false);
    expect(isTokenExpired(token, 60_000)).toBe(true);
  });
});
