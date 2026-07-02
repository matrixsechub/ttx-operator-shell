// Bearer token persisted in localStorage so a session survives reloads.
// This is a single-operator SPA with no server-owned session store — the
// Worker stays stateless and just forwards whatever Authorization header
// the browser sends (see worker/index.ts's proxyToEngine).
const STORAGE_KEY = "msh-operator-token";

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}
