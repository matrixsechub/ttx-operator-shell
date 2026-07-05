import { describe, expect, it } from "vitest";
import {
  handleAuthRoute,
  signToken,
  timingSafeEqual,
  verifyPassword,
  verifyToken,
  type AccessTokenPayload,
  type AuthEnv,
  type RefreshTokenPayload,
} from "./auth";
import type { SecurityEnv } from "./security";
import { createMockKv } from "./testUtils/mockKv";

const TEST_ITERATIONS = 1000; // low, for test speed — format is what's under test, not strength

// Same base64url encoding worker/auth.ts itself uses (bytesToBase64Url) —
// duplicated here rather than imported since it isn't exported, and Buffer
// isn't available under this project's Workers-only tsconfig.
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function hashPassword(password: string, iterations = TEST_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256),
  );
  return `pbkdf2$${iterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(bits)}`;
}

function testEnv(overrides: Partial<AuthEnv & SecurityEnv> = {}): AuthEnv & SecurityEnv {
  return {
    OPERATOR_CALLSIGN: "operator",
    OPERATOR_PASSWORD_HASH: "",
    AUTH_SIGNING_KEY: "test-signing-key",
    AUTH_REVOCATION: createMockKv(),
    SECURITY_EVENTS: createMockKv(),
    ...overrides,
  };
}

describe("timingSafeEqual", () => {
  it("returns true for identical byte arrays", () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false);
  });

  it("returns false for same length, different content", () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
  });
});

describe("verifyPassword", () => {
  it("accepts the correct password against its stored hash", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", stored)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
  });

  it.each([
    ["missing pbkdf2 prefix", "plain$1000$c2FsdA$aGFzaA"],
    ["wrong part count", "pbkdf2$1000$c2FsdA"],
    ["non-integer iterations", "pbkdf2$abc$c2FsdA$aGFzaA"],
    ["zero iterations", "pbkdf2$0$c2FsdA$aGFzaA"],
  ])("rejects a malformed stored hash (%s)", async (_label, stored) => {
    expect(await verifyPassword("anything", stored)).toBe(false);
  });
});

describe("signToken / verifyToken", () => {
  const secret = "unit-test-secret";

  it("round-trips a valid access token", async () => {
    const payload: AccessTokenPayload = {
      id: "operator",
      handle: "operator",
      type: "access",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await signToken(payload, secret);
    const verified = await verifyToken(token, secret);
    expect(verified).toEqual(payload);
  });

  it("rejects an expired token", async () => {
    const payload: AccessTokenPayload = {
      id: "operator",
      handle: "operator",
      type: "access",
      exp: Math.floor(Date.now() / 1000) - 10,
    };
    const token = await signToken(payload, secret);
    expect(await verifyToken(token, secret)).toBeNull();
  });

  it("rejects a token verified with the wrong secret", async () => {
    const payload: AccessTokenPayload = {
      id: "operator",
      handle: "operator",
      type: "access",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await signToken(payload, secret);
    expect(await verifyToken(token, "a-different-secret")).toBeNull();
  });

  it("rejects a token with a tampered signature", async () => {
    const payload: AccessTokenPayload = {
      id: "operator",
      handle: "operator",
      type: "access",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await signToken(payload, secret);
    const [header, body, signature] = token.split(".");
    const tamperedSignature = signature.slice(0, -1) + (signature.at(-1) === "A" ? "B" : "A");
    expect(await verifyToken(`${header}.${body}.${tamperedSignature}`, secret)).toBeNull();
  });

  it("rejects a malformed token (wrong number of segments)", async () => {
    expect(await verifyToken("not.a.valid.jwt", secret)).toBeNull();
    expect(await verifyToken("onlyonepart", secret)).toBeNull();
  });
});

describe("handleAuthRoute — login", () => {
  it("returns a token, refresh token, and operator on success", async () => {
    const passwordHash = await hashPassword("s3cret");
    const env = testEnv({ OPERATOR_PASSWORD_HASH: passwordHash });
    const request = new Request("https://example.com/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "operator", password: "s3cret" }),
    });

    const response = await handleAuthRoute(request, "/api/auth/login", env);
    expect(response?.status).toBe(200);
    const body = (await response!.json()) as { token: string; refreshToken: string; operator: { handle: string } };
    expect(body.token).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.operator.handle).toBe("operator");
  });

  it("returns 401 and records a security event on the wrong password", async () => {
    const passwordHash = await hashPassword("s3cret");
    const env = testEnv({ OPERATOR_PASSWORD_HASH: passwordHash });
    const request = new Request("https://example.com/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "operator", password: "wrong" }),
    });

    const response = await handleAuthRoute(request, "/api/auth/login", env);
    expect(response?.status).toBe(401);

    const listed = await env.SECURITY_EVENTS.list({ prefix: "sec:" });
    expect(listed.keys.length).toBe(1);
  });

  it("returns 503 when auth is not configured", async () => {
    const env = testEnv({ OPERATOR_PASSWORD_HASH: undefined, AUTH_SIGNING_KEY: undefined });
    const request = new Request("https://example.com/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "operator", password: "s3cret" }),
    });

    const response = await handleAuthRoute(request, "/api/auth/login", env);
    expect(response?.status).toBe(503);
  });

  it("returns 405 with an Allow header for a non-POST method", async () => {
    const env = testEnv();
    const request = new Request("https://example.com/api/auth/login", { method: "GET" });
    const response = await handleAuthRoute(request, "/api/auth/login", env);
    expect(response?.status).toBe(405);
    expect(response?.headers.get("Allow")).toBe("POST");
  });
});

