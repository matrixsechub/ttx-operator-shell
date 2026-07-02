// Bearer token persisted in localStorage so a session survives reloads.
// This is a single-operator SPA with no server-owned session store — the
// Worker stays stateless and just forwards whatever headers the browser
// sends (see worker/index.ts's proxyToEngine).
const STORAGE_KEY = "msh-operator-token";
const REFRESH_STORAGE_KEY = "msh-operator-refresh-token";
const IDENTITY_KEY = "msh-operator-identity";

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Longer-lived refresh token (Phase 16) — used only to silently obtain a
// fresh access token when the current one is missing/expired, never sent
// as the Authorization header on ordinary /api/* calls.
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_STORAGE_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_STORAGE_KEY, token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_STORAGE_KEY);
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
  const raw = localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOperatorIdentity;
  } catch {
    return null;
  }
}

export function setStoredIdentity(identity: StoredOperatorIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearStoredIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY);
}
