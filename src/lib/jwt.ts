// Client-side JWT payload decoding for UX purposes only — deciding when to
// proactively refresh. The signature is never verified here (the SPA has
// no way to; only the Worker holds AUTH_SIGNING_KEY), so this is not a
// trust boundary. The Worker re-verifies every token on every real request
// regardless (worker/auth.ts) — a forged exp here can't grant access to
// anything, it can only make the UI schedule a refresh at the wrong time.
export interface DecodedTokenPayload {
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): DecodedTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    const payload = JSON.parse(json) as unknown;
    if (typeof payload !== "object" || payload === null) return null;
    return payload as DecodedTokenPayload;
  } catch {
    return null;
  }
}

// Milliseconds since epoch, or null if the token is malformed or carries
// no exp claim — callers should treat null as "can't determine, be
// conservative" rather than "valid forever".
export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return null;
  return payload.exp * 1000;
}

export function isTokenExpired(token: string, bufferMs = 0): boolean {
  const expiryMs = getTokenExpiryMs(token);
  if (expiryMs === null) return true;
  return Date.now() + bufferMs >= expiryMs;
}
