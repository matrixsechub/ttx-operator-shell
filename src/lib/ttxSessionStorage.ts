// Current TTX session id, persisted in localStorage so it survives reloads
// and so both TTXPanel and useTelemetry can read the same value without
// prop drilling or new shared state. Same safe-get/set/remove idiom as
// authToken.ts, same reasoning: this is a single-operator SPA, one active
// session tracked client-side is enough — no multi-session browser/list
// UI, matching the single-operator convention used everywhere else in
// this repo.
const STORAGE_KEY = "msh-ttx-session-id";

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
    // Storage unavailable — the session just won't persist across reloads.
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Best-effort.
  }
}

export function getCurrentSessionId(): string | null {
  return safeGet(STORAGE_KEY);
}

export function setCurrentSessionId(sessionId: string): void {
  safeSet(STORAGE_KEY, sessionId);
}

export function clearCurrentSessionId(): void {
  safeRemove(STORAGE_KEY);
}
