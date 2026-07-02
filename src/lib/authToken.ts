// Bearer token persisted in localStorage so a session survives reloads.
// This is a single-operator SPA with no server-owned session store — the
// Worker stays stateless and just forwards whatever headers the browser
// sends (see worker/index.ts's proxyToEngine).
const STORAGE_KEY = "msh-operator-token";
const REFRESH_STORAGE_KEY = "msh-operator-refresh-token";
const IDENTITY_KEY = "msh-operator-identity";

// localStorage access itself can throw (SecurityError in some private-
// browsing modes, storage disabled by policy, quota exceeded on write) —
// not just return null for a missing key. Every call in this module goes
// through these so a broken storage environment degrades to "logged out",
// never an uncaught throw during AuthContext initialization.
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable/quota exceeded/disabled — session just won't
    // persist across reloads. Nothing else to do about it here.
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Best-effort — if storage itself is inaccessible there's nothing
    // more to clear.
  }
}

export function getToken(): string | null {
  return safeGet(STORAGE_KEY);
}

export function setToken(token: string): void {
  safeSet(STORAGE_KEY, token);
}

export function clearToken(): void {
  safeRemove(STORAGE_KEY);
}

// Longer-lived refresh token (Phase 16) — used only to silently obtain a
// fresh access token when the current one is missing/expired, never sent
// as the Authorization header on ordinary /api/* calls.
export function getRefreshToken(): string | null {
  return safeGet(REFRESH_STORAGE_KEY);
}

export function setRefreshToken(token: string): void {
  safeSet(REFRESH_STORAGE_KEY, token);
}

export function clearRefreshToken(): void {
  safeRemove(REFRESH_STORAGE_KEY);
}

// Role/access_level snapshot, kept alongside the token so apiClient.ts (a
// plain module, not a hook) can attach them to outgoing requests without
// depending on React context. Display/informational fields only — see
// Operator's doc comment in types.ts.
export interface StoredOperatorIdentity {
  role?: string;
  access_level?: string;
}

export function getStoredIdentity(): StoredOperatorIdentity | null {
  const raw = safeGet(IDENTITY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as StoredOperatorIdentity;
  } catch {
    return null;
  }
}

export function setStoredIdentity(identity: StoredOperatorIdentity): void {
  safeSet(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearStoredIdentity(): void {
  safeRemove(IDENTITY_KEY);
}
