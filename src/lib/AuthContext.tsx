import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
import type { LoginPayload, LoginResponse, Operator } from "./types";

interface AuthContextValue {
  operator: Operator | null;
  isAuthenticated: boolean;
  /** True while rehydrating a persisted token on first load — guards RequireAuth from flashing a redirect. */
  initializing: boolean;
  loggingIn: boolean;
  loginError: string | null;
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

  // Stores a fresh access+refresh token pair and the operator profile that
  // came with them — shared by login() and the silent-refresh rehydration
  // path below, since both consume the same LoginResponse shape.
  function commitSession(data: LoginResponse, operator: Operator): void {
    setToken(data.token);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setOperator(operator);
    applyOperator(operator);
  }

  function clearSession(): void {
    clearToken();
    clearRefreshToken();
    clearStoredIdentity();
    setOperator(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      if (getToken()) {
        const result = await api.me();
        if (cancelled) return;
        if (result.ok) {
          setOperator(result.data.operator);
          applyOperator(result.data.operator);
          setInitializing(false);
          return;
        }
        // Access token missing/expired/invalid — fall through to a silent
        // refresh attempt before giving up on the session entirely.
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
        clearSession();
      }
      setInitializing(false);
    }

    rehydrate();
    return () => {
      cancelled = true;
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
    return true;
  }

  function logout() {
    // Best-effort server-side revocation of the refresh token — local
    // logout succeeds either way, since tokens are cleared regardless.
    void api.logout(getRefreshToken() ?? undefined);
    clearSession();
  }

  return (
    <AuthContext.Provider
      value={{
        operator,
        isAuthenticated: operator !== null,
        initializing,
        loggingIn,
        loginError,
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
