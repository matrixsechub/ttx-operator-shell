import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./apiClient";
import {
  getToken,
  setToken,
  clearToken,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  setStoredIdentity,
  clearStoredIdentity,
} from "./authToken";
import { getTokenExpiryMs, isTokenExpired } from "./jwt";
import type { LoginPayload, LoginResponse, Operator } from "./types";

// Refresh this many ms before the access token's own exp, so a well-timed
// proactive refresh lands before anything actually expires.
const REFRESH_BUFFER_MS = 60_000;

interface AuthContextValue {
  operator: Operator | null;
  isAuthenticated: boolean;
  /** True while rehydrating a persisted token on first load — guards RequireAuth from flashing a redirect. */
  initializing: boolean;
  loggingIn: boolean;
  loginError: string | null;
  /** Set when an active session ends on its own (refresh failed/revoked) — distinct from a failed login attempt. */
  sessionEndedReason: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  /** Log in with an existing operator token directly (no username/password). */
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => void;
}

function applyOperator(operator: Operator): void {
  setStoredIdentity({ role: operator.role, access_level: operator.access_level });
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionEndedReason, setSessionEndedReason] = useState<string | null>(null);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against overlapping refresh attempts (e.g. the scheduled timer
  // and a visibility-change check firing close together) — a second
  // concurrent call would present a refresh token the first call may have
  // already rotated out from under it (Phase 16 revokes on use).
  const refreshInFlightRef = useRef(false);

  function clearScheduledRefresh(): void {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  // One-shot by construction: fires once at (exp - buffer), and on success
  // reschedules exactly one new timer for the new token. On failure it
  // schedules nothing further — clearSession() ends the session instead of
  // retrying. This is the whole "bounded retry" strategy: a single attempt
  // per expiry window, not a retry loop.
  function scheduleRefresh(accessToken: string): void {
    clearScheduledRefresh();
    const expiryMs = getTokenExpiryMs(accessToken);
    if (expiryMs === null) return; // Can't determine expiry — nothing to schedule against.

    const delay = Math.max(0, expiryMs - Date.now() - REFRESH_BUFFER_MS);
    refreshTimerRef.current = setTimeout(() => {
      void attemptSilentRefresh("Session refresh failed");
    }, delay);
  }

  // Shared by mount-time rehydration, the scheduled timer, and the
  // visibility-change check below — all three just need "try to extend the
  // session silently, and if that's not possible, log out cleanly."
  async function attemptSilentRefresh(endedReasonPrefix: string): Promise<boolean> {
    if (refreshInFlightRef.current) return false;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      return false;
    }

    refreshInFlightRef.current = true;
    const result = await api.refresh(refreshToken);
    refreshInFlightRef.current = false;

    if (result.ok && result.data.operator) {
      commitSession(result.data, result.data.operator);
      return true;
    }

    // Covers network errors, 401 (expired/invalid), revoked tokens, and
    // type confusion alike — the Worker collapses all of these to a 401
    // with an explanatory message (apiClient now surfaces it, not just the
    // status code), so there's nothing further to distinguish client-side.
    const reason = result.ok ? "refresh response was missing an operator profile" : result.error;
    clearSession(`${endedReasonPrefix} — ${reason}`);
    return false;
  }

  // Stores a fresh access+refresh token pair and the operator profile that
  // came with them, and schedules that access token's own future refresh.
  // Shared by login(), loginWithToken() has its own variant below (no
  // refresh token to store), and the silent-refresh paths above.
  function commitSession(data: LoginResponse, operator: Operator): void {
    setToken(data.token);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setOperator(operator);
    applyOperator(operator);
    setSessionEndedReason(null);
    scheduleRefresh(data.token);
  }

  function clearSession(endedReason?: string): void {
    clearScheduledRefresh();
    clearToken();
    clearRefreshToken();
    clearStoredIdentity();
    setOperator(null);
    if (endedReason) setSessionEndedReason(endedReason);
  }

  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      try {
        const existingToken = getToken();
        if (existingToken && !isTokenExpired(existingToken)) {
          const result = await api.me();
          if (cancelled) return;
          if (result.ok) {
            setOperator(result.data.operator);
            applyOperator(result.data.operator);
            scheduleRefresh(existingToken);
            setInitializing(false);
            return;
          }
          // Passed the client-side expiry check but the server rejected it
          // anyway (revoked, clock skew, tampered) — fall through to refresh.
        }

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearSession();
          setInitializing(false);
          return;
        }

        const refreshResult = await api.refresh(refreshToken);
        if (cancelled) return;
        if (refreshResult.ok && refreshResult.data.operator) {
          commitSession(refreshResult.data, refreshResult.data.operator);
        } else {
          // Refresh token expired, revoked, or otherwise invalid — nothing
          // silent left to try. Drop everything and return to logged-out.
          // No sessionEndedReason here: this is "never had a valid session
          // this visit", not "a session ended", so no message is shown.
          clearSession();
        }
      } catch {
        // Defensive: corrupted storage, an unexpected throw from a helper,
        // anything — initialization must never leave the app stuck on
        // "Checking session…" or crash the tree. Treat as logged out.
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    rehydrate();

    // Background tabs throttle setTimeout, so a scheduled refresh can miss
    // its window while the tab isn't visible. Catch up when it becomes
    // visible again rather than waiting for a live API call to fail first.
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const current = getToken();
      if (current && isTokenExpired(current, REFRESH_BUFFER_MS)) {
        void attemptSilentRefresh("Session refresh failed");
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearScheduledRefresh();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(payload: LoginPayload): Promise<boolean> {
    setLoggingIn(true);
    setLoginError(null);
    const result = await api.login(payload);
    setLoggingIn(false);

    if (!result.ok) {
      setLoginError(result.error);
      return false;
    }

    const operator = result.data.operator ?? { id: payload.username, handle: payload.username };
    commitSession(result.data, operator);
    return true;
  }

  async function loginWithToken(token: string): Promise<boolean> {
    setLoggingIn(true);
    setLoginError(null);
    setToken(token);

    const result = await api.me();
    setLoggingIn(false);

    if (!result.ok) {
      clearToken();
      setLoginError(result.error);
      return false;
    }

    setOperator(result.data.operator);
    applyOperator(result.data.operator);
    setSessionEndedReason(null);
    // No refresh token in this flow (only an access token was provided) —
    // still schedule against it so an eventual expiry ends the session
    // cleanly instead of just letting API calls start silently failing.
    scheduleRefresh(token);
    return true;
  }

  function logout() {
    // Best-effort server-side revocation of the refresh token — local
    // logout succeeds either way, since tokens are cleared regardless.
    void api.logout(getRefreshToken() ?? undefined);
    clearSession();
    // A deliberate, successful logout shouldn't leave a stale
    // "session ended" message around from an earlier expiry.
    setSessionEndedReason(null);
  }

  return (
    <AuthContext.Provider
      value={{
        operator,
        isAuthenticated: operator !== null,
        initializing,
        loggingIn,
        loginError,
        sessionEndedReason,
        login,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