describe("handleAuthRoute — me", () => {
  it("returns the operator for a valid access token", async () => {
    const env = testEnv();
    const token = await signToken(
      { id: "operator", handle: "operator", type: "access", exp: Math.floor(Date.now() / 1000) + 3600 },
      env.AUTH_SIGNING_KEY!,
    );
    const request = new Request("https://example.com/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const response = await handleAuthRoute(request, "/api/auth/me", env);
    expect(response?.status).toBe(200);
    const body = (await response!.json()) as { operator: { handle: string } };
    expect(body.operator.handle).toBe("operator");
  });

  it("returns 401 with no bearer token", async () => {
    const env = testEnv();
    const request = new Request("https://example.com/api/auth/me");
    const response = await handleAuthRoute(request, "/api/auth/me", env);
    expect(response?.status).toBe(401);
  });

  it("returns 401 for a refresh token presented at /me", async () => {
    const env = testEnv();
    const refreshPayload: RefreshTokenPayload = {
      id: "operator",
      handle: "operator",
      type: "refresh",
      jti: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await signToken(refreshPayload, env.AUTH_SIGNING_KEY!);
    const request = new Request("https://example.com/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const response = await handleAuthRoute(request, "/api/auth/me", env);
    expect(response?.status).toBe(401);
  });
});

describe("handleAuthRoute — refresh", () => {
  async function loginAndGetTokens(env: AuthEnv & SecurityEnv) {
    const request = new Request("https://example.com/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "operator", password: "s3cret" }),
    });
    const response = await handleAuthRoute(request, "/api/auth/login", env);
    return (await response!.json()) as { token: string; refreshToken: string };
  }

  it("rotates the refresh token and revokes the old one", async () => {
    const passwordHash = await hashPassword("s3cret");
    const env = testEnv({ OPERATOR_PASSWORD_HASH: passwordHash });
    const { refreshToken } = await loginAndGetTokens(env);

    const refreshRequest = new Request("https://example.com/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    const refreshResponse = await handleAuthRoute(refreshRequest, "/api/auth/refresh", env);
    expect(refreshResponse?.status).toBe(200);
    const rotated = (await refreshResponse!.json()) as { token: string; refreshToken: string };
    expect(rotated.refreshToken).not.toBe(refreshToken);

    // Reusing the now-rotated-away refresh token must fail.
    const reuseRequest = new Request("https://example.com/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    const reuseResponse = await handleAuthRoute(reuseRequest, "/api/auth/refresh", env);
    expect(reuseResponse?.status).toBe(401);
  });

  it("rejects an access token presented at /refresh", async () => {
    const env = testEnv();
    const token = await signToken(
      { id: "operator", handle: "operator", type: "access", exp: Math.floor(Date.now() / 1000) + 3600 },
      env.AUTH_SIGNING_KEY!,
    );
    const request = new Request("https://example.com/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const response = await handleAuthRoute(request, "/api/auth/refresh", env);
    expect(response?.status).toBe(401);
  });
});

describe("handleAuthRoute — logout", () => {
  it("revokes the provided refresh token", async () => {
    const env = testEnv();
    const jti = crypto.randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      id: "operator",
      handle: "operator",
      type: "refresh",
      jti,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const refreshToken = await signToken(refreshPayload, env.AUTH_SIGNING_KEY!);

    const request = new Request("https://example.com/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    const response = await handleAuthRoute(request, "/api/auth/logout", env);
    expect(response?.status).toBe(200);
    expect(await env.AUTH_REVOCATION.get(jti)).not.toBeNull();
  });

  it("still succeeds with a malformed body", async () => {
    const env = testEnv();
    const request = new Request("https://example.com/api/auth/logout", { method: "POST", body: "not json" });
    const response = await handleAuthRoute(request, "/api/auth/logout", env);
    expect(response?.status).toBe(200);
  });
});
