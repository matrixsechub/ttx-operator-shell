const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function b64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function signToken(secret: string, payload: Record<string, unknown>): Promise<string> {
  const headerBytes = encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const bodyBytes = encoder.encode(JSON.stringify(payload));
  const header = b64url(headerBytes);
  const body = b64url(bodyBytes);
  const key = await hmacKey(secret, "sign");
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<{ ok: true; payload: Record<string, unknown> } | { ok: false; error: string }> {
  const parts = (token || "").split(".");
  if (parts.length !== 3) return { ok: false, error: "malformed token" };

  const [header, body, sig] = parts;
  try {
    const key = await hmacKey(secret, "verify");
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig),
      encoder.encode(`${header}.${body}`),
    );
    if (!valid) return { ok: false, error: "invalid signature" };

    const payload = JSON.parse(decoder.decode(b64urlDecode(body))) as Record<string, unknown>;
    const exp = payload.exp;
    if (typeof exp !== "number" || exp <= Math.floor(Date.now() / 1000)) {
      return { ok: false, error: "token expired" };
    }
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function makeCtxHash(ip: string, ua: string): Promise<string> {
  const data = encoder.encode(`${ip || ""}|${ua || ""}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/**
 * Verify a password against a stored hash in the canonical
 * `pbkdf2$<iterations>$<saltB64Url>$<hashB64Url>` format produced by
 * scripts/hash-password.mjs and consumed by worker/auth.ts. Uses the same
 * Web Crypto PBKDF2/SHA-256 derivation (256 bits) and a constant-time compare
 * so the same OPERATOR_PASSWORD_HASH secret verifies identically here.
 */
export async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  const parts = (stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  try {
    const salt = b64urlDecode(parts[2]);
    const expected = b64urlDecode(parts[3]);
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      key,
      256,
    );
    const actual = new Uint8Array(bits);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
    return diff === 0;
  } catch {
    return false;
  }
}

export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const key = (await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )) as CryptoKey;
  const [sa, sb] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const ua = new Uint8Array(sa);
  const ub = new Uint8Array(sb);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i]! ^ ub[i]!;
  return diff === 0;
}
